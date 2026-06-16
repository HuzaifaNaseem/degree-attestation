/**
 * request.controller.js — attestation request workflow.
 *
 *   POST /api/requests                 (public)  submit an application
 *   GET  /api/requests                 (uni/admin) list applications
 *   POST /api/requests/:id/approve      (uni/admin) approve → issue on-chain
 *   POST /api/requests/:id/reject       (uni/admin) reject with a note
 *
 * Approving reuses contractService.issueDegree, so an approved request becomes a
 * real on-chain credential — the request log and the degree ledger stay in sync.
 */
const Request         = require("../models/Request");
const Degree          = require("../models/Degree");
const { encrypt, decrypt } = require("../services/encryptionService");
const contractService = require("../services/contractService");
const { analyzeRequest: runAIReview } = require("../services/aiReviewService");
const { writeEntry }  = require("../services/auditLogger");

// Authoritative attestation-fee table (PKR). The client picks a program from a
// fixed dropdown; the server still derives the fee here so it can never be faked.
const PROGRAM_FEES = {
  "BS Computer Science": 3000,
  "BS Software Engineering": 3000,
  "BS Artificial Intelligence": 3000,
  "BS Information Technology": 3000,
  "BS Electrical Engineering": 3000,
  "BS Accounting & Finance": 3000,
  "BBA (Bachelor of Business Administration)": 3000,
  "MS Computer Science": 6000,
  "MS Data Science": 6000,
  "MBA (Master of Business Administration)": 6000,
  "MPhil Computer Science": 6000,
  "PhD Computer Science": 6000,
};

function feeFor(program = "") {
  if (PROGRAM_FEES[program] != null) return PROGRAM_FEES[program];
  // Fallback for any free-text/legacy value (word-boundary so "systems" ≠ "ms")
  const p = program.toLowerCase();
  return /\b(mba|ms|msc|m\.?s|master|m\.?phil|mphil|phd|doctor)\b/.test(p) ? 6000 : 3000;
}

const DOC_TYPES = ["cnic", "payment", "matric", "intermediate", "other"];
const REQUIRED_DOCS = ["cnic", "payment", "matric", "intermediate"];

/** Normalise + encrypt the documents submitted with an application. */
function buildDocuments(docs = []) {
  if (!Array.isArray(docs)) return [];
  return docs
    .filter((d) => d && d.dataUrl && DOC_TYPES.includes(d.type))
    .slice(0, 6) // hard cap — keeps the Mongo doc well under the 16MB limit
    .map((d) => ({
      type:     d.type,
      label:    String(d.label || d.type).slice(0, 80),
      mime:     d.mime || "image/jpeg",
      imageEnc: encrypt(String(d.dataUrl)),       // AES-256 — image never stored in clear
      ocrText:  String(d.ocrText || "").slice(0, 8000),
    }));
}

// POST /api/requests  (public)
const submitRequest = async (req, res, next) => {
  try {
    const { applicantName, studentId, program, graduationDate, email, nationalId, documents } = req.body;
    if (!applicantName || !studentId || !program || !graduationDate || !email || !nationalId) {
      return res.status(400).json({ error: "All fields are required" });
    }
    // CNIC must be exactly 13 digits (Pakistani national ID) — reject fake/short values.
    const cnicDigits = String(nationalId).replace(/\D/g, "");
    if (cnicDigits.length !== 13) {
      return res.status(400).json({ error: "CNIC must be exactly 13 digits." });
    }

    // All supporting documents are mandatory — no application without them.
    const docs = buildDocuments(documents);
    const have = new Set(docs.map((d) => d.type));
    const missing = REQUIRED_DOCS.filter((t) => !have.has(t));
    if (missing.length) {
      return res.status(400).json({ error: `Please upload all required documents (missing: ${missing.join(", ")}).` });
    }

    const reqDoc = await Request.create({
      applicantName, studentId, program,
      graduationDate: Number(graduationDate),
      email,
      nationalIdEnc: encrypt(String(nationalId)),
      fee: feeFor(program),
      documents: docs,
    });
    const safe = reqDoc.toObject();
    delete safe.nationalIdEnc;
    delete safe.documents; // don't echo the (heavy, encrypted) images back
    res.status(201).json({ request: safe });
  } catch (err) { next(err); }
};

// GET /api/requests  (uni/admin) — light list (no encrypted images)
const listRequests = async (_req, res, next) => {
  try {
    const requests = await Request.find().sort({ createdAt: -1 }).limit(200)
      .select("-nationalIdEnc -documents.imageEnc -documents.ocrText");
    const counts = {
      all:      requests.length,
      pending:  requests.filter((r) => r.status === "PENDING").length,
      approved: requests.filter((r) => r.status === "APPROVED").length,
      rejected: requests.filter((r) => r.status === "REJECTED").length,
    };
    res.json({ requests, counts });
  } catch (err) { next(err); }
};

// GET /api/requests/:id  (uni/admin) — full detail: decrypted document previews + OCR text
const getRequest = async (req, res, next) => {
  try {
    const reqDoc = await Request.findById(req.params.id).select("-nationalIdEnc");
    if (!reqDoc) return res.status(404).json({ error: "Request not found" });

    const obj = reqDoc.toObject();
    // Decrypt each document image for the authenticated reviewer only.
    obj.documents = (reqDoc.documents || []).map((d) => {
      let dataUrl = null;
      try { dataUrl = decrypt(d.imageEnc); } catch { /* corrupt/missing — show text only */ }
      return { type: d.type, label: d.label, mime: d.mime, ocrText: d.ocrText, dataUrl };
    });
    res.json({ request: obj });
  } catch (err) { next(err); }
};

// POST /api/requests/:id/analyze  (uni/admin) — run the AI verification agent
const analyzeRequest = async (req, res, next) => {
  try {
    const reqDoc = await Request.findById(req.params.id);
    if (!reqDoc) return res.status(404).json({ error: "Request not found" });

    // Always returns a verdict — uses Claude if a key is set, else the offline analyzer.
    const aiReview = await runAIReview(reqDoc);

    reqDoc.aiReview = aiReview;
    await reqDoc.save();

    writeEntry({
      actor: req.user.walletAddress, action: "AI_REVIEW", result: "SUCCESS",
      details: { requestId: String(reqDoc._id), recommendation: aiReview.recommendation, confidence: aiReview.confidence, model: aiReview.model },
    });

    res.json({ aiReview });
  } catch (err) { next(err); }
};

// POST /api/requests/:id/approve  { privateKey }  (uni/admin)
const approveRequest = async (req, res, next) => {
  try {
    const { privateKey } = req.body;
    if (!privateKey) return res.status(400).json({ error: "privateKey is required to issue on-chain" });

    const reqDoc = await Request.findById(req.params.id);
    if (!reqDoc) return res.status(404).json({ error: "Request not found" });
    if (reqDoc.status === "APPROVED") return res.status(400).json({ error: "Request already approved" });

    // On-chain role re-check (defence-in-depth)
    const onChain = await contractService.hasUniversityRole(req.user.walletAddress);
    if (!onChain) return res.status(403).json({ error: "Wallet does not hold UNIVERSITY_ROLE on-chain" });

    // Issue on-chain (same path as direct issuance)
    const { receipt, degreeHash, txTimeMs } = await contractService.issueDegree(
      { studentName: reqDoc.applicantName, studentId: reqDoc.studentId, program: reqDoc.program, graduationDate: reqDoc.graduationDate },
      privateKey
    );

    // Mirror into the degree ledger
    await Degree.create({
      degreeHash,
      studentName:      reqDoc.applicantName,
      studentId:        reqDoc.studentId,
      program:          reqDoc.program,
      graduationDate:   reqDoc.graduationDate,
      nationalIdEnc:    reqDoc.nationalIdEnc,
      universityWallet: req.user.walletAddress,
      issuedBy:         req.user.userId,
      txHash:           receipt.hash,
    });

    reqDoc.status     = "APPROVED";
    reqDoc.degreeHash = degreeHash;
    reqDoc.txHash     = receipt.hash;
    reqDoc.reviewedBy = req.user.userId;
    reqDoc.reviewedAt = new Date();
    await reqDoc.save();

    writeEntry({
      actor: req.user.walletAddress, action: "DEGREE_ISSUED", result: "SUCCESS",
      degreeHash, txHash: receipt.hash, txTimeMs,
      details: { via: "request-approval", studentId: reqDoc.studentId },
    });

    res.json({ request: { ...reqDoc.toObject(), nationalIdEnc: undefined }, degreeHash, txHash: receipt.hash, txTimeMs });
  } catch (err) {
    writeEntry({ actor: req.user?.walletAddress || "unknown", action: "DEGREE_ISSUED", result: "FAILURE", details: { error: err.message } });
    next(err);
  }
};

// POST /api/requests/:id/reject  { reason }  (uni/admin)
const rejectRequest = async (req, res, next) => {
  try {
    const reqDoc = await Request.findById(req.params.id);
    if (!reqDoc) return res.status(404).json({ error: "Request not found" });
    reqDoc.status     = "REJECTED";
    reqDoc.reviewNote = req.body.reason || "Rejected by reviewer";
    reqDoc.reviewedBy = req.user.userId;
    reqDoc.reviewedAt = new Date();
    await reqDoc.save();
    res.json({ request: { ...reqDoc.toObject(), nationalIdEnc: undefined } });
  } catch (err) { next(err); }
};

module.exports = { submitRequest, listRequests, getRequest, analyzeRequest, approveRequest, rejectRequest };
