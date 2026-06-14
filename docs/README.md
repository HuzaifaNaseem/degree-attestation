# Blockchain-Based Degree Attestation System
**Iqra University · BSCS Capstone Project (CCP) · CLO3 · SDG 4 & 9**

A private Ethereum blockchain system for issuing, verifying, and revoking academic degree credentials — with AES-256 encrypted off-chain storage, role-based access control (RBAC), and a full React 18 dashboard.

---

## Prerequisites

Install these **before** anything else.

| Tool | Required Version | Download |
|---|---|---|
| Node.js | 20 LTS | https://nodejs.org |
| npm | 10+ (comes with Node) | — |
| MongoDB Community | 6 or 7 | https://www.mongodb.com/try/download/community |
| Git | any | https://git-scm.com |

Verify:
```bash
node -v        # must show v20.x.x
npm -v         # must show 10.x.x
mongod --version
```

---

## Project Structure

```
degree-attestation/
├── contracts/          Solidity smart contract
│   └── DegreeContract.sol
├── scripts/            Hardhat scripts
│   ├── deploy.js       Deploy contract → writes backend/config/contractInfo.json
│   └── simulate.js     Full assignment scenario simulation
├── backend/            Express API (Node.js)
│   ├── src/
│   │   ├── config/     blockchain.js · db.js
│   │   ├── controllers/
│   │   ├── middleware/ auth.js · validator.js · errorHandler.js
│   │   ├── models/     User · Degree · AuditLog
│   │   ├── routes/
│   │   └── services/   contractService · auditLogger · eventListener · encryptionService
│   ├── scripts/
│   │   └── initAdmin.js   Seeds 3 test accounts in MongoDB
│   ├── logs/           audit.log (NDJSON, append-only)
│   └── config/
│       └── contractInfo.json  Written by deploy.js
├── frontend/           React 18 + Vite + Tailwind + recharts
│   ├── src/
│   │   ├── api/        axiosClient.js
│   │   ├── components/ Navbar · DegreeForm · VerifyForm · AuditTable · ui/ · charts/
│   │   └── pages/      LoginPage · Dashboard · IssueDegree · VerifyDegree · TransactionLogs · Reports · AdminPanel
│   └── .env            VITE_API_URL (you create this — see step 2)
├── docs/               This folder
├── .env                Root environment variables (you create this — see step 1)
├── hardhat.config.js
└── package.json
```

---

## Step 1 — Create root `.env`

Create `.env` at the **project root** (next to `hardhat.config.js`):

```env
# Private Ethereum Network
RPC_URL=http://127.0.0.1:8545

# Hardhat Account #0 — deployer/admin wallet (local test net only, NEVER use on mainnet)
DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Written by deploy.js — do not change this manually
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3

# JWT
JWT_SECRET=iqra-ccp-jwt-secret-2024-super-long-random-string-do-not-use-in-prod
JWT_EXPIRES_IN=8h

# AES-256-GCM key (32 bytes = 64 hex chars) — for encrypting PII in MongoDB
ENCRYPTION_KEY=2d8fcf87aae0c4389b62cd362c783923eb9b3e8d3bd540e649cc7e333d2d5d74

# MongoDB
MONGO_URI=mongodb://127.0.0.1:27017/degree_attestation

# Express
PORT=4000
```

## Step 2 — Create frontend `.env`

Create `.env` inside the `frontend/` folder:

```env
VITE_API_URL=http://localhost:4000/api
```

---

## Step 3 — Install dependencies

Run from the **project root**:

```bash
# Root (Hardhat + toolbox)
npm install

# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

---

## Step 4 — Start MongoDB

**Windows:**
```powershell
# In a new terminal — keep this running
mongod --dbpath C:\data\db
```

**macOS / Linux:**
```bash
mongod --dbpath ~/data/db
# or if installed as a service:
brew services start mongodb-community   # macOS
sudo systemctl start mongod             # Linux
```

---

## Full Demo — Exact Command Sequence

Open **4 separate terminals** and run each step in order.

### Terminal 1 — Hardhat private chain
```bash
cd degree-attestation
npm run chain
# Keep running — shows: Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
```

### Terminal 2 — Deploy contract
```bash
cd degree-attestation
npm run deploy
# Output: ✓ Deployed to  0x5FbDB...
#         ✓ contractInfo.json written to backend/config/contractInfo.json
```

### Terminal 3 — Run simulation (confirms all assignment scenarios)
```bash
cd degree-attestation
npx hardhat run scripts/simulate.js --network localhost
# Output: 13/13 transactions green, SIMULATION SUMMARY table
```

### Terminal 2 (reuse) — Seed test accounts
```bash
node backend/scripts/initAdmin.js
# Output: [OK] admin · [OK] university · [OK] employer
```

### Terminal 2 (reuse) — Start backend
```bash
npm run backend
# Output: MongoDB connected · Contract verified live at 0x5FbDB... · Backend running on http://localhost:4000
```

### Terminal 4 — Start frontend
```bash
cd degree-attestation
npm run frontend
# Output: VITE v5.4.21  ready · Local: http://localhost:3000/
```

### Open browser: http://localhost:3000

---

## Test Accounts (Hardhat local network only)

| Role | Email | Password | Wallet (Hardhat #) |
|---|---|---|---|
| Admin | admin@iqra.edu.pk | Admin@1234 | `0xf39F…` (Account #0) |
| University | university@iqra.edu.pk | University@1234 | `0x7099…` (Account #1) |
| Employer | employer@techcorp.com | Employer@1234 | `0x3c44…` (Account #2) |

**Wallet private keys (local network only — NEVER use on mainnet):**
- University: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`
- Employer: `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a`

---

## User Journey (Demo Script)

1. **Login as University** → `/login` → `university@iqra.edu.pk / University@1234`
2. **Issue degree** → `/issue` → fill student name, ID, program, graduation date, national ID, private key → Submit → copy the returned `degreeHash`
3. **Login as Employer** → `/login` → `employer@techcorp.com / Employer@1234`
4. **Verify (VALID)** → `/verify` → paste `degreeHash` + employer private key → Badge shows **VALID**
5. **Verify fake hash** → enter any random `0x` + 64 hex chars → Badge shows **INVALID**, fraud logged
6. **Login as University again** → revoke the degree (from degree list or API)
7. **Verify again as Employer** → same hash → Badge now shows **REVOKED**
8. **Login as Admin** → `/reports` → confirm counts updated; `/logs` → see full audit trail

---

## Backend Integration Test

```bash
# Prerequisites: chain, backend, and MongoDB must be running
node backend/test-api.js
# Expected: 55 passed, 0 failed
```

---

## API Reference (Quick)

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/api/auth/login` | public | Login, returns JWT |
| GET | `/api/auth/me` | any auth | Current user profile |
| POST | `/api/auth/register` | admin | Create new user |
| POST | `/api/degrees/issue` | university | Issue degree on-chain |
| POST | `/api/degrees/verify` | employer | Verify degree by hash |
| GET | `/api/degrees` | university, admin | List degrees |
| GET | `/api/degrees/:hash` | any auth | Get degree details |
| POST | `/api/degrees/:hash/revoke` | university | Revoke degree |
| POST | `/api/admin/grant-university` | admin | Grant UNIVERSITY_ROLE on-chain |
| POST | `/api/admin/grant-employer` | admin | Grant EMPLOYER_ROLE on-chain |
| GET | `/api/admin/users` | admin | List all users |
| GET | `/api/reports/summary` | admin | Aggregated stats |
| GET | `/api/reports/audit` | admin | Audit log (paginated) |
| GET | `/api/reports/degrees-over-time` | admin, university | Time-series chart data |
| GET | `/api/health` | public | Health check |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Smart Contract | Solidity ^0.8.20 · OpenZeppelin Contracts v5 (AccessControl) |
| Blockchain Network | Hardhat 2.28.6 · chainId 1337 · ethers.js v6 |
| Backend API | Node.js 20 LTS · Express 4 · ethers v6 |
| Database | MongoDB 6/7 · Mongoose 8 |
| Authentication | JWT (jsonwebtoken 9) · bcryptjs |
| Encryption | AES-256-GCM (Node.js crypto module) |
| Frontend | React 18 · Vite 5 · Tailwind CSS 3 · Axios · recharts |
