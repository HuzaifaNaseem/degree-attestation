/**
 * User.js — Accounts for universities, employers, and admin.
 * Passwords are bcrypt-hashed; walletAddress links to on-chain role.
 */
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    name:          { type: String, required: true, trim: true },
    email:         { type: String, required: true, unique: true, lowercase: true },
    passwordHash:  { type: String, required: true },
    role:          { type: String, enum: ["admin", "university", "employer"], required: true },
    // walletAddress must match the on-chain role assignment
    walletAddress: { type: String, required: true, unique: true, lowercase: true },
    isActive:      { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Never return the password hash to API consumers
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

UserSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

UserSchema.statics.hashPassword = async function (plain) {
  return bcrypt.hash(plain, 12);
};

module.exports = mongoose.model("User", UserSchema);
