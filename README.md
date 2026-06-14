# Blockchain-Based Degree Attestation System
**Iqra University · BSCS/CB · Blockchain Security CCP**

Stack: Solidity 0.8.20 · Hardhat 2.28.6 · OpenZeppelin 5.6.1 · ethers 6.16.0
       Express 4.22.2 · MongoDB · JWT · AES-256-GCM
       React 18.3.1 · Vite 5.4.21 · Tailwind 3.4.19 · recharts 2.15.4

---

## First-time setup

```
# 1. Install all dependencies
npm install
cd backend  && npm install && cd ..
cd frontend && npm install && cd ..

# 2. Create your .env file (root)
copy .env.example .env

# 3. Create your frontend env file
copy frontend\.env.example frontend\.env
```

Edit `.env` and fill in every value (see .env.example for descriptions).
Generate the encryption key:
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Running the system

Open **4 separate terminals** OR use the single `npm run dev` command.

### Option A — all-in-one (concurrently)
```
npm run dev
```

### Option B — separate terminals (clearer output per service)

**Terminal 1 — Private blockchain node**
```
npm run chain
```
Expected output:
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
...
```
Copy Account #0's private key into `DEPLOYER_PRIVATE_KEY` in `.env`.

**Terminal 2 — Deploy the contract** (run once after node is up)
```
npm run deploy
```
Expected output:
```
Deployer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Deployer balance: 10000.0 ETH
DegreeAttestation deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Deployment info written to deployments.json
```
Copy the contract address into `CONTRACT_ADDRESS` in `.env`.

**Terminal 3 — Backend**
```
npm run backend
```
Expected output:
```
MongoDB connected: 127.0.0.1
[EventListener] Subscribed to all DegreeAttestation events
Backend running on http://localhost:4000
```
Verify health: `curl http://localhost:4000/api/health`
Expected: `{"status":"ok","timestamp":"..."}`

**Terminal 4 — Frontend**
```
npm run frontend
```
Expected output:
```
  VITE v5.4.21  ready in 300ms
  ➜  Local:   http://localhost:3000/
```
Open http://localhost:3000 → redirected to /login.

---

## Run the CCP simulation
```
node scripts/seed.js
```
Expected output:
```
═══════════════════════════════════════════════
 CCP SIMULATION — Degree Attestation System
═══════════════════════════════════════════════

── Step 1: Granting roles ──
  UNIVERSITY_ROLE granted → University 1: 0x70997...
  UNIVERSITY_ROLE granted → University 2: 0x3C44C...
  EMPLOYER_ROLE granted   → Employer 1:   0x90F79...
  EMPLOYER_ROLE granted   → Employer 2:   0x15d34...

── Step 2: Issuing 5 degrees ──
  ✓ Issued: Ali Hassan (BSCS) | hash: 0x1a2b3c...
  ✓ Issued: Sara Khan (BSCE)  | hash: 0x4d5e6f...
  ...

── Step 3: Verifying 3 degrees ──
  ✓ Verified: Ali Hassan (BSCS) | valid: true
  ...

── Step 4: FRAUD DETECTION — fake degree attempt ──
  ✗ Fake hash attempted: 0xdeadbeef...
    DegreeVerified event: isValid=false, isRevoked=false
    SYSTEM DETECTED FRAUD — degree does not exist on-chain

── Step 5: Summary ──
  Total degrees on-chain: 5
  Seed data written to seed-data.json
```

---

## Tests
```
npx hardhat test
```
Expected: **64 passing** (38 DegreeContract + 26 DegreeAttestation)

---

## API quick reference

| Method | Path | Role |
|--------|------|------|
| POST | /api/auth/login | public |
| POST | /api/auth/register | admin |
| GET  | /api/auth/me | any auth |
| POST | /api/degrees | university |
| GET  | /api/degrees | university / admin |
| GET  | /api/degrees/:hash | any auth |
| POST | /api/degrees/:hash/revoke | university |
| POST | /api/verify | employer |
| POST | /api/admin/grant-university | admin |
| POST | /api/admin/grant-employer | admin |
| GET  | /api/reports/summary | admin |
| GET  | /api/reports/audit | admin |
| GET  | /api/reports/degrees-over-time | admin / university |
| GET  | /api/health | public |

---

## Project structure

```
degree-attestation/
├── contracts/                  Solidity source
│   ├── DegreeContract.sol      Main contract (Prompt 3 spec)
│   ├── DegreeAttestation.sol   Extended contract with employer role gating
│   ├── interfaces/
│   └── mocks/
├── backend/
│   ├── src/
│   │   ├── config/             DB + blockchain setup
│   │   ├── controllers/        Business logic (issue, verify, report)
│   │   ├── middleware/         JWT auth + error handler
│   │   ├── models/             User, Degree, AuditLog
│   │   ├── routes/             Thin Express routers
│   │   ├── services/           contractService, encryptionService, eventListener
│   │   └── app.js
│   └── logs/                   Morgan access logs (access.log)
├── frontend/
│   └── src/
│       ├── api/                Axios client (reads VITE_API_URL)
│       ├── components/         Navbar, DegreeForm, VerifyForm, charts
│       └── pages/              Login, University, Employer, Admin dashboards
├── scripts/
│   ├── deploy.js               Deploys contract, writes deployments.json
│   └── seed.js                 Runs full CCP simulation scenario
├── test/
│   ├── DegreeContract.test.js  38 tests
│   └── DegreeAttestation.test.js 26 tests
├── hardhat.config.js
├── .env.example
└── README.md
```
