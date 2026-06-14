/**
 * report.routes.js — /api/reports
 * Thin route layer — business logic lives in report.controller.js
 */
const express         = require("express");
const { requireAuth } = require("../middleware/auth");
const ctrl            = require("../controllers/report.controller");

const router = express.Router();

router.get("/summary",           requireAuth(["admin"]),                    ctrl.getSummary);
router.get("/audit",             requireAuth(["admin"]),                    ctrl.getAuditLog);
router.get("/degrees-over-time", requireAuth(["admin", "university"]),      ctrl.getDegreesOverTime);

module.exports = router;
