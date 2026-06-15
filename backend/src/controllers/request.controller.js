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
const { encrypt }     = require("../services/encryptionService");
const contractService = require("../services/contractService");
const { writeEntry }  = require("../services/auditLogger");

function feeFor(program = "") {
  const p = program.toLowerCase();
  return /mba|ms |master|m\.?s|m\.?phil|phd|doctor/.test(p) ? 6000 : 3000;
}

// POST /api/requests  (public)
const submitRequest = async (req, res, next) => {
  try {
    const { applicantName, studentId, program, graduationDate, email, nationalId } = req.body;
    if (!applicantName || !studentId || !program || !graduationDate || !email || !nationalId) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const reqDoc = await Request.create({
      applicantName, studentId, program,
      graduationDate: Number(graduationDate),
      email,
      nationalIdEnc: encrypt(String(nationalId)),
      fee: feeFor(program),
    });
    const safe = reqDoc.toObject();
    delete safe.nationalIdEnc;
    res.status(201).json({ request: safe });
  } catch (err) { next(err); }
};

// GET /api/requests  (uni/admin)
const listRequests = async (_req, res, next) => {
  try {
    const requests = await Request.find().sort({ createdAt: -1 }).limit(200).select("-nationalIdEnc");
    const counts = {
      all:      requests.length,
      pending:  requests.filter((r) => r.status === "PENDING").length,
      approved: requests.filter((r) => r.status === "APPROVED").length,
      rejected: requests.filter((r) => r.status === "REJECTED").length,
    };
    res.json({ requests, counts });
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

module.exports = { submitRequest, listRequests, approveRequest, rejectRequest };
