/**
 * admin.routes.js — /api/admin
 *
 * POST /api/admin/grant-university   — grant UNIVERSITY_ROLE on-chain + create user
 * POST /api/admin/grant-employer     — grant EMPLOYER_ROLE on-chain + create user
 * POST /api/admin/revoke-university  — revoke UNIVERSITY_ROLE
 * POST /api/admin/revoke-employer    — revoke EMPLOYER_ROLE
 * GET  /api/admin/users              — list all users
 */
const express         = require("express");
const { requireAuth } = require("../middleware/auth");
const contractService = require("../services/contractService");
const User            = require("../models/User");

const router = express.Router();

router.post("/grant-university", requireAuth(["admin"]), async (req, res, next) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) return res.status(400).json({ error: "walletAddress is required" });
    const receipt = await contractService.grantUniversityRole(walletAddress);
    res.json({ message: "UNIVERSITY_ROLE granted", txHash: receipt.hash });
  } catch (err) { next(err); }
});

router.post("/grant-employer", requireAuth(["admin"]), async (req, res, next) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) return res.status(400).json({ error: "walletAddress is required" });
    const receipt = await contractService.grantEmployerRole(walletAddress);
    res.json({ message: "EMPLOYER_ROLE granted", txHash: receipt.hash });
  } catch (err) { next(err); }
});

router.post("/revoke-university", requireAuth(["admin"]), async (req, res, next) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) return res.status(400).json({ error: "walletAddress is required" });
    const receipt = await contractService.revokeUniversityRole(walletAddress);
    res.json({ message: "UNIVERSITY_ROLE revoked", txHash: receipt.hash });
  } catch (err) { next(err); }
});

router.post("/revoke-employer", requireAuth(["admin"]), async (req, res, next) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) return res.status(400).json({ error: "walletAddress is required" });
    const receipt = await contractService.revokeEmployerRole(walletAddress);
    res.json({ message: "EMPLOYER_ROLE revoked", txHash: receipt.hash });
  } catch (err) { next(err); }
});

router.get("/users", requireAuth(["admin"]), async (req, res, next) => {
  try {
    const users = await User.find().select("-passwordHash").sort({ createdAt: -1 });
    res.json({ users, total: users.length });
  } catch (err) { next(err); }
});

module.exports = router;
