/**
 * public.routes.js — unauthenticated read-only routes.
 * Mounted at /api/public. No auth middleware: these are intentionally public.
 */
const express = require("express");
const { chainStatus, publicVerify, publicStats, studentCredentials } = require("../controllers/public.controller");

const router = express.Router();

router.get("/chain-status",       chainStatus);
router.get("/stats",              publicStats);
router.get("/student/:studentId", studentCredentials);
router.post("/verify",            publicVerify);

module.exports = router;
