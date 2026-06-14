/**
 * degree.controller.js
 * Business logic for degree issuance, revocation, and listing.
 *
 * Every mutating action:
 *   1. Re-checks the on-chain role (JWT is a UX layer, not the ground truth).
 *   2. Calls contractService (which returns timing data).
 *   3. Writes a file-based audit entry to backend/logs/audit.log.
 */
const Degree          = require("../models/Degree");
const { encrypt }     = require("../services/encryptionService");
const contractService = require("../services/contractService");
const { writeEntry }  = require("../services/auditLogger");

// ── POST /api/degrees/issue ───────────────────────────────────────────────────
const issueDegree = async (req, res, next) => {
  try {
    const {
      studentName,
      studentId,      // non-sensitive university reg number — goes on-chain
      program,
      graduationDate,
      nationalId,     // PII — encrypted before MongoDB storage, never on-chain
      dob,
      gpa,
      privateKey,
    } = req.body;

    // On-chain role re-check — defence-in-depth beyond JWT
    const onChain = await contractService.hasUniversityRole(req.user.walletAddress);
    if (!onChain) {
      writeEntry({
        actor:  req.user.walletAddress,
        action: "DEGREE_ISSUED",
        result: "FAILURE",
        details: { reason: "wallet missing UNIVERSITY_ROLE on-chain" },
      });
      return res.status(403).json({ error: "Wallet does not hold UNIVERSITY_ROLE on-chain" });
    }

    // Issue on-chain — contract computes hash from (studentId, program, graduationDate, msg.sender)
    const { receipt, degreeHash, txTimeMs } = await contractService.issueDegree(
      { studentName, studentId, program, graduationDate: Number(graduationDate) },
      privateKey
    );

    // Store off-chain metadata (PII encrypted)
    const degree = await Degree.create({
      degreeHash,
      studentName,
      studentId,
      program,
      graduationDate:   Number(graduationDate),
      nationalIdEnc:    encrypt(nationalId),
      dobEnc:           dob ? encrypt(dob)         : undefined,
      gpaEnc:           gpa ? encrypt(String(gpa)) : undefined,
      universityWallet: req.user.walletAddress,
      issuedBy:         req.user.userId,
      txHash:           receipt.hash,
    });

    // File audit log
    writeEntry({
      actor:      req.user.walletAddress,
      action:     "DEGREE_ISSUED",
      result:     "SUCCESS",
      degreeHash,
      txHash:     receipt.hash,
      txTimeMs,
      details:    { studentName, studentId, program, graduationDate: Number(graduationDate) },
    });

    const safe = degree.toObject();
    delete safe.nationalIdEnc;
    delete safe.dobEnc;
    delete safe.gpaEnc;

    res.status(201).json({ degree: safe, txHash: receipt.hash, txTimeMs });
  } catch (err) {
    writeEntry({
      actor:  req.user?.walletAddress || "unknown",
      action: "DEGREE_ISSUED",
      result: "FAILURE",
      details: { error: err.message },
    });
    next(err);
  }
};

// ── POST /api/degrees/:hash/revoke ────────────────────────────────────────────
const revokeDegree = async (req, res, next) => {
  try {
    const { reason, privateKey } = req.body;
    if (!reason || !privateKey) {
      return res.status(400).json({ error: "reason and privateKey are required" });
    }

    // Contract: revokeDegree(bytes32) — no reason param; reason stored in MongoDB only
    const { receipt, txTimeMs } = await contractService.revokeDegree(req.params.hash, privateKey);

    await Degree.findOneAndUpdate(
      { degreeHash: req.params.hash },
      { isRevoked: true, revocationReason: reason }
    );

    writeEntry({
      actor:     req.user.walletAddress,
      action:    "DEGREE_REVOKED",
      result:    "SUCCESS",
      degreeHash: req.params.hash,
      txHash:    receipt.hash,
      txTimeMs,
      details:   { reason },
    });

    res.json({ message: "Degree revoked", txHash: receipt.hash, txTimeMs });
  } catch (err) {
    writeEntry({
      actor:  req.user?.walletAddress || "unknown",
      action: "DEGREE_REVOKED",
      result: "FAILURE",
      details: { hash: req.params.hash, error: err.message },
    });
    next(err);
  }
};

// ── GET /api/degrees ──────────────────────────────────────────────────────────
const listDegrees = async (req, res, next) => {
  try {
    const filter =
      req.user.role === "admin"
        ? {}
        : { universityWallet: req.user.walletAddress };

    const degrees = await Degree.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .select("-nationalIdEnc -dobEnc -gpaEnc");

    res.json({ degrees, total: degrees.length });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/degrees/:hash ────────────────────────────────────────────────────
const getDegree = async (req, res, next) => {
  try {
    const degree = await Degree.findOne({ degreeHash: req.params.hash }).select(
      "-nationalIdEnc -dobEnc -gpaEnc"
    );
    if (!degree) return res.status(404).json({ error: "Degree not found in database" });

    // On-chain is the canonical source of truth for current revocation state
    let onChain = null;
    try {
      onChain = await contractService.getDegreeDetails(req.params.hash);
    } catch {
      // DegreeNotFound from contract — unexpected but non-fatal for this read endpoint
    }

    res.json({ degree, onChain });
  } catch (err) {
    next(err);
  }
};

module.exports = { issueDegree, revokeDegree, listDegrees, getDegree };
