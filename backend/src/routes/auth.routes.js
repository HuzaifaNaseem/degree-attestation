/**
 * auth.routes.js — /api/auth
 *
 * POST /api/auth/register  — admin creates a new user account
 * POST /api/auth/login     — returns JWT
 * GET  /api/auth/me        — returns current user profile
 */
const express   = require("express");
const jwt       = require("jsonwebtoken");
const User      = require("../models/User");
const AuditLog  = require("../models/AuditLog");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// POST /api/auth/register (admin only — creates university / employer accounts)
router.post("/register", requireAuth(["admin"]), async (req, res, next) => {
  try {
    const { name, email, password, role, walletAddress } = req.body;
    if (!name || !email || !password || !role || !walletAddress) {
      return res.status(400).json({ error: "name, email, password, role, walletAddress are required" });
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
      walletAddress: walletAddress.toLowerCase(),
    });

    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/student-register (public — students self-register)
router.post("/student-register", async (req, res, next) => {
  try {
    const { name, email, password, studentId } = req.body;
    if (!name || !email || !password || !studentId) {
      return res.status(400).json({ error: "name, email, password, studentId are required" });
    }
    if (await User.findOne({ email: email.toLowerCase() })) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }
    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: "student",
      studentId: studentId.trim(),
      // sentinel wallet — students have no on-chain identity
      walletAddress: `student:${email.toLowerCase()}`,
    });
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = await User.findOne({ email });
    const valid = user && (await user.comparePassword(password));

    if (!valid) {
      await AuditLog.create({
        eventType: "AUTH_FAILURE",
        actor:     email,
        details:   { ip: req.ip },
        isFraud:   false,
      }).catch(() => {});
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role, walletAddress: user.walletAddress, email: user.email, studentId: user.studentId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
    );

    await AuditLog.create({
      eventType: "AUTH_LOGIN",
      actor:     user._id.toString(),
      actorRole: user.role,
      details:   { email },
      isFraud:   false,
    }).catch(() => {});

    res.json({ token, user });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get("/me", requireAuth(["admin", "university", "employer", "student"]), async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/my-credentials — a student's own on-chain credentials
router.get("/my-credentials", requireAuth(["student"]), async (req, res, next) => {
  try {
    const Degree = require("../models/Degree");
    const studentId = req.user.studentId;
    if (!studentId) return res.json({ studentId: null, degrees: [] });
    const degrees = await Degree.find({ studentId })
      .sort({ createdAt: -1 })
      .select("degreeHash studentName studentId program graduationDate isRevoked txHash universityWallet createdAt");
    res.json({ studentId, count: degrees.length, degrees });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
