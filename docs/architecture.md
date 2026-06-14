# System Architecture
**Blockchain-Based Degree Attestation System**

This document describes the full architecture in text form so you can render it as a diagram (draw.io, Lucidchart, Mermaid, etc.).

---

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              ACTORS                                     │
│                                                                         │
│   [Admin]          [University Staff]         [Employer / Verifier]    │
│    (1 role)            (1+ roles)                  (1+ roles)          │
└────────┬──────────────────┬──────────────────────────┬─────────────────┘
         │                  │                          │
         ▼                  ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND LAYER                                 │
│                   React 18 + Vite + Tailwind CSS                       │
│                        http://localhost:3000                            │
│                                                                         │
│  /login        → LoginPage (JWT auth, role detection)                  │
│  /dashboard    → Role-aware: AdminDashboard / UniversityDash / Employer│
│  /issue        → IssueDegree  [university only]                        │
│  /verify       → VerifyDegree [employer only]                          │
│  /logs         → TransactionLogs (audit table) [university, admin]     │
│  /reports      → Reports (recharts: line, pie, bar) [admin]            │
│  /admin        → AdminPanel (user mgmt + role grants) [admin]         │
│                                                                         │
│  axiosClient.js — injects JWT Bearer token on every request            │
│  PrivateRoute  — redirects unauthenticated / wrong-role users          │
└────────────────────────────┬────────────────────────────────────────────┘
                             │  HTTPS/JSON (Axios)
                             │  Authorization: Bearer <JWT>
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND API LAYER                               │
│                    Express.js 4 · Node.js 20 LTS                       │
│                        http://localhost:4000                            │
│                                                                         │
│  Middleware stack (in order):                                           │
│    cors() → express.json() → morgan (HTTP log) → routes → errorHandler │
│                                                                         │
│  Routes:                                                                │
│    POST /api/auth/login|register   GET /api/auth/me                   │
│    POST /api/degrees/issue         (university — issues on-chain)      │
│    POST /api/degrees/verify        (employer — verifies on-chain)      │
│    GET  /api/degrees               (list, admin/university)             │
│    GET  /api/degrees/:hash         (details, any auth)                 │
│    POST /api/degrees/:hash/revoke  (university — revokes on-chain)     │
│    POST /api/admin/grant-*         (admin — grants on-chain RBAC role) │
│    GET  /api/admin/users                                                │
│    GET  /api/reports/summary|audit|degrees-over-time                   │
│                                                                         │
│  Security layers:                                                       │
│    1. requireAuth(roles)   — verifies JWT, checks role, logs 403s     │
│    2. validate(rules)      — express-validator (422 on bad input)      │
│    3. On-chain role recheck — hasUniversityRole() / hasEmployerRole()  │
│       called in every mutating controller (belt-and-suspenders)        │
│                                                                         │
│  auditLogger.js — synchronous appendFileSync to backend/logs/audit.log │
└──────┬──────────────────────────────────────────┬───────────────────────┘
       │                                          │
       │  ethers.js v6                            │  Mongoose / MongoDB driver
       │  JsonRpcProvider                         │
       ▼                                          ▼
┌─────────────────────────┐          ┌────────────────────────────────────┐
│  ETHEREUM PRIVATE CHAIN │          │            MONGODB                 │
│   Hardhat Network       │          │   mongodb://127.0.0.1:27017        │
│   chainId 1337          │          │   DB: degree_attestation           │
│   http://127.0.0.1:8545 │          │                                    │
│                         │          │  Collections:                      │
│  DegreeContract.sol     │          │    users     — accounts (bcrypt)   │
│  ─────────────────────  │          │    degrees   — metadata + PII enc  │
│  issueDegree()          │          │    auditlogs — event mirror        │
│  verifyDegree()         │          │                                    │
│  revokeDegree()         │          │  PII fields (nationalIdEnc, dobEnc,│
│  getDegreeDetails()     │          │  gpaEnc) — AES-256-GCM encrypted  │
│  grantUniversityRole()  │          │  with iv:authTag:ciphertext format │
│  grantEmployerRole()    │          │                                    │
│                         │◄────────►│  eventListener.js subscribes to   │
│  Events emitted:        │  events  │  on-chain events and mirrors them  │
│    DegreeIssued         │          │  to AuditLog collection            │
│    DegreeVerified       │          └────────────────────────────────────┘
│    DegreeRevoked        │
│    RoleGranted (OZ)     │
└─────────────────────────┘
```

---

## On-Chain vs Off-Chain Data Split

This split is the core privacy design decision.

### Stored ON the blockchain (public, permanent, immutable)

| Data | Reason |
|---|---|
| `degreeHash` (bytes32) | The primary key — a keccak256 commitment, reveals no PII |
| `studentName` | Non-sensitive display field; needed for human-readable degree |
| `studentId` | Non-sensitive university registration number (e.g. IU-2024-001) |
| `program` | e.g. "BSCS" — not PII |
| `graduationDate` | Unix timestamp — not PII |
| `issuingUniversity` | Wallet address of issuing institution |
| `issueTimestamp` | Block timestamp |
| `revoked` | Boolean flag — essential for verification queries |

### Stored OFF the blockchain (MongoDB, encrypted)

| Data | Protection | Reason |
|---|---|---|
| `nationalId` | AES-256-GCM encrypted at rest | PII — identity document number |
| `dateOfBirth` | AES-256-GCM encrypted at rest | PII |
| `GPA` | AES-256-GCM encrypted at rest | Sensitive academic record |
| `passwordHash` | bcrypt (cost factor 12) | User account security |
| `walletAddress` | Stored plaintext (not PII) | Needed for on-chain role checks |

**Encryption scheme:** AES-256-GCM with a random 12-byte IV per record.  
Format stored: `<iv_hex>:<authTag_hex>:<ciphertext_hex>`  
Key source: `ENCRYPTION_KEY` env var (64 hex chars = 32 bytes)

---

## RBAC (Role-Based Access Control) Flow

### Two-layer enforcement

```
HTTP Request
     │
     ▼
requireAuth(["university"])          ← Layer 1: JWT payload role check
     │                                  Returns 403 if wrong role.
     │                                  Logs UNAUTHORIZED_ACCESS to MongoDB.
     ▼
Controller (e.g. issueDegree)
     │
     ├─► hasUniversityRole(walletAddress)   ← Layer 2: Live on-chain re-check
     │        (contractService.js)            via contract.hasRole(UNIVERSITY_ROLE, addr)
     │        Returns 403 if not on-chain     Defence-in-depth: catches cases where
     │                                        JWT is valid but role was revoked on-chain
     ▼
contract.issueDegree(...)            ← Layer 3: Solidity onlyRole(UNIVERSITY_ROLE)
     │                                  Reverts with custom error if role missing.
     ▼
DegreeIssued event emitted
     │
     ├─► auditLogger.writeEntry()     ← File log: backend/logs/audit.log
     └─► eventListener → AuditLog.create()  ← MongoDB mirror
```

### Roles defined

| Role | Assigned to | On-chain? | Permissions |
|---|---|---|---|
| `DEFAULT_ADMIN_ROLE` | Contract deployer only | ✅ | Grant/revoke `ADMIN_ROLE` |
| `ADMIN_ROLE` | System administrator | ✅ | Grant/revoke `UNIVERSITY_ROLE` and `EMPLOYER_ROLE` |
| `UNIVERSITY_ROLE` | University staff wallets | ✅ | `issueDegree()` and `revokeDegree()` on their own degrees |
| `EMPLOYER_ROLE` | Employer / verifier wallets | ✅ | Off-chain JWT gate only; `verifyDegree()` is public |
| `admin` (JWT) | Admin user in MongoDB | ❌ | Backend API: user mgmt, reports, role grants |
| `university` (JWT) | University user in MongoDB | ❌ | Backend API: issue, list, revoke, logs |
| `employer` (JWT) | Employer user in MongoDB | ❌ | Backend API: verify only |

---

## Data Flow — Issue Degree

```
1. University fills form in /issue page
2. Frontend POST /api/degrees/issue  {studentName, studentId, program,
                                       graduationDate, nationalId, privateKey}
3. Backend: requireAuth(["university"]) verifies JWT
4. Backend: validate(issueRules) rejects malformed input (422)
5. Backend: hasUniversityRole(walletAddress) re-checks on-chain
6. contractService.issueDegree():
   a. staticCall → gets degreeHash the contract will compute (no gas)
   b. sends real tx → DegreeIssued event mined → receipt returned
7. Degree.create() in MongoDB:
      degreeHash (plaintext), studentName, studentId, program (plaintext)
      nationalIdEnc = AES-256-GCM(nationalId)  ← PII encrypted
8. auditLogger.writeEntry(DEGREE_ISSUED, SUCCESS, txTimeMs)
9. eventListener catches DegreeIssued → AuditLog.create(DEGREE_ISSUED)
10. Response: { degree, txHash, txTimeMs }
11. Frontend shows success toast + degreeHash
```

## Data Flow — Verify Degree

```
1. Employer enters degreeHash in /verify page
2. Frontend POST /api/degrees/verify  {degreeHash, privateKey}
3. Backend: requireAuth(["employer"]) verifies JWT
4. Backend: validate(verifyRules) rejects malformed hash (422)
5. Backend: hasEmployerRole(walletAddress) re-checks on-chain
6. contractService.verifyDegree():
   a. staticCall → reads (exists, valid, revoked) atomically
   b. sends real tx → DegreeVerified event mined (fraud logged even for fake hashes)
7. Derive status enum:
      exists=false  → "INVALID"  (fraud attempt — hash never registered)
      revoked=true  → "REVOKED"
      else          → "VALID"
8. If exists: getDegreeDetails() fetches full on-chain struct
9. auditLogger.writeEntry(FRAUD_DETECTED or DEGREE_VERIFIED)
10. eventListener catches DegreeVerified → AuditLog.create()
11. Response: { status, degreeHash, issuingUniversity, program, txHash, txTimeMs, fraudDetected }
12. Frontend renders Badge: VALID (green) / INVALID (red) / REVOKED (amber)
```

---

## Diagram Rendering Suggestion

To render this as a visual for your report:

**Option A — draw.io (free, recommended):**
1. Go to https://app.diagrams.net
2. Use the "Layered" or "Architecture" template
3. Place boxes top-to-bottom: Actors → Frontend → Backend API → (Blockchain + MongoDB side by side)
4. Use blue for on-chain, green for MongoDB, orange for frontend, gray for actors
5. Arrows: solid for HTTP calls, dashed for events

**Option B — Mermaid (code-based):**
Paste the flow descriptions above into the Mermaid live editor at https://mermaid.live

**Option C — Lucidchart:**
Import the text blocks as shapes using the "Import from CSV" feature.
