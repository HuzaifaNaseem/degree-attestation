/**
 * validator.js — express-validator rule sets for the two critical endpoints.
 *
 * validate(rules) is a middleware factory: runs the rules, then either
 * returns 422 with the full error array or calls next().
 *
 * Usage in routes:
 *   router.post("/issue",  requireAuth(["university"]), validate(issueRules),  ctrl.issueDegree);
 *   router.post("/verify", requireAuth(["employer"]),   validate(verifyRules), verifyCtrl.verifyDegree);
 */
const { body, validationResult } = require("express-validator");

// ── Issue degree — POST /api/degrees/issue ────────────────────────────────────
const issueRules = [
  body("studentName")
    .trim()
    .notEmpty()
    .withMessage("studentName is required"),

  // studentId is the non-sensitive student identifier stored on-chain
  body("studentId")
    .trim()
    .notEmpty()
    .withMessage("studentId is required (non-sensitive; use university reg number, not national ID)"),

  body("program")
    .trim()
    .notEmpty()
    .withMessage("program is required (e.g. BSCS, BSCE)"),

  body("graduationDate")
    .isInt({ min: 1 })
    .withMessage("graduationDate must be a positive unix timestamp (seconds)"),

  // nationalId is PII — validated here, then AES-256 encrypted before DB storage
  body("nationalId")
    .trim()
    .notEmpty()
    .withMessage("nationalId is required (stored encrypted off-chain, never on-chain)"),

  // privateKey used to sign the on-chain tx as the university wallet
  body("privateKey")
    .trim()
    .notEmpty()
    .withMessage("privateKey is required")
    .matches(/^0x[0-9a-fA-F]{64}$/)
    .withMessage("privateKey must be a 0x-prefixed 32-byte hex string"),
];

// ── Verify degree — POST /api/degrees/verify ─────────────────────────────────
const verifyRules = [
  body("degreeHash")
    .trim()
    .notEmpty()
    .withMessage("degreeHash is required")
    .matches(/^0x[0-9a-fA-F]{64}$/)
    .withMessage("degreeHash must be a 0x-prefixed bytes32 hex string"),

  body("privateKey")
    .trim()
    .notEmpty()
    .withMessage("privateKey is required (employer wallet pays gas for the verification event)")
    .matches(/^0x[0-9a-fA-F]{64}$/)
    .withMessage("privateKey must be a 0x-prefixed 32-byte hex string"),
];

// ── validate() middleware factory ─────────────────────────────────────────────

/**
 * Runs all rules, returns 422 if any fail.
 * @param {import('express-validator').ValidationChain[]} rules
 */
function validate(rules) {
  return async (req, res, next) => {
    await Promise.all(rules.map((rule) => rule.run(req)));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    next();
  };
}

module.exports = { issueRules, verifyRules, validate };
