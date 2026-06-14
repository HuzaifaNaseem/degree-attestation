/**
 * auth.js — JWT verification middleware + role-gate factory.
 *
 * requireAuth(roles[])  validates the JWT and checks the caller's role
 * matches one of the allowed roles.  For any contract mutation, the route
 * handler also re-checks on-chain role via contractService.hasXRole() —
 * the JWT is a UX convenience layer, not the ground truth.
 */
const jwt      = require("jsonwebtoken");
const AuditLog = require("../models/AuditLog");

/**
 * @param {string[]} allowedRoles  e.g. ["university", "admin"]
 */
function requireAuth(allowedRoles = []) {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or malformed Authorization header" });
    }

    const token = authHeader.split(" ")[1];
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Role check
    if (allowedRoles.length && !allowedRoles.includes(payload.role)) {
      // Log unauthorized access attempt
      await AuditLog.create({
        eventType:   "UNAUTHORIZED_ACCESS",
        actor:       payload.userId,
        actorRole:   payload.role,
        details:     { attemptedRoute: req.originalUrl, requiredRoles: allowedRoles },
        isFraud:     false,
      }).catch(() => {}); // never let audit log failure block the response

      return res.status(403).json({ error: "Insufficient role for this operation" });
    }

    req.user = payload; // { userId, role, walletAddress, email }
    next();
  };
}

module.exports = { requireAuth };
