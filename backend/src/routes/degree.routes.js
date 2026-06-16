/**
 * degree.routes.js — /api/degrees
 *
 * POST /api/degrees/issue          university       — issue a new degree (validated)
 * POST /api/degrees/verify         university/admin — official on-chain verification (validated)
 * GET  /api/degrees                university/admin — list degrees
 * GET  /api/degrees/:hash          university/admin — get degree + on-chain status
 * POST /api/degrees/:hash/revoke   university       — revoke a degree
 *
 * NOTE: /issue and /verify are registered BEFORE /:hash so Express does not
 * misparse the literal strings "issue" / "verify" as hash param values.
 */
const express         = require("express");
const { requireAuth } = require("../middleware/auth");
const { validate, issueRules, verifyRules } = require("../middleware/validator");
const degreeCtrl      = require("../controllers/degree.controller");
const verifyCtrl      = require("../controllers/verify.controller");

const router = express.Router();

// ── Specific paths first (must come before /:hash) ────────────────────────────

router.post(
  "/issue",
  requireAuth(["university"]),
  validate(issueRules),
  degreeCtrl.issueDegree
);

router.post(
  "/verify",
  requireAuth(["university", "admin"]),
  validate(verifyRules),
  verifyCtrl.verifyDegree
);

// ── Generic paths ─────────────────────────────────────────────────────────────

router.get("/",  requireAuth(["university", "admin"]), degreeCtrl.listDegrees);

router.get(
  "/:hash",
  requireAuth(["university", "admin"]),
  degreeCtrl.getDegree
);

router.post(
  "/:hash/revoke",
  requireAuth(["university"]),
  degreeCtrl.revokeDegree
);

module.exports = router;
