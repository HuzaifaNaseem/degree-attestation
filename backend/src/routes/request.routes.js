/**
 * request.routes.js — /api/requests  (attestation request workflow)
 *
 * POST /api/requests              public      — submit an application
 * GET  /api/requests              uni/admin   — list applications
 * POST /api/requests/:id/approve  uni/admin   — approve → issue on-chain
 * POST /api/requests/:id/reject   uni/admin   — reject with a note
 */
const express         = require("express");
const { requireAuth } = require("../middleware/auth");
const ctrl            = require("../controllers/request.controller");

const router = express.Router();

router.post("/",            ctrl.submitRequest);                              // public
router.get("/",             requireAuth(["university", "admin"]), ctrl.listRequests);
router.get("/:id",          requireAuth(["university", "admin"]), ctrl.getRequest);
router.post("/:id/analyze", requireAuth(["university", "admin"]), ctrl.analyzeRequest);
router.post("/:id/approve", requireAuth(["university", "admin"]), ctrl.approveRequest);
router.post("/:id/reject",  requireAuth(["university", "admin"]), ctrl.rejectRequest);

module.exports = router;
