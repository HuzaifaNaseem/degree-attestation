# Attestify — Blockchain Credential Attestation Platform
### Final Year Project · BSCS · Iqra University

> **Attestify** is a blockchain-based platform for issuing, verifying, and revoking
> academic credentials. Institutions (e.g., Iqra University) issue tamper-proof
> digital degrees anchored to the Ethereum blockchain; anyone can verify a
> credential's authenticity in seconds — no phone calls, no forgery, no central
> point of trust.

---

## 1. Abstract
Academic certificate fraud is a global problem: paper degrees are easily forged and
slow to verify. Attestify solves this by storing a cryptographic fingerprint
(`keccak256` hash) of each credential on a public blockchain, while keeping all
personal data encrypted off-chain. Verification becomes instant, trustless, and
permanent. The platform is multi-tenant (any institution can onboard) and ships
with issuance, bulk issuance, public + official verification, revocation, fraud
detection, a public transparency explorer, QR-verifiable certificates, role-based
access control, and a complete audit trail.

## 2. Problem Statement
- Forged degrees are hard to detect and damage institutional trust.
- Manual verification (emailing/calling the registrar) is slow and unscalable.
- Centralized databases can be tampered with by insiders.

## 3. Objectives
1. Make every issued credential **tamper-proof** and independently verifiable.
2. Preserve **privacy** — no personal data on the public chain.
3. Provide **instant** verification to employers and the public.
4. Enforce **who can do what** via on-chain role-based access control.
5. Maintain a **complete, append-only audit trail** of every action.

## 4. Scope
**In scope:** degree issuance (single + bulk), public & official verification,
revocation, fraud detection, role management, analytics, audit logs, QR
certificates, public explorer. **Out of scope (future work):** student
self-service portal, email notifications, multi-institution onboarding UI,
mainnet deployment.

## 5. Standards & Related Work
Attestify follows the established pattern for blockchain credentials:
- **Blockcerts** — open standard for blockchain-based certificates (blockcerts.org)
- **W3C Verifiable Credentials Data Model** — the W3C recommendation for
  machine-verifiable credentials
- Peer-reviewed work on QR-based, blockchain-anchored certificate verification
  (e.g., *Scientific Reports*, 2025; QR + dApp verification studies, 2024)

Attestify's design — on-chain hash + off-chain encrypted data + QR deep-link
verification — is directly aligned with these standards.

## 6. System Architecture

```
┌──────────────┐     HTTPS/JWT      ┌──────────────┐    ethers v6     ┌─────────────────┐
│  Frontend    │ ─────────────────► │  Backend     │ ───────────────► │  Smart Contract │
│  React+Vite  │ ◄───────────────── │  Express     │ ◄─────────────── │  (Sepolia)      │
│  (Vercel)    │     JSON            │  (Render)    │   events/reads   │  DegreeContract │
└──────────────┘                    └──────┬───────┘                  └─────────────────┘
                                            │ Mongoose
                                            ▼
                                     ┌──────────────┐
                                     │ MongoDB Atlas│  encrypted PII + audit log
                                     └──────────────┘
```

- **On-chain (public):** credential hash + non-sensitive metadata + events.
- **Off-chain (private):** national ID etc., AES-256-GCM encrypted in MongoDB.
- The blockchain is the source of truth for authenticity & revocation state.

## 7. Technology Stack
| Layer | Tech |
|---|---|
| Smart contract | Solidity ^0.8.20, OpenZeppelin AccessControl, custom errors |
| Blockchain | Ethereum **Sepolia** testnet (chainId 11155111) |
| Tooling | Hardhat, ethers.js v6 |
| Backend | Node.js 20, Express, Mongoose, JWT, AES-256-GCM |
| Database | MongoDB Atlas |
| Frontend | React 18, Vite, Tailwind CSS, framer-motion, recharts, qrcode |
| Hosting | Vercel (frontend), Render (backend), Atlas (DB) |

## 8. Roles & Access Control
| Role | Capabilities |
|---|---|
| **Admin** | Register users, grant/revoke on-chain roles, view reports & audit logs |
| **University** | Issue degrees (single + bulk CSV), revoke degrees |
| **Employer** | Official on-chain verification |
| **Public** | No-login verification + transparency explorer |

Every mutating action **re-checks the role on-chain** (the JWT is a convenience
layer, not the source of authority).

## 9. Core Features
1. **Issue Degree** — university signs a tx; contract stores
   `keccak256(studentId ‖ program ‖ graduationDate ‖ issuerWallet)`; PII encrypted off-chain.
2. **Bulk Issuance (CSV)** — upload a CSV of graduates; issues each on-chain with live per-row status.
3. **QR-Verifiable Certificate** — printable diploma with institutional crest, seal,
   and a QR that deep-links to public verification.
4. **Public Verification** — anyone pastes a hash (or scans the QR) → VALID / REVOKED / INVALID, instantly, free, read-only.
5. **Official Verification (Employer)** — writes a permanent on-chain verification event.
6. **Revocation** — issuing university can revoke; future verifications show REVOKED.
7. **Fraud Detection** — verifying an unknown hash is flagged and logged automatically.
8. **Credential Explorer** — public, auto-refreshing transparency page: live counts + on-chain activity feed with Etherscan links.
9. **Reports & Analytics** — issuance trend, verification breakdown, event frequency, summary table.
10. **Audit Trail** — append-only log of every event, mirrored from on-chain.

## 10. Security & Privacy
- **Privacy by design:** only a non-reversible hash + non-sensitive metadata on-chain.
- **AES-256-GCM** encryption for PII (national ID, DOB, GPA) in MongoDB.
- **JWT** authentication; **on-chain role re-validation** on every mutation.
- **Custom Solidity errors** for gas efficiency and clarity.
- **Immutable audit trail** independent of the application database.

## 11. Live Deployment
| Component | URL |
|---|---|
| Live App (Frontend) | _your Vercel URL_ (e.g. `https://degree-attestation.vercel.app`) |
| Backend API | `https://degree-attestation.onrender.com` |
| Smart Contract (Sepolia) | `0x8908E9E42AE522A8012e5CA8A568Aa05deA4625C` |
| Source code | `https://github.com/HuzaifaNaseem/degree-attestation` |
| On-chain proof | `https://sepolia.etherscan.io/address/0x8908E9E42AE522A8012e5CA8A568Aa05deA4625C` |

## 12. Limitations & Future Work
- Deployed on a **testnet** (Sepolia) — production would use a permissioned/L2 chain to control gas.
- **Student self-service portal** and **email notifications** are planned next.
- A full **multi-institution onboarding** flow would complete the SaaS vision.

## 13. References
1. Blockcerts — The Open Standard for Blockchain Credentials. https://www.blockcerts.org/
2. W3C Verifiable Credentials Data Model. https://www.w3.org/TR/vc-data-model/
3. Blockchain ensuring academic integrity: a degree verification prototype. *Scientific Reports*, 2025.
4. Blockchain-based Authentication and Verification of Academic Certificates using QR Code and dApps, 2024.
5. OpenZeppelin Contracts (AccessControl). https://docs.openzeppelin.com/contracts/
6. ethers.js v6 documentation. https://docs.ethers.org/v6/
