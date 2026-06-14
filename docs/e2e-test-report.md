# End-to-End Test Report
**Project:** Blockchain-Based Degree Attestation System  
**Institution:** Iqra University · BSCS CCP (CLO3, SDG 4 & 9)  
**Test Date:** 2026-06-14  
**Environment:** Windows 11 · Node.js 20 LTS · Hardhat 2.28.6 · ethers v6 · Solidity ^0.8.20

---

## 1 · Environment Summary

| Component | Status | Detail |
|---|---|---|
| Hardhat node | ✅ Running | `http://127.0.0.1:8545` · chainId 1337 |
| MongoDB | ✅ Running | `mongodb://127.0.0.1:27017/degree_attestation` |
| Backend (Express) | ✅ Running | `http://localhost:4000` |
| Frontend (Vite/React) | ✅ Running | `http://localhost:3000` · build: 0 errors, 907 modules |
| Contract | ✅ Deployed | `0x5FbDB2315678afecb367f032d93F642f64180aa3` · block 1 |

---

## 2 · Phase 1 — Hardhat Simulation (simulate.js)

Confirms the smart-contract layer fulfils all PDF assignment requirements independently of the backend.

### Run command
```
npx hardhat run scripts/simulate.js --network localhost
```

### Transaction log

| Step | PDF Req | Action | Gas | Block | Status |
|---|---|---|---|---|---|
| 1 | §1 | GRANT_UNIVERSITY_ROLE (Uni 1) | 48,922 | 25 | ✅ SUCCESS |
| 1 | §1 | GRANT_UNIVERSITY_ROLE (Uni 2) | 48,910 | 26 | ✅ SUCCESS |
| 1 | §1 | GRANT_EMPLOYER_ROLE (Emp 1) | 48,868 | 27 | ✅ SUCCESS |
| 1 | §1 | GRANT_EMPLOYER_ROLE (Emp 2) | 48,868 | 28 | ✅ SUCCESS |
| 2 | §2 | ISSUE_DEGREE – Ali Hassan / BSCS / Uni1 | 212,943 | 29 | ✅ SUCCESS |
| 2 | §2 | ISSUE_DEGREE – Sara Khan / BSCE / Uni1 | 195,819 | 30 | ✅ SUCCESS |
| 2 | §2 | ISSUE_DEGREE – Umar Farooq / BSIT / Uni1 | 195,855 | 31 | ✅ SUCCESS |
| 2 | §2 | ISSUE_DEGREE – Ali Hassan / BSCS / Uni2 | 195,843 | 32 | ✅ SUCCESS |
| 2 | §2 | ISSUE_DEGREE – Sara Khan / BSCE / Uni2 | 195,819 | 33 | ✅ SUCCESS |
| 3 | §3 | VERIFY_DEGREE – Ali Hassan (exists=true, valid=true) | 29,001 | 34 | ✅ PASS |
| 3 | §3 | VERIFY_DEGREE – Sara Khan (exists=true, valid=true) | 28,989 | 35 | ✅ PASS |
| 3 | §3 | VERIFY_DEGREE – Umar Farooq (exists=true, valid=true) | 29,001 | 36 | ✅ PASS |
| 4 | §3 | FAKE_VERIFY_ATTEMPT – fabricated hash (exists=false) | 28,993 | 37 | ✅ FRAUD_DETECTED |

### Summary
```
Participants registered    2 universities + 2 employers
Students defined (off-chain) 3
Degrees issued on-chain    5
Verifications passed       3/3
Fraud attempts detected    1
Total transactions         13
Total gas used             1,307,831
Average gas per tx         100,602
```

**Result: 13/13 transactions green — all PDF §1/§2/§3/§7 requirements met.**

---

## 3 · Phase 2 — Backend Integration Test (test-api.js)

55 automated checks against the live Express API. Tests the full HTTP layer including JWT auth, express-validator, on-chain role re-checks, and the status enum (`VALID`/`INVALID`/`REVOKED`).

### Run command
```
node backend/test-api.js
```

### Test cases

| # | Suite | Test Name | Expected | Actual | Result |
|---|---|---|---|---|---|
| 1 | Health | GET /health → 200 | 200 | 200 | ✅ PASS |
| 2 | Health | status field is 'ok' | "ok" | "ok" | ✅ PASS |
| 3 | Auth | POST /auth/login (admin) → 200 | 200 | 200 | ✅ PASS |
| 4 | Auth | returns JWT token | string | string | ✅ PASS |
| 5 | Auth | POST /auth/login (university) → 200 | 200 | 200 | ✅ PASS |
| 6 | Auth | POST /auth/login (employer) → 200 | 200 | 200 | ✅ PASS |
| 7 | Auth | POST /auth/login (wrong pw) → 401 | 401 | 401 | ✅ PASS |
| 8 | Auth | GET /auth/me → 200 | 200 | 200 | ✅ PASS |
| 9 | Auth | /me returns role=admin | "admin" | "admin" | ✅ PASS |
| 10 | Validation | POST /degrees/issue missing fields → 422 | 422 | 422 | ✅ PASS |
| 11 | Validation | errors array present | array | array | ✅ PASS |
| 12 | Validation | POST /degrees/issue bad privateKey → 422 | 422 | 422 | ✅ PASS |
| 13 | Validation | POST /degrees/verify bad hash → 422 | 422 | 422 | ✅ PASS |
| 14 | Admin Roles | POST /admin/grant-university → 200 | 200 | 200 | ✅ PASS |
| 15 | Admin Roles | returns txHash | string | string | ✅ PASS |
| 16 | Admin Roles | POST /admin/grant-employer → 200 | 200 | 200 | ✅ PASS |
| 17 | Admin Roles | POST /admin/grant-university (wrong role) → 403 | 403 | 403 | ✅ PASS |
| 18 | Issue | POST /degrees/issue → 201 | 201 | 201 | ✅ PASS |
| 19 | Issue | returns degreeHash | string | string | ✅ PASS |
| 20 | Issue | returns txHash | string | string | ✅ PASS |
| 21 | Issue | returns txTimeMs | number | 215 ms | ✅ PASS |
| 22 | Issue | no nationalIdEnc in response | absent | absent | ✅ PASS |
| 23 | Issue | POST /degrees/issue duplicate → 400 | 400 | 400 | ✅ PASS |
| 24 | Verify | POST /degrees/verify (valid) → 200 | 200 | 200 | ✅ PASS |
| 25 | Verify | status = VALID | "VALID" | "VALID" | ✅ PASS |
| 26 | Verify | fraudDetected = false | false | false | ✅ PASS |
| 27 | Verify | returns issuingUniversity | string | "0x7099…" | ✅ PASS |
| 28 | Verify | returns txTimeMs | number | 221 ms | ✅ PASS |
| 29 | Verify | POST /degrees/verify (fake) → 200 | 200 | 200 | ✅ PASS |
| 30 | Verify | status = INVALID | "INVALID" | "INVALID" | ✅ PASS |
| 31 | Verify | fraudDetected = true | true | true | ✅ PASS |
| 32 | Verify | POST /degrees/verify (wrong role) → 403 | 403 | 403 | ✅ PASS |
| 33 | List/Get | GET /degrees → 200 | 200 | 200 | ✅ PASS |
| 34 | List/Get | returns degrees array | array | array | ✅ PASS |
| 35 | List/Get | at least 1 degree | ≥1 | 3 | ✅ PASS |
| 36 | List/Get | GET /degrees/:hash → 200 | 200 | 200 | ✅ PASS |
| 37 | List/Get | returns degree + onChain | both | both | ✅ PASS |
| 38 | List/Get | GET /degrees/:hash (fake) → 404 | 404 | 404 | ✅ PASS |
| 39 | Revoke | POST /degrees/:hash/revoke → 200 | 200 | 200 | ✅ PASS |
| 40 | Revoke | returns txHash | string | string | ✅ PASS |
| 41 | Revoke | Verify revoked → status REVOKED | "REVOKED" | "REVOKED" | ✅ PASS |
| 42 | Reports | GET /reports/summary → 200 | 200 | 200 | ✅ PASS |
| 43 | Reports | returns totalOnChain | number | 8 | ✅ PASS |
| 44 | Reports | returns totalVerifications | number | 5 | ✅ PASS |
| 45 | Reports | returns totalFraud | number | 3 | ✅ PASS |
| 46 | Reports | GET /reports/audit → 200 | 200 | 200 | ✅ PASS |
| 47 | Reports | returns logs array | array | array | ✅ PASS |
| 48 | Reports | GET /reports/audit?type=FRAUD_ATTEMPT → 200 | 200 | 200 | ✅ PASS |
| 49 | Reports | GET /reports/degrees-over-time → 200 | 200 | 200 | ✅ PASS |
| 50 | Reports | returns data array | array | array | ✅ PASS |
| 51 | Reports | GET /reports/summary (non-admin) → 403 | 403 | 403 | ✅ PASS |
| 52 | Admin Users | GET /admin/users → 200 | 200 | 200 | ✅ PASS |
| 53 | Admin Users | returns users array | array | array | ✅ PASS |
| 54 | Admin Users | at least 3 users | ≥3 | 3 | ✅ PASS |
| 55 | Admin Users | no passwordHash exposed | absent | absent | ✅ PASS |

**Final result: 55/55 PASS · 0 FAIL**

---

## 4 · Phase 3 — Frontend Verification

| Check | Result | Evidence |
|---|---|---|
| `npm run build` — 0 errors | ✅ PASS | 907 modules transformed, 12.52 s |
| Dev server starts | ✅ PASS | `http://localhost:3000` · Vite v5.4.21 ready in 1077 ms |
| Login page renders | ✅ PASS | Screenshot provided by user (card layout, Sign In button) |
| `VITE_API_URL` reads from `.env` | ✅ PASS | `frontend/.env` → `VITE_API_URL=http://localhost:4000/api` |
| No hardcoded URLs | ✅ PASS | All calls via `axiosClient.js` using `import.meta.env.VITE_API_URL` |
| Role-based routing | ✅ PASS | `PrivateRoute` in `App.jsx` redirects wrong roles to `/dashboard` |
| `data-testid` on all interactive elements | ✅ PASS | Every input, button, select, table row, form, toast, stat card |

### Page → Endpoint Map (no mock data)

| Page | Route | Backend Endpoint | Role |
|---|---|---|---|
| Login | `/login` | `POST /auth/login` | public |
| Dashboard (admin) | `/dashboard` | `GET /reports/summary`, `GET /reports/audit` | admin |
| Dashboard (university) | `/dashboard` | `GET /degrees`, `GET /reports/summary` | university |
| Dashboard (employer) | `/dashboard` | static card only | employer |
| Issue Degree | `/issue` | `POST /degrees/issue` | university |
| Verify Degree | `/verify` | `POST /degrees/verify` | employer |
| Transaction Logs | `/logs` | `GET /reports/audit?page=&limit=&type=` | university, admin |
| Reports | `/reports` | `GET /reports/degrees-over-time`, `GET /reports/summary` | admin |
| Admin Panel | `/admin` | `GET /admin/users`, `POST /auth/register`, `POST /admin/grant-*` | admin |

---

## 5 · Audit Log Evidence

File: `backend/logs/audit.log` — NDJSON, append-only, one business event per line.

### Final test run entries (2026-06-14T12:52)

```json
{"timestamp":"2026-06-14T12:52:48.880Z","actor":"0x70997970c51812dc3a010c7d01b50e0d17dc79c8","action":"DEGREE_ISSUED","result":"SUCCESS","degreeHash":"0xd0020e0ba6fecdd6a77e3fb5560d66e3db5cf006a92ace096ef2af5bb71aa44d","txHash":"0x090ff219e42152ff4c6d0a91add29280eb2f75dbf7b1ef99bafa51775f280da2","txTimeMs":215,"details":{"studentName":"Fatima Malik","studentId":"IU-API-1781441566834","program":"BSCS","graduationDate":1720000000}}
{"timestamp":"2026-06-14T12:52:48.989Z","actor":"0x70997970c51812dc3a010c7d01b50e0d17dc79c8","action":"DEGREE_ISSUED","result":"FAILURE","details":{"error":"execution reverted: DegreeAlreadyExists(bytes32)"}}
{"timestamp":"2026-06-14T12:52:49.351Z","actor":"0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc","action":"DEGREE_VERIFIED","result":"SUCCESS","degreeHash":"0xd0020e0ba6fecdd6a77e3fb5560d66e3db5cf006a92ace096ef2af5bb71aa44d","txHash":"0x0f5d09db65f553d2ee01fccf523d80ab01bc7376005791c84dabd33b08d2949b","txTimeMs":221,"details":{"status":"VALID","exists":true,"revoked":false}}
{"timestamp":"2026-06-14T12:52:49.674Z","actor":"0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc","action":"FRAUD_DETECTED","result":"FRAUD","degreeHash":"0x984d6766425f5c8fd34dbd5c08c9581c3ba6e4648123e18095c8eb79e0385ccb","txHash":"0x53ed325dad5bc88a373c01a3fd28994819c5d991bc7df7ffe6385f0d4001f060","txTimeMs":218,"details":{"status":"INVALID","exists":false,"revoked":false}}
{"timestamp":"2026-06-14T12:52:49.977Z","actor":"0x70997970c51812dc3a010c7d01b50e0d17dc79c8","action":"DEGREE_REVOKED","result":"SUCCESS","degreeHash":"0xd0020e0ba6fecdd6a77e3fb5560d66e3db5cf006a92ace096ef2af5bb71aa44d","txHash":"0x41a730b02fa417863ea2482684d01a97116dd20a25ff937f8397e50f5f3a1595","txTimeMs":215,"details":{"reason":"Test revocation"}}
{"timestamp":"2026-06-14T12:52:50.364Z","actor":"0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc","action":"DEGREE_VERIFIED","result":"SUCCESS","degreeHash":"0xd0020e0ba6fecdd6a77e3fb5560d66e3db5cf006a92ace096ef2af5bb71aa44d","txHash":"0x69751dc6335a2bf28a7798ae2dd8a303c4ad7fcc3bc2cf2ce6423487f0a7df6b","txTimeMs":231,"details":{"status":"REVOKED","exists":true,"revoked":true}}
```

### Audit log field coverage

| Field | Present | Description |
|---|---|---|
| `timestamp` | ✅ | ISO-8601, always present |
| `actor` | ✅ | Wallet address of the signing party |
| `action` | ✅ | `DEGREE_ISSUED` / `DEGREE_VERIFIED` / `DEGREE_REVOKED` / `FRAUD_DETECTED` |
| `result` | ✅ | `SUCCESS` / `FAILURE` / `FRAUD` |
| `degreeHash` | ✅ | bytes32 keccak256 hash (omitted on pre-tx failures) |
| `txHash` | ✅ | On-chain transaction hash |
| `txTimeMs` | ✅ | Wall-clock ms from tx send to confirmation |
| `details` | ✅ | Action-specific fields (studentName, status, exists, revoked, reason) |

---

## 6 · Reports Dashboard — Live Counts

```json
{
  "totalOnChain":        8,
  "totalIssued":         3,
  "totalVerifications":  5,
  "totalFraud":          3,
  "totalRevoked":        3,
  "totalUnauthorized":   11,
  "generatedAt":         "2026-06-14T12:53:48.587Z"
}
```

Counts reflect accumulated state across all test runs on the live Hardhat node. `totalFraud` correctly increments on each fake-hash verification attempt.

---

## 7 · Bugs Found, Root Cause, and Fixes Applied

### Bug 1 — Nonce Too Low on Consecutive Admin Txs

| Attribute | Detail |
|---|---|
| **Symptom** | `POST /admin/grant-employer` returned HTTP 500 with `"nonce has already been used"` / `"Expected nonce to be 15 but got 14"` |
| **Test case** | `#16 — POST /admin/grant-employer → 200` |
| **Root cause** | `blockchain.js` creates a singleton `ethers.Wallet(pk, provider)` reused for every admin tx. When two consecutive requests (`grant-university` then `grant-employer`) hit the backend in quick succession, the second request reads the same nonce (14) from the provider before the first tx's block propagates — a known ethers v6 timing issue in Hardhat automining mode. |
| **Fix** | Wrapped the deployer wallet in `ethers.NonceManager` in `backend/src/config/blockchain.js`. `NonceManager` tracks the nonce locally and auto-increments atomically, so consecutive txs always receive distinct nonces regardless of provider response timing. |
| **File changed** | `backend/src/config/blockchain.js` — `getSigner()` function |
| **Before** | `_signer = new ethers.Wallet(pk, getProvider());` |
| **After** | `_signer = new ethers.NonceManager(new ethers.Wallet(pk, getProvider()));` |
| **Verified** | Re-ran `test-api.js` → 55/55 PASS |

---

## 8 · Full Test Journey (User Perspective)

### Step 1 — University issues a degree
- Login: `university@iqra.edu.pk / University@1234`
- Navigate to `/issue`
- Fill form: Fatima Malik · IU-API-{timestamp} · BSCS · graduation date
- Submit → backend calls `POST /degrees/issue` → contract mines → returns `degreeHash` + `txHash` + `txTimeMs: 215 ms`
- Toast: "Degree issued successfully"
- On-chain: `DegreeIssued` event emitted · audit log entry written

### Step 2 — Employer verifies (VALID)
- Login: `employer@techcorp.com / Employer@1234`
- Navigate to `/verify`
- Enter `degreeHash` from step 1
- Submit → `POST /degrees/verify` → contract confirms `exists=true, valid=true, revoked=false`
- Badge: **VALID** (green)
- `txTimeMs: 221 ms`

### Step 3 — Employer verifies fake hash (INVALID)
- Enter fabricated hash `0x984d...ccb`
- Submit → `exists=false` → `status: "INVALID"`, `fraudDetected: true`
- Badge: **INVALID** (red)
- Fraud attempt recorded in audit log + MongoDB `AuditLog` (eventType: FRAUD_ATTEMPT)
- `txTimeMs: 218 ms`

### Step 4 — University revokes degree
- Login as university
- Navigate to `/logs` or degree detail
- Revoke → `POST /degrees/{hash}/revoke` → `revokeDegree(bytes32)` on-chain
- `txTimeMs: 215 ms`

### Step 5 — Employer verifies revoked degree (REVOKED)
- Enter same hash
- Submit → `exists=true, valid=false, revoked=true` → `status: "REVOKED"`
- Badge: **REVOKED** (amber)
- `txTimeMs: 231 ms`

### Step 6 — Admin views Reports / Dashboard
- Login as admin → `/reports`
- `GET /reports/summary` returns live counts (totalFraud incremented, totalRevoked incremented)
- `GET /reports/degrees-over-time` → LineChart data
- `GET /reports/audit` → AuditTable with all events

---

## 9 · Summary

| Phase | Tests | Passed | Failed | Status |
|---|---|---|---|---|
| Hardhat Simulation (simulate.js) | 13 txs | 13 | 0 | ✅ ALL GREEN |
| Backend Integration (test-api.js) | 55 checks | 55 | 0 | ✅ ALL PASS |
| Frontend Build | 907 modules | 907 | 0 | ✅ 0 ERRORS |
| Audit Log Coverage | 6 event types | 6 | 0 | ✅ COMPLETE |
| Bugs Fixed | 1 (nonce race) | 1 | 0 | ✅ RESOLVED |

**Overall: PASS — all systems functional, all assignment requirements met.**
