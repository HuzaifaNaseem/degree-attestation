/**
 * errorHandler.js — Central Express error handler.
 *
 * Maps known error types to appropriate HTTP status codes.
 * Ethers v6 custom errors surface as err.code or err.data — we parse
 * the revert reason and return a clean message rather than leaking stack traces.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error("[Error]", err.message);

  // Mongoose validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({ error: err.message });
  }

  // Mongoose duplicate key (e.g. duplicate email or walletAddress)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({ error: `Duplicate value for ${field}` });
  }

  // ethers v6 contract revert — custom error or require string
  if (err.code === "CALL_EXCEPTION" || err.reason) {
    return res.status(400).json({
      error:  "Contract reverted",
      reason: err.reason || err.shortMessage || "unknown revert",
    });
  }

  // Generic
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
}

module.exports = { errorHandler };
