/**
 * verify.controller.js
 * POST /api/degrees/verify — official on-chain verification of a degree by hash.
 * Performed by university/admin (the verifying party). verifyDegree is
 * permissionless on-chain, so any funded wallet may record the verification.
 *
 * Response always succeeds (HTTP 200) — fraud attempts return status "INVALID".
 * Status enum:
 *   VALID   — hash exists on-chain and is not revoked
 *   REVOKED — hash exists on-chain but was revoked
 *   INVALID — hash not found on-chain (fraud attempt)
 *
 * Every call — including fraud — emits DegreeVerified on-chain and writes
 * to backend/logs/audit.log.
 */
const Degree          = require("../models/Degree");
const contractService = require("../services/contractService");
const { writeEntry }  = require("../services/auditLogger");

// POST /api/degrees/verify
const verifyDegree = async (req, res, next) => {
  try {
    const { degreeHash, privateKey } = req.body;

    // Verify on-chain — always emits DegreeVerified, even for unknown hashes
    const { receipt, exists, valid, revoked, txTimeMs } =
      await contractService.verifyDegree(degreeHash, privateKey);

    // Derive status enum
    let status;
    if (!exists)       status = "INVALID";   // hash never registered — fraud attempt
    else if (revoked)  status = "REVOKED";   // degree exists but was revoked
    else               status = "VALID";

    // Fetch on-chain details for enrichment (only if degree exists)
    let details = null;
    if (exists) {
      details = await contractService.getDegreeDetails(degreeHash);
    }

    // Enrich with off-chain metadata (PII fields already stripped by select)
    const offChainDegree = exists
      ? await Degree.findOne({ degreeHash }).select("-nationalIdEnc -dobEnc -gpaEnc")
      : null;

    const isFraud = !exists;

    // File audit log
    writeEntry({
      actor:     req.user.walletAddress,
      action:    isFraud ? "FRAUD_DETECTED" : "DEGREE_VERIFIED",
      result:    isFraud ? "FRAUD"          : "SUCCESS",
      degreeHash,
      txHash:    receipt.hash,
      txTimeMs,
      details:   { status, exists, revoked },
    });

    res.json({
      status,
      degreeHash,
      issuingUniversity: details?.issuingUniversity  ?? null,
      program:           details?.program             ?? null,
      issuedAt:          details?.issueTimestamp      ?? null,
      txHash:            receipt.hash,
      metadata:          offChainDegree,
      fraudDetected:     isFraud,
      txTimeMs,
    });
  } catch (err) {
    writeEntry({
      actor:  req.user?.walletAddress || "unknown",
      action: "DEGREE_VERIFIED",
      result: "FAILURE",
      details: { error: err.message },
    });
    next(err);
  }
};

module.exports = { verifyDegree };
