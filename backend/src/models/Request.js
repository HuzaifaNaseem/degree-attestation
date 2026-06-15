/**
 * Request.js — an attestation request submitted by an applicant.
 *
 * Lifecycle:  PENDING  →  APPROVED (degree issued on-chain)
 *                      →  REJECTED (with a review note)
 *
 * This powers the review/approval workflow: applicants apply publicly, an
 * institution reviewer approves (which issues the credential on-chain) or rejects.
 */
const mongoose = require("mongoose");

const RequestSchema = new mongoose.Schema(
  {
    applicantName:  { type: String, required: true },
    studentId:      { type: String, required: true },
    program:        { type: String, required: true },
    graduationDate: { type: Number, required: true },        // unix
    email:          { type: String, required: true },
    nationalIdEnc:  { type: String, required: true },        // AES-256 encrypted
    fee:            { type: Number, default: 3000 },         // PKR

    status:         { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING", index: true },
    reviewNote:     { type: String },
    reviewedBy:     { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt:     { type: Date },

    // populated once approved + issued on-chain
    degreeHash:     { type: String },
    txHash:         { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Request", RequestSchema);
