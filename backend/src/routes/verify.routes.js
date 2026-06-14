/**
 * verify.routes.js — /api/verify
 * Thin route layer — business logic lives in verify.controller.js
 */
const express         = require("express");
const { requireAuth } = require("../middleware/auth");
const ctrl            = require("../controllers/verify.controller");

const router = express.Router();

router.post("/", requireAuth(["employer"]), ctrl.verifyDegree);

module.exports = router;
