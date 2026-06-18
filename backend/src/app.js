/**
 * app.js — Express application entry point.
 *
 * Start order:
 *   1. Load env
 *   2. Connect MongoDB
 *   3. Verify contract is live on the blockchain
 *   4. Start event listener
 *   5. Mount routes
 *   6. Listen on PORT
 */
/**
 * app.js — Express application entry point.
 *
 * Start order:
 *   1. Load .env
 *   2. Ensure logs/ directory exists
 *   3. Connect MongoDB
 *   4. Verify contract is live on-chain
 *   5. Start event listener
 *   6. Mount routes
 *   7. Listen
 *
 * Route layout:
 *   POST /api/degrees/issue    — issue degree (university, validated)
 *   POST /api/degrees/verify   — verify degree (employer, validated)
 *   GET  /api/degrees          — list / get degrees
 *   POST /api/degrees/:hash/revoke
 *   POST /api/auth/login|register, GET /api/auth/me
 *   POST /api/admin/grant-*|revoke-*, GET /api/admin/users
 *   GET  /api/reports/summary|audit|degrees-over-time
 */
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });

const express    = require("express");
const cors       = require("cors");
const morgan     = require("morgan");
const fs         = require("fs");
const path       = require("path");
const { connectDB }            = require("./config/db");
const { verifyContractLive }   = require("./config/blockchain");
const { startEventListener }   = require("./services/eventListener");
const { errorHandler }         = require("./middleware/errorHandler");

const authRoutes   = require("./routes/auth.routes");
const degreeRoutes = require("./routes/degree.routes");   // includes /issue and /verify
const adminRoutes  = require("./routes/admin.routes");
const reportRoutes = require("./routes/report.routes");
const publicRoutes = require("./routes/public.routes");   // unauthenticated: chain-status + read-only verify
const requestRoutes = require("./routes/request.routes"); // attestation request/approval workflow

const app  = express();
const PORT = process.env.PORT || 4000;

// Ensure logs directory exists before mounting Morgan
const LOGS_DIR = path.join(__dirname, "../../logs");
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

app.use(cors());
// Raised from the 100kb default: applications include base64 document images
// (CNIC / payment / marksheets) which exceed the default body-size limit.
app.use(express.json({ limit: "25mb" }));

// HTTP request log (Morgan combined → logs/access.log + dev format to stdout)
const logStream = fs.createWriteStream(
  path.join(LOGS_DIR, "access.log"), { flags: "a" }
);
app.use(morgan("combined", { stream: logStream }));
app.use(morgan("dev"));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/public",  publicRoutes);   // unauthenticated — must precede auth-gated routes
app.use("/api/requests", requestRoutes); // attestation request/approval workflow
app.use("/api/auth",    authRoutes);
app.use("/api/degrees", degreeRoutes);   // POST /issue and POST /verify live here
app.use("/api/admin",   adminRoutes);
app.use("/api/reports", reportRoutes);

app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() })
);

// ── Error handler (must be last middleware) ───────────────────────────────────
app.use(errorHandler);

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function start() {
  await connectDB();
  await verifyContractLive();
  // Event listener mirrors on-chain events into MongoDB. On a free public RPC it
  // can occasionally hiccup — never let that stop the API from serving.
  try {
    await startEventListener();
  } catch (err) {
    console.error("Event listener failed to start (non-fatal):", err.message);
  }
  app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
}

start().catch((err) => {
  console.error("Startup failed:", err.message);
  process.exit(1);
});
