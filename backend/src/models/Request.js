/**
 * Request.js — an attestation request submitted by an applicant.
 *
 * Lifecycle:  PENDING  →  APPROVED (degree issued on-chain)
 *                      →  REJECTED (with a review note)
 *
 * This powers the review/approval workflow: applicants apply publicly, upload
 * supporting documents (CNIC, payment proof, matric & intermediate marksheets),
 * which are OCR'd in the browser. An institution reviewer (optionally assisted by
 * the AI verification agent) approves — issuing the credential on-chain — or rejects.
 */
const mongoose = require("mongoose");

/**
 * A single uploaded supporting document.
 *  - imageEnc : the compressed image (base64 data-URL) AES-256 encrypted at rest.
 *               Documents contain sensitive PII (CNIC, marks) so the image bytes
 *               are never stored in the clear — only decrypted for an authed reviewer.
 *  - ocrText  : text extracted client-side via Tesseract.js. Kept readable so the
 *               reviewer and the AI agent can cross-check it against the form.
 */
const DocumentSchema = new mongoose.Schema(
  {
    type:     { type: String, enum: ["cnic", "payment", "matric", "intermediate", "other"], required: true },
    label:    { type: String, required: true },
    mime:     { type: String, default: "image/jpeg" },
    imageEnc: { type: String, required: true },   // AES-256 encrypted data-URL
    ocrText:  { type: String, default: "" },       // extracted text (cross-check + AI)
  },
  { _id: false }
);

/** The AI verification agent's recommendation. Advisory only — the admin decides. */
const AIReviewSchema = new mongoose.Schema(
  {
    recommendation: { type: String, enum: ["APPROVE", "REJECT", "REVIEW"], required: true },
    confidence:     { type: Number, default: 0 },   // 0–100
    summary:        { type: String, default: "" },
    reasons:        { type: [String], default: [] },
    redFlags:       { type: [String], default: [] },
    model:          { type: String },               // which Claude model produced it
    createdAt:      { type: Date, default: Date.now },
  },
  { _id: false }
);

const RequestSchema = new mongoose.Schema(
  {
    applicantName:  { type: String, required: true },
    studentId:      { type: String, required: true },
    program:        { type: String, required: true },
    graduationDate: { type: Number, required: true },        // unix
    email:          { type: String, required: true },
    nationalIdEnc:  { type: String, required: true },        // AES-256 encrypted
    fee:            { type: Number, default: 3000 },         // PKR

    documents:      { type: [DocumentSchema], default: [] }, // CNIC / payment / marksheets
    aiReview:       { type: AIReviewSchema, default: null }, // AI agent recommendation

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
