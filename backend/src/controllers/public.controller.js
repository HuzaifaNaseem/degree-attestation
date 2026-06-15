/**
 * public.controller.js — unauthenticated, read-only endpoints.
 *
 * These power the public landing page and the no-login degree verification
 * page. Both are pure on-chain reads (staticCall / provider queries): no signer,
 * no gas, no state change, therefore no on-chain event is emitted. Public
 * verification attempts are still recorded in the off-chain audit.log so the
 * fraud-detection trail stays complete.
 *
 *   GET  /api/public/chain-status  — live network + block + contract info
 *   POST /api/public/verify        — instant read-only credential check
 */
const Degree          = require("../models/Degree");
const AuditLog        = require("../models/AuditLog");
const contractService = require("../services/contractService");
const { writeEntry }  = require("../services/auditLogger");

// GET /api/public/chain-status
const chainStatus = async (_req, res, next) => {
  try {
    const status = await contractService.getChainStatus();
    res.json({ online: true, ...status, timestamp: new Date().toISOString() });
  } catch (err) {
    // Surface a clean "offline" payload rather than a 500 so the widget can
    // show a red dot instead of crashing the page.
    res.json({ online: false, error: err.message, timestamp: new Date().toISOString() });
  }
};

// POST /api/public/verify  { degreeHash }
const publicVerify = async (req, res, next) => {
  try {
    const { degreeHash } = req.body;

    if (!degreeHash || !/^0x[0-9a-fA-F]{64}$/.test(degreeHash)) {
      return res.status(400).json({ error: "degreeHash must be a 0x-prefixed 64-char hex string" });
    }

    // Pure read — no wallet, no gas, no tx.
    const { exists, revoked, readTimeMs } =
      await contractService.verifyDegreeReadOnly(degreeHash);

    let status;
    if (!exists)      status = "INVALID";
    else if (revoked) status = "REVOKED";
    else              status = "VALID";

    // Enrich with on-chain details (only when the credential exists)
    let details = null;
    if (exists) details = await contractService.getDegreeDetails(degreeHash);

    // Non-sensitive off-chain metadata (PII fields excluded)
    const offChain = exists
      ? await Degree.findOne({ degreeHash }).select("-nationalIdEnc -dobEnc -gpaEnc")
      : null;

    const isFraud = !exists;

    // Off-chain audit trail (no on-chain event for read-only public checks)
    writeEntry({
      actor:   "public",
      action:  isFraud ? "FRAUD_DETECTED" : "PUBLIC_VERIFY",
      result:  isFraud ? "FRAUD"          : "SUCCESS",
      degreeHash,
      details: { status, readOnly: true, readTimeMs },
    });

    res.json({
      status,
      degreeHash,
      readOnly:          true,
      issuingUniversity: details?.issuingUniversity ?? null,
      program:           details?.program           ?? null,
      studentName:       details?.studentName       ?? offChain?.studentName ?? null,
      issuedAt:          details?.issueTimestamp    ?? null,
      graduationDate:    details?.graduationDate    ?? null,
      fraudDetected:     isFraud,
      readTimeMs,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/public/stats — aggregate counts + recent on-chain activity feed.
// Read-only and PII-free (only event type, short actor, tx/degree hash, time).
const publicStats = async (_req, res, next) => {
  try {
    let totalOnChain = 0;
    try { totalOnChain = await contractService.getTotalIssued(); } catch { /* chain offline → 0 */ }

    const [totalIssued, totalVerifications, totalRevoked, totalFraud, recent] = await Promise.all([
      Degree.countDocuments(),
      AuditLog.countDocuments({ eventType: "DEGREE_VERIFIED" }),
      Degree.countDocuments({ isRevoked: true }),
      AuditLog.countDocuments({ eventType: "FRAUD_ATTEMPT" }),
      AuditLog.find({})
        .sort({ timestamp: -1 })
        .limit(15)
        .select("eventType actor txHash degreeHash blockNumber timestamp isFraud -_id"),
    ]);

    res.json({
      totalOnChain,
      totalIssued,
      totalVerifications,
      totalRevoked,
      totalFraud,
      recent,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { chainStatus, publicVerify, publicStats };
