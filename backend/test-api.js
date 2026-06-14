/**
 * test-api.js — End-to-end integration test for all backend endpoints.
 *
 * Prerequisites:
 *   1. Hardhat node running:  npm run chain          (separate terminal)
 *   2. Contract deployed:     npm run deploy          (separate terminal)
 *   3. MongoDB running:       mongod                  (separate terminal)
 *   4. Admin seeded:          node backend/scripts/initAdmin.js
 *   5. Backend running:       npm run backend         (separate terminal)
 *
 * Run from the project root:
 *   node backend/test-api.js
 *
 * Uses only Node.js built-ins (http module) — no extra dependencies.
 *
 * Hardhat test private keys (local network only — NEVER use on mainnet):
 *   Account #0 (admin/deployer):  0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
 *   Account #1 (university):      0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
 *   Account #2 (employer):        0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
 */

const http = require("http");

const BASE = "http://localhost:4000/api";

// ── Test state ────────────────────────────────────────────────────────────────
let adminToken      = "";
let universityToken = "";
let employerToken   = "";
let issuedHash      = "";

// Hardhat deterministic private keys — local dev only
const UNI_PK  = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const EMP_PK  = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";
const UNI_WALLET = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";
const EMP_WALLET = "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc";
const FAKE_HASH  = "0x984d6766425f5c8fd34dbd5c08c9581c3ba6e4648123e18095c8eb79e0385ccb";

// Use a timestamp-based studentId so this test never collides with simulate.js data
// (simulate.js used IU-2024-001 / IU-2024-002 / IU-2024-003)
const TEST_STUDENT_ID = `IU-API-${Date.now()}`;

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "localhost",
      port:     4000,
      path:     `/api${path}`,
      method,
      headers: {
        "Content-Type":  "application/json",
        ...(payload && { "Content-Length": Buffer.byteLength(payload) }),
        ...(token  && { "Authorization": `Bearer ${token}` }),
      },
    };
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Test runner ───────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function check(name, condition, got) {
  if (condition) {
    console.log(`  ✓ PASS  ${name}`);
    passed++;
  } else {
    console.log(`  ✗ FAIL  ${name}`);
    console.log(`         got: ${JSON.stringify(got)}`);
    failed++;
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

async function testHealth() {
  console.log("\n── Health ───────────────────────────────────────────────────");
  const r = await request("GET", "/health");
  check("GET /health → 200", r.status === 200, r);
  check("status field is 'ok'", r.body.status === "ok", r.body);
}

async function testAuthLogin() {
  console.log("\n── Auth ─────────────────────────────────────────────────────");

  // Admin login
  const r1 = await request("POST", "/auth/login", {
    email: "admin@iqra.edu.pk",
    password: "Admin@1234",
  });
  check("POST /auth/login (admin) → 200", r1.status === 200, r1);
  check("returns JWT token", typeof r1.body.token === "string", r1.body);
  adminToken = r1.body.token || "";

  // University login
  const r2 = await request("POST", "/auth/login", {
    email: "university@iqra.edu.pk",
    password: "University@1234",
  });
  check("POST /auth/login (university) → 200", r2.status === 200, r2);
  universityToken = r2.body.token || "";

  // Employer login
  const r3 = await request("POST", "/auth/login", {
    email: "employer@techcorp.com",
    password: "Employer@1234",
  });
  check("POST /auth/login (employer) → 200", r3.status === 200, r3);
  employerToken = r3.body.token || "";

  // Wrong password → 401
  const r4 = await request("POST", "/auth/login", {
    email: "admin@iqra.edu.pk",
    password: "wrong",
  });
  check("POST /auth/login (wrong pw) → 401", r4.status === 401, r4);

  // GET /me
  const r5 = await request("GET", "/auth/me", null, adminToken);
  check("GET /auth/me → 200", r5.status === 200, r5);
  check("/me returns role=admin", r5.body.user?.role === "admin", r5.body);
}

async function testValidation() {
  console.log("\n── Input Validation ─────────────────────────────────────────");

  // Missing fields
  const r1 = await request("POST", "/degrees/issue", {
    studentName: "Ali Hassan",
    // missing studentId, program, graduationDate, nationalId, privateKey
  }, universityToken);
  check("POST /degrees/issue missing fields → 422", r1.status === 422, r1);
  check("errors array present", Array.isArray(r1.body.errors), r1.body);

  // Invalid privateKey format
  const r2 = await request("POST", "/degrees/issue", {
    studentName:    "Ali Hassan",
    studentId:      "IU-2024-001",
    program:        "BSCS",
    graduationDate: 1717200000,
    nationalId:     "42101-1234567-1",
    privateKey:     "not-a-valid-key",
  }, universityToken);
  check("POST /degrees/issue bad privateKey → 422", r2.status === 422, r2);

  // Invalid degreeHash format for verify
  const r3 = await request("POST", "/degrees/verify", {
    degreeHash: "not-a-hash",
    privateKey: EMP_PK,
  }, employerToken);
  check("POST /degrees/verify bad hash → 422", r3.status === 422, r3);
}

async function testGrantRoles() {
  console.log("\n── Admin: Grant On-Chain Roles ──────────────────────────────");

  const r1 = await request(
    "POST", "/admin/grant-university",
    { walletAddress: UNI_WALLET },
    adminToken
  );
  check("POST /admin/grant-university → 200", r1.status === 200, r1);
  check("returns txHash", typeof r1.body.txHash === "string", r1.body);

  const r2 = await request(
    "POST", "/admin/grant-employer",
    { walletAddress: EMP_WALLET },
    adminToken
  );
  check("POST /admin/grant-employer → 200", r2.status === 200, r2);

  // Non-admin cannot grant roles
  const r3 = await request(
    "POST", "/admin/grant-university",
    { walletAddress: EMP_WALLET },
    universityToken
  );
  check("POST /admin/grant-university (wrong role) → 403", r3.status === 403, r3);
}

async function testIssueDegree() {
  console.log("\n── Issue Degree ─────────────────────────────────────────────");

  const r = await request("POST", "/degrees/issue", {
    studentName:    "Fatima Malik",
    studentId:      TEST_STUDENT_ID,     // unique per run — never clashes with simulate.js
    program:        "BSCS",
    graduationDate: 1720000000,
    nationalId:     "42201-9876543-2",
    dob:            "2001-03-22",
    gpa:            "3.9",
    privateKey:     UNI_PK,
  }, universityToken);

  check("POST /degrees/issue → 201", r.status === 201, r);
  check("returns degreeHash", typeof r.body.degree?.degreeHash === "string", r.body);
  check("returns txHash",     typeof r.body.txHash === "string", r.body);
  check("returns txTimeMs",   typeof r.body.txTimeMs === "number", r.body);
  check("no nationalIdEnc in response", !r.body.degree?.nationalIdEnc, r.body.degree);

  issuedHash = r.body.degree?.degreeHash || "";

  // Duplicate issue (same studentId+program+date+signer) → 400 (DegreeAlreadyExists)
  const r2 = await request("POST", "/degrees/issue", {
    studentName:    "Fatima Malik",
    studentId:      TEST_STUDENT_ID,
    program:        "BSCS",
    graduationDate: 1720000000,
    nationalId:     "42201-9876543-2",
    privateKey:     UNI_PK,
  }, universityToken);
  check("POST /degrees/issue duplicate → 400", r2.status === 400, r2);
}

async function testVerifyDegree() {
  console.log("\n── Verify Degree ────────────────────────────────────────────");

  if (!issuedHash) { console.log("  [SKIP] no issuedHash available"); return; }

  // Verify valid degree
  const r1 = await request("POST", "/degrees/verify", {
    degreeHash: issuedHash,
    privateKey: EMP_PK,
  }, employerToken);
  check("POST /degrees/verify (valid) → 200", r1.status === 200, r1);
  check("status = VALID",                      r1.body.status === "VALID", r1.body);
  check("fraudDetected = false",               r1.body.fraudDetected === false, r1.body);
  check("returns issuingUniversity",           typeof r1.body.issuingUniversity === "string", r1.body);
  check("returns txTimeMs",                    typeof r1.body.txTimeMs === "number", r1.body);

  // Fraud: verify fake hash
  const r2 = await request("POST", "/degrees/verify", {
    degreeHash: FAKE_HASH,
    privateKey: EMP_PK,
  }, employerToken);
  check("POST /degrees/verify (fake) → 200",   r2.status === 200, r2);
  check("status = INVALID",                     r2.body.status === "INVALID", r2.body);
  check("fraudDetected = true",                 r2.body.fraudDetected === true, r2.body);

  // Wrong role (university cannot verify)
  const r3 = await request("POST", "/degrees/verify", {
    degreeHash: issuedHash,
    privateKey: UNI_PK,
  }, universityToken);
  check("POST /degrees/verify (wrong role) → 403", r3.status === 403, r3);
}

async function testListAndGet() {
  console.log("\n── List & Get Degree ────────────────────────────────────────");

  const r1 = await request("GET", "/degrees", null, universityToken);
  check("GET /degrees → 200", r1.status === 200, r1);
  check("returns degrees array", Array.isArray(r1.body.degrees), r1.body);
  check("at least 1 degree", r1.body.total >= 1, r1.body);

  if (issuedHash) {
    const r2 = await request("GET", `/degrees/${issuedHash}`, null, universityToken);
    check("GET /degrees/:hash → 200", r2.status === 200, r2);
    check("returns degree + onChain", !!r2.body.degree && !!r2.body.onChain, r2.body);
  }

  // Non-existent hash → 404
  const r3 = await request("GET", `/degrees/${FAKE_HASH}`, null, universityToken);
  check("GET /degrees/:hash (fake) → 404", r3.status === 404, r3);
}

async function testRevoke() {
  console.log("\n── Revoke Degree ────────────────────────────────────────────");

  if (!issuedHash) { console.log("  [SKIP] no issuedHash available"); return; }

  const r = await request(
    "POST", `/degrees/${issuedHash}/revoke`,
    { reason: "Test revocation", privateKey: UNI_PK },
    universityToken
  );
  check("POST /degrees/:hash/revoke → 200", r.status === 200, r);
  check("returns txHash", typeof r.body.txHash === "string", r.body);

  // Now verify the revoked degree
  const r2 = await request("POST", "/degrees/verify", {
    degreeHash: issuedHash,
    privateKey: EMP_PK,
  }, employerToken);
  check("Verify revoked degree → status REVOKED", r2.body.status === "REVOKED", r2.body);
}

async function testReports() {
  console.log("\n── Reports ──────────────────────────────────────────────────");

  const r1 = await request("GET", "/reports/summary", null, adminToken);
  check("GET /reports/summary → 200", r1.status === 200, r1);
  check("returns totalOnChain",        typeof r1.body.totalOnChain === "number", r1.body);
  check("returns totalVerifications",  typeof r1.body.totalVerifications === "number", r1.body);
  check("returns totalFraud",          typeof r1.body.totalFraud === "number", r1.body);

  const r2 = await request("GET", "/reports/audit", null, adminToken);
  check("GET /reports/audit → 200",   r2.status === 200, r2);
  check("returns logs array",          Array.isArray(r2.body.logs), r2.body);

  const r3 = await request("GET", "/reports/audit?type=FRAUD_ATTEMPT", null, adminToken);
  check("GET /reports/audit?type=FRAUD_ATTEMPT → 200", r3.status === 200, r3);

  const r4 = await request("GET", "/reports/degrees-over-time", null, adminToken);
  check("GET /reports/degrees-over-time → 200", r4.status === 200, r4);
  check("returns data array", Array.isArray(r4.body.data), r4.body);

  // Non-admin blocked
  const r5 = await request("GET", "/reports/summary", null, universityToken);
  check("GET /reports/summary (non-admin) → 403", r5.status === 403, r5);
}

async function testAdminUsers() {
  console.log("\n── Admin Users ──────────────────────────────────────────────");

  const r = await request("GET", "/admin/users", null, adminToken);
  check("GET /admin/users → 200", r.status === 200, r);
  check("returns users array", Array.isArray(r.body.users), r.body);
  check("at least 3 users", r.body.total >= 3, r.body);
  check("no passwordHash exposed", !r.body.users?.[0]?.passwordHash, r.body.users?.[0]);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(" Degree Attestation — Backend Integration Test");
  console.log(" Target: http://localhost:4000/api");
  console.log("═══════════════════════════════════════════════════════════════");

  try {
    await testHealth();
    await testAuthLogin();
    await testValidation();
    await testGrantRoles();
    await testIssueDegree();
    await testVerifyDegree();
    await testListAndGet();
    await testRevoke();
    await testReports();
    await testAdminUsers();
  } catch (err) {
    console.error("\nFATAL:", err.message);
    console.error("Is the backend running on port 4000?");
    process.exit(1);
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(` Results: ${passed} passed, ${failed} failed`);
  console.log("═══════════════════════════════════════════════════════════════");
  process.exit(failed > 0 ? 1 : 0);
}

main();
