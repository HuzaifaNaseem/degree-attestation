/**
 * report.controller.js
 * Business logic for reporting and audit log queries.
 */
const AuditLog        = require("../models/AuditLog");
const Degree          = require("../models/Degree");
const contractService = require("../services/contractService");

// GET /api/reports/summary
const getSummary = async (req, res, next) => {
  try {
    const [
      totalOnChain,
      totalIssued,
      totalVerifications,
      totalFraud,
      totalRevoked,
      totalUnauthorized,
    ] = await Promise.all([
      contractService.getTotalIssued(),
      Degree.countDocuments(),
      AuditLog.countDocuments({ eventType: "DEGREE_VERIFIED" }),
      AuditLog.countDocuments({ eventType: "FRAUD_ATTEMPT" }),
      Degree.countDocuments({ isRevoked: true }),
      AuditLog.countDocuments({ eventType: "UNAUTHORIZED_ACCESS" }),
    ]);

    res.json({
      totalOnChain,
      totalIssued,
      totalVerifications,
      totalFraud,
      totalRevoked,
      totalUnauthorized,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/audit?page=1&limit=50&type=FRAUD_ATTEMPT
const getAuditLog = async (req, res, next) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 50);
    const skip   = (page - 1) * limit;
    const filter = req.query.type ? { eventType: req.query.type } : {};

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    res.json({ logs, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/degrees-over-time
const getDegreesOverTime = async (req, res, next) => {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const data  = await Degree.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id:   { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSummary, getAuditLog, getDegreesOverTime };
