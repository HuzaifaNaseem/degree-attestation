/**
 * Degree.js — Off-chain degree metadata.
 *
 * Privacy model:
 *   degreeHash, studentName, studentId, program, graduationDate — non-sensitive,
 *   mirrored from / consistent with on-chain storage.
 *
 *   Fields marked [encrypted] hold AES-256-GCM ciphertext (encryptionService.js).
 *   Raw PII (nationalId, dob, gpa) NEVER reaches the blockchain.
 */
const mongoose = require("mongoose");

const DegreeSchema = new mongoose.Schema(
  {
    // ── On-chain mirrors (non-sensitive) ───────────────────────────────────────
    degreeHash:       { type: String, required: true, unique: true, index: true },
    studentName:      { type: String, required: true },
    studentId:        { type: String, required: true },        // university reg number (on-chain)
    program:          { type: String, required: true },
    graduationDate:   { type: Number, required: true },        // unix timestamp

    // ── [encrypted] PII — AES-256-GCM ciphertext ──────────────────────────────
    nationalIdEnc:    { type: String, required: true },
    dobEnc:           { type: String },
    gpaEnc:           { type: String },

    // ── Blockchain metadata ───────────────────────────────────────────────────
    universityWallet: { type: String, required: true },
    issuedBy:         { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    txHash:           { type: String },

    // ── Revocation ────────────────────────────────────────────────────────────
    isRevoked:        { type: Boolean, default: false },
    revocationReason: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Degree", DegreeSchema);
