/**
 * auditLogger.js — File-based audit log writer.
 *
 * Writes NDJSON (newline-delimited JSON) to backend/logs/audit.log.
 * One entry per line — append-only, never truncated.
 *
 * Schema per line:
 *   { timestamp, actor, action, result, degreeHash?, txHash?, txTimeMs?, details? }
 *
 * This runs synchronously (appendFileSync) to guarantee the entry is written
 * before the HTTP response is sent.  The audit.log is separate from Morgan's
 * access.log — it captures business events, not HTTP traffic.
 */
const fs   = require("fs");
const path = require("path");

const LOG_PATH = path.join(__dirname, "../../logs/audit.log");

function ensureLogDir() {
  const dir = path.dirname(LOG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * Append one audit entry to audit.log.
 *
 * @param {object} entry
 * @param {string} entry.actor        Wallet address or user email
 * @param {string} entry.action       e.g. "DEGREE_ISSUED", "DEGREE_VERIFIED", "FRAUD_DETECTED"
 * @param {string} entry.result       "SUCCESS" | "FAILURE" | "FRAUD"
 * @param {string} [entry.degreeHash] bytes32 hash involved
 * @param {string} [entry.txHash]     on-chain transaction hash
 * @param {number} [entry.txTimeMs]   wall-clock ms from tx send to confirmation
 * @param {object} [entry.details]    arbitrary extra fields
 */
function writeEntry({ actor, action, result, degreeHash, txHash, txTimeMs, details }) {
  ensureLogDir();
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    actor:     actor  || "unknown",
    action,
    result,
    ...(degreeHash  && { degreeHash }),
    ...(txHash      && { txHash }),
    ...(txTimeMs    !== undefined && { txTimeMs }),
    ...(details     && { details }),
  });
  fs.appendFileSync(LOG_PATH, line + "\n");
}

module.exports = { writeEntry };
