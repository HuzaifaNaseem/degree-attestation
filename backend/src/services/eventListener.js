/**
 * eventListener.js — Subscribes to on-chain DegreeContract events.
 *
 * Mirrors every on-chain event into MongoDB AuditLog so the admin dashboard
 * has a complete, tamper-evident audit trail independent of the blockchain.
 *
 * Event signatures (DegreeContract.sol):
 *   DegreeIssued(bytes32 indexed, address indexed, string, string, string, uint256, uint256)
 *   DegreeVerified(bytes32 indexed, address indexed, bool, bool, bool, uint256)
 *   DegreeRevoked(bytes32 indexed, address indexed, uint256)
 *
 * NOTE: DegreeContract.sol does NOT emit RoleGrantedByAdmin.
 * Role grants use OZ's built-in RoleGranted event (not captured here to keep
 * audit log focused on degree lifecycle events).
 *
 * ethers v6: contract.on(event, (...params, eventPayload) => {})
 *   — indexed and non-indexed params appear in declaration order
 *   — last argument is always the ContractEventPayload
 */
const { getContract } = require("../config/blockchain");
const AuditLog        = require("../models/AuditLog");

async function startEventListener() {
  const contract = getContract();

  // ── DegreeIssued ─────────────────────────────────────────────────────────────
  // event DegreeIssued(
  //   bytes32 indexed degreeHash,
  //   address indexed issuingUniversity,
  //   string  studentName,
  //   string  studentId,
  //   string  program,
  //   uint256 graduationDate,
  //   uint256 timestamp
  // )
  contract.on(
    "DegreeIssued",
    async (degreeHash, issuingUniversity, studentName, studentId, program, graduationDate, timestamp, event) => {
      try {
        await AuditLog.create({
          eventType:   "DEGREE_ISSUED",
          degreeHash:  degreeHash,
          actor:       issuingUniversity,
          actorRole:   "university",
          details:     {
            studentName,
            studentId,
            program,
            graduationDate: Number(graduationDate),
          },
          txHash:      event.log.transactionHash,
          blockNumber: event.log.blockNumber,
          isFraud:     false,
        });
      } catch (err) {
        console.error("[EventListener] DegreeIssued write error:", err.message);
      }
    }
  );

  // ── DegreeVerified ───────────────────────────────────────────────────────────
  // event DegreeVerified(
  //   bytes32 indexed degreeHash,
  //   address indexed verifier,
  //   bool    exists,
  //   bool    valid,
  //   bool    revoked,
  //   uint256 timestamp
  // )
  // Fraud detection: exists=false means the hash was never issued — fraud attempt.
  contract.on(
    "DegreeVerified",
    async (degreeHash, verifier, exists, valid, revoked, timestamp, event) => {
      const isFraud = !exists; // hash not on-chain = fraudulent credential claim
      try {
        await AuditLog.create({
          eventType:   isFraud ? "FRAUD_ATTEMPT" : "DEGREE_VERIFIED",
          degreeHash:  degreeHash,
          actor:       verifier,
          actorRole:   "employer",
          details:     { exists, valid, revoked },
          txHash:      event.log.transactionHash,
          blockNumber: event.log.blockNumber,
          isFraud,
        });
      } catch (err) {
        console.error("[EventListener] DegreeVerified write error:", err.message);
      }
    }
  );

  // ── DegreeRevoked ─────────────────────────────────────────────────────────────
  // event DegreeRevoked(
  //   bytes32 indexed degreeHash,
  //   address indexed revokedBy,
  //   uint256 timestamp
  // )
  contract.on(
    "DegreeRevoked",
    async (degreeHash, revokedBy, timestamp, event) => {
      try {
        await AuditLog.create({
          eventType:   "DEGREE_REVOKED",
          degreeHash:  degreeHash,
          actor:       revokedBy,
          actorRole:   "university",
          details:     {},
          txHash:      event.log.transactionHash,
          blockNumber: event.log.blockNumber,
          isFraud:     false,
        });
      } catch (err) {
        console.error("[EventListener] DegreeRevoked write error:", err.message);
      }
    }
  );

  console.log("[EventListener] Subscribed to DegreeIssued, DegreeVerified, DegreeRevoked");
}

module.exports = { startEventListener };
