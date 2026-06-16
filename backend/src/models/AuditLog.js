/**
 * AuditLog.js — Immutable record of every on-chain and auth event.
 * Populated by eventListener.js (from contract events) and by route handlers
 * (for auth events like login failures / unauthorized access attempts).
 */
const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      enum: [
        "DEGREE_ISSUED",
        "DEGREE_VERIFIED",
        "DEGREE_REVOKED",
        "ROLE_GRANTED",
        "FRAUD_ATTEMPT",       // verifyDegree returned exists=false
        "AUTH_LOGIN",
        "AUTH_FAILURE",
        "UNAUTHORIZED_ACCESS", // JWT valid but wrong role
        "ACCOUNT_DELETED",     // a user deleted their own account
      ],
    },
    degreeHash:   { type: String, index: true },    // relevant hash (if applicable)
    actor:        { type: String },                 // wallet or userId
    actorRole:    { type: String },
    details:      { type: mongoose.Schema.Types.Mixed }, // arbitrary event metadata
    txHash:       { type: String },                 // on-chain tx hash
    blockNumber:  { type: Number },
    isFraud:      { type: Boolean, default: false },
    timestamp:    { type: Date, default: Date.now },
  },
  {
    // Audit logs must not be modified after creation
    timestamps: false,
    versionKey: false,
  }
);

// Prevent updates to existing log entries (append-only)
AuditLogSchema.pre("save", function (next) {
  if (!this.isNew) return next(new Error("AuditLog entries are immutable"));
  next();
});

module.exports = mongoose.model("AuditLog", AuditLogSchema);
