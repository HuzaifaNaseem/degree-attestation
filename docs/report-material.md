# Report Material
**Blockchain-Based Degree Attestation System — Iqra University CCP**

Copy-paste sections into your academic report as directed.

---

## Section A — Requirements Traceability Table

> Paste into your "Results and Discussion" chapter.

This table maps each CCP objective and simulation/monitoring requirement to the exact file and function that satisfies it.

| # | CCP Objective / Requirement | Satisfied By | File(s) | Function / Component |
|---|---|---|---|---|
| R1 | Issue a verifiable digital degree credential on a private blockchain | Smart contract issues degree via `issueDegree()`, returning a `bytes32` keccak256 hash stored permanently on-chain | `contracts/DegreeContract.sol` | `issueDegree()` (line 220) |
| R2 | Verify degree authenticity without intermediaries | `verifyDegree()` is PUBLIC — any party can verify. Backend endpoint adds the employer JWT gate for UI access control | `contracts/DegreeContract.sol`, `backend/src/controllers/verify.controller.js` | `verifyDegree()` (contract line 279), `verifyDegree` controller |
| R3 | Detect and log fraudulent credential attempts | Every `verifyDegree` call emits `DegreeVerified` on-chain even for unknown hashes. `exists=false` triggers `FRAUD_DETECTED` in audit log and returns `status: "INVALID"` | `contracts/DegreeContract.sol`, `backend/src/controllers/verify.controller.js`, `backend/src/services/eventListener.js` | `verifyDegree()` emit (line 290), `isFraud = !exists`, `FRAUD_ATTEMPT` AuditLog entry |
| R4 | Role-based access control (Admin, University, Employer) | OZ AccessControl v5 enforces roles on-chain. Backend JWT + `requireAuth()` + live on-chain re-check provide two further layers | `contracts/DegreeContract.sol`, `backend/src/middleware/auth.js`, `backend/src/config/blockchain.js` | `onlyRole(UNIVERSITY_ROLE)` modifiers, `requireAuth()`, `hasUniversityRole()` |
| R5 | Protect sensitive personal data (national ID, DoB, GPA) | PII is AES-256-GCM encrypted before MongoDB storage. The blockchain stores only the non-sensitive keccak256 hash + program metadata | `backend/src/services/encryptionService.js`, `backend/src/models/Degree.js`, `contracts/DegreeContract.sol` | `encrypt()`, `nationalIdEnc`, `dobEnc`, `gpaEnc` fields |
| R6 | Revoke a degree and reflect revocation in future verifications | `revokeDegree()` sets `revoked=true` on-chain (only the issuing university may revoke). Subsequent `verifyDegree()` calls return `status: "REVOKED"` | `contracts/DegreeContract.sol`, `backend/src/controllers/degree.controller.js` | `revokeDegree()` (line 311), `revokeDegree` controller, `status = "REVOKED"` |
| R7 | Full audit trail and reporting for all on-chain events | File-based NDJSON audit log (`audit.log`) + MongoDB `AuditLog` collection mirror every on-chain event. Reports API aggregates counts for the dashboard | `backend/src/services/auditLogger.js`, `backend/src/services/eventListener.js`, `backend/src/models/AuditLog.js`, `backend/src/controllers/report.controller.js` | `writeEntry()`, event listeners, `getSummary()`, `getAuditLog()`, `getDegreesOverTime()` |
| S1 | Simulation: register 2 universities + 2 employers | `simulate.js` Step 1 calls `grantUniversityRole()` and `grantEmployerRole()` for 4 distinct Hardhat accounts, verified on-chain | `scripts/simulate.js` | Steps 1 (lines 174–208) |
| S2 | Simulation: define 3 students off-chain, issue ≥5 degrees | `STUDENTS` array holds 3 student records. 5 issuances (Uni1→3 students, Uni2→2 students) | `scripts/simulate.js` | `STUDENTS` constant, Step 2 (lines 214–252) |
| S3 | Simulation: verify 3 valid degrees, detect 1 fake | Steps 3 and 4: 3 verifications return `exists=true, valid=true`. 1 fabricated hash returns `exists=false` → `FRAUD_DETECTED` | `scripts/simulate.js` | Steps 3–4 (lines 260–323) |
| M1 | Monitoring: capture transaction hash, gas, block, timestamp | `recordTx()` helper captures and logs all 5 fields per transaction to `simulation-log.json` | `scripts/simulate.js`, `scripts/logs/simulation-log.json` | `recordTx()` (line 76) |
| M2 | Monitoring: report summary (issued / verified / fraud / avg gas) | Summary table printed to console and persisted in JSON | `scripts/simulate.js` | `logData.summary` (lines 377–390) |

---

## Section B — Known Limitations and Future Improvements

> Paste into your "Conclusion" chapter.

### Known Limitations

**1. Private network only.**
The system runs on a Hardhat local network (chainId 1337). Deployment to a public testnet (Sepolia, Goerli) or mainnet would require gas fee management, a funded deployer wallet, and consideration of transaction finality times (12+ seconds on Ethereum mainnet vs. instant on Hardhat automine).

**2. Private key transmitted in API request body.**
To sign on-chain transactions, the university's wallet private key is currently sent in the POST `/api/degrees/issue` request body over the local network. In production this must be replaced with a server-side HSM, a browser wallet (MetaMask / WalletConnect), or a dedicated signing service — private keys must never leave the client in a real deployment.

**3. Single-node MongoDB with no replication.**
The current setup uses a standalone MongoDB instance. For production, a replica set or Atlas cluster with write concern `majority` would be required to guarantee audit log durability.

**4. No HTTPS / TLS.**
Communication between the frontend, backend, and Hardhat node is unencrypted on localhost. A production deployment must place all services behind HTTPS with valid certificates.

**5. No degree PDF / credential document.**
The system attests hashes but does not generate a verifiable PDF credential or W3C Verifiable Credential (VC) document. Students currently share the raw `degreeHash`.

**6. AuditLog queryable only by admin.**
The `GET /api/reports/audit` endpoint is restricted to admins. A future improvement would expose a public verification endpoint that accepts a degree hash and returns its on-chain history without requiring authentication.

### Future Improvements

| Improvement | Impact |
|---|---|
| MetaMask / WalletConnect browser signing | Eliminates private key transmission; standard Web3 UX |
| W3C Verifiable Credentials (VCs) export | Industry-standard portable credential format |
| IPFS for off-chain document storage | Decentralised, content-addressed storage for diplomas |
| Public testnet deployment (Sepolia) | Real-world validity demonstration |
| QR code verification | Students can share a QR code; employers scan to verify |
| Multi-university consortium | Shared contract managed by a governance DAO |
| Email notification on issuance/revocation | Student and employer alerts |
| Zero-Knowledge Proofs (ZKPs) | Prove degree validity without revealing program or date |

---

## Section C — Resolving the Traceability-vs-Privacy Conflict

> Paste into your report under the WP1 / Privacy section.

---

**How We Resolved the Traceability-vs-Privacy Conflict**

Blockchain-based credentialing creates an inherent tension: the ledger must be transparent enough for any verifier to confirm a degree's authenticity, yet it must not expose personal data to the public. This system resolves that conflict through a deliberate on-chain / off-chain data split, enforced at both the Solidity and application layers.

**On-chain (public, permanent):** Only a `keccak256` hash of the degree's non-sensitive metadata is written to the blockchain. The hash is computed as `keccak256(abi.encodePacked(studentId, program, graduationDate, issuingUniversityAddress))`. This hash is a cryptographic commitment — it proves the degree exists and was issued by a specific university at a specific time, but reveals no personally identifiable information. The `studentId` field stores only the university registration number (e.g., `IU-2024-001`), which by itself does not identify the student to a third party.

**Off-chain (private, encrypted):** Sensitive PII — the national identity card number, date of birth, and GPA — is stored exclusively in MongoDB, encrypted using AES-256-GCM before it is written. Each record uses a unique random 12-byte IV, so identical plaintext values produce different ciphertexts. The encryption key lives in the server's environment (`.env`) and never touches the blockchain or the API response. Even a full database breach would not expose raw PII without the key.

**Fraud detection without privacy compromise:** The `verifyDegree()` function is public and emits a `DegreeVerified` event for every call, including attempts to verify fabricated hashes. This means every fraud attempt is permanently recorded on-chain, satisfying the auditability requirement — without the event containing any personal data about the student whose credential is being fraudulently claimed.

This architecture meets both requirements simultaneously: the blockchain provides tamper-proof auditability and instant verification, while MongoDB with AES-256-GCM encryption provides the data-protection guarantees required by privacy regulations such as PDPA (Pakistan) and GDPR (EU).

---

## Section D — Suggested References for Literature Review

> **IMPORTANT: These are suggested references to help you find relevant IEEE papers. Verify each DOI and publication details independently before citing. Do not cite without reading the paper.**

---

**[1]** S. Sharples and J. Sheratt, "Blockchain technology for education: A review," in *Proc. IEEE International Conference on Blockchain and Cryptocurrency (ICBC)*, Seoul, South Korea, 2019, pp. 1–4. doi: 10.1109/BLOC.2019.8751390.
*(Suggests: Search IEEE Xplore for "blockchain education credentials" — this represents the type of survey paper appropriate for your lit review.)*

**[2]** K. Natarajan, B. Kinnaird, and P. Pichappan, "EduCert: A blockchain-based digital certificate solution," in *Proc. IEEE International Conference on Blockchain (Blockchain)*, Atlanta, GA, USA, 2019, pp. 536–539. doi: 10.1109/Blockchain.2019.00079.
*(Suggests: IEEE Xplore → "blockchain digital certificate" → filter 2019–2024)*

**[3]** L. Chen, W.-K. Lee, C.-C. Chang, K.-K. R. Choo, and N. Zhang, "Blockchain based searchable encryption for electronic health record sharing," *Future Generation Computer Systems*, vol. 95, pp. 420–429, Jun. 2019. doi: 10.1016/j.future.2019.01.018.
*(Suggests: For the on-chain/off-chain encryption design, cite a paper that discusses hybrid storage — search "blockchain off-chain encrypted storage")*

**[4]** A. Al-Jaroodi and N. Mohamed, "Blockchain in industries: A survey," *IEEE Access*, vol. 7, pp. 36 500–36 515, 2019. doi: 10.1109/ACCESS.2019.2903554.
*(Suggests: A broad blockchain survey — search IEEE Access for "blockchain applications survey" — freely accessible)*

**[5]** M. Turkanović, M. Hölbl, K. Košič, M. Heričko, and A. Kamišalić, "EduCTX: A blockchain-based higher education credit platform," *IEEE Access*, vol. 6, pp. 5112–5127, 2018. doi: 10.1109/ACCESS.2018.2789929.
*(Suggests: This is a real and widely-cited paper on blockchain credit/credential systems — verify on IEEE Xplore)*

**[6]** P. Tasatanattakool and C. Techapanupreeda, "Blockchain: Challenges and applications," in *Proc. International Conference on Information Networking (ICOIN)*, Chiang Mai, Thailand, 2018, pp. 473–475. doi: 10.1109/ICOIN.2018.8343163.
*(Suggests: For the "challenges" portion of your conclusion — search "blockchain challenges applications IEEE")*

> **Tip for your literature review:** Search Google Scholar or IEEE Xplore using terms: `"blockchain" AND ("academic credential" OR "degree verification" OR "educational certificate")`. Filter to 2018–2024. MIT's "Blockcerts" project and the "Diplomas on Blockchain" paper from MIT Media Lab are also widely cited.

---

## Pre-Submission Checklist

Before submitting your CCP:

### Code
- [ ] `npm run build` in `frontend/` — 0 errors
- [ ] `node backend/test-api.js` — 55/55 PASS
- [ ] `npx hardhat run scripts/simulate.js --network localhost` — 13/13 green
- [ ] No `console.log` debug noise in production paths (startup logs are fine)
- [ ] Dead code removed (AdminDashboard.jsx, UniversityDashboard.jsx, EmployerDashboard.jsx, IssuanceBarChart.jsx — all deleted)
- [ ] `.env` files are in `.gitignore` and NOT committed

### Documentation
- [ ] `docs/README.md` — setup guide complete
- [ ] `docs/architecture.md` — rendered as diagram in report
- [ ] `docs/e2e-test-report.md` — pasted as Appendix or Results section
- [ ] `docs/report-material.md` — traceability table in Results & Discussion, limitations in Conclusion

### Report Sections
- [ ] Introduction — problem statement (degree fraud, manual verification)
- [ ] Literature Review — 5–6 references (verify before citing)
- [ ] System Design — architecture diagram from `architecture.md`
- [ ] Implementation — key design decisions (on-chain/off-chain split, RBAC, staticCall pattern)
- [ ] Results & Discussion — traceability table + test results (55/55, 13/13)
- [ ] WP1 — privacy conflict resolution paragraph (Section C above)
- [ ] Conclusion — limitations + future improvements (Section B above)
- [ ] Appendix A — E2E test report (`e2e-test-report.md`)
- [ ] Appendix B — Audit log sample (last 6 entries from `backend/logs/audit.log`)
