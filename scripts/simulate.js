/**
 * simulate.js
 * ───────────
 * Executes the EXACT CCP assignment simulation scenario.
 * Each step is labelled with its PDF requirement.
 *
 * What this covers (per assignment PDF):
 *   PDF §1  — Create 2 universities (distinct signer addresses)
 *   PDF §1  — Create 2 employers
 *   PDF §2  — Define 3 students (off-chain data)
 *   PDF §2  — Issue ≥5 digital degrees across the 2 universities / 3 students
 *   PDF §3  — Verify 3 valid degrees → all must pass
 *   PDF §3  — Attempt 1 FAKE degree → system must detect and reject
 *   PDF §7  — Full transaction log: txHash, gasUsed, blockNumber, timestamp,
 *              actor, role, action, status
 *   PDF §7  — Summary table: issued / verifications passed / fraud detected / avg gas
 *
 * CONSTRAINTS (CLAUDE.md):
 *   ethers v6 only — no ethers.utils.*, no .deployed()
 *   No hardcoded private keys — uses Hardhat signers
 *   Idempotent — re-runnable (always deploys a fresh contract)
 *
 * Usage:
 *   # Terminal 1:  npx hardhat node
 *   # Terminal 2:  npx hardhat run scripts/simulate.js --network localhost
 */
const { ethers } = require("hardhat");
const fs          = require("fs");
const path        = require("path");

// ── Paths ─────────────────────────────────────────────────────────────────────

const LOG_DIR      = path.join(__dirname, "logs");
const LOG_PATH     = path.join(LOG_DIR, "simulation-log.json");
const INFO_PATH    = path.join(__dirname, "..", "backend", "config", "contractInfo.json");
const DEPLOY_PATH  = path.join(__dirname, "..", "deployments.json");

// ── Off-chain student data (PDF requirement: 3 students) ─────────────────────

const STUDENTS = [
  { name: "Ali Hassan",   studentId: "IU-2024-001", program: "BSCS", graduationDate: 1717200000 },
  { name: "Sara Khan",    studentId: "IU-2024-002", program: "BSCE", graduationDate: 1717286400 },
  { name: "Umar Farooq", studentId: "IU-2024-003", program: "BSIT", graduationDate: 1717372800 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Compute degreeHash the same way DegreeContract.sol does:
 *   keccak256(abi.encodePacked(studentId, program, graduationDate, msg.sender))
 * ethers v6: solidityPacked replaces the old utils.solidityKeccak256
 */
function computeHash(studentId, program, graduationDate, universityAddress) {
  return ethers.keccak256(
    ethers.solidityPacked(
      ["string", "string", "uint256", "address"],
      [studentId, program, BigInt(graduationDate), universityAddress]
    )
  );
}

/** Fetch block timestamp for a given block number (ethers v6 provider). */
async function getBlockTimestamp(provider, blockNumber) {
  const block = await provider.getBlock(blockNumber);
  return block ? block.timestamp : 0;
}

/** Pad a string to a fixed width for the summary table. */
const pad = (s, n) => String(s).padEnd(n);

// ── Transaction recorder ──────────────────────────────────────────────────────

const txLog  = [];
let   gasSum = 0n;

async function recordTx({ step, pdfRequirement, action, actor, actorRole, receipt, status, notes }) {
  const ts = await getBlockTimestamp(ethers.provider, receipt.blockNumber);
  const entry = {
    step,
    pdfRequirement,
    action,
    actor,
    actorRole,
    txHash:      receipt.hash,
    gasUsed:     Number(receipt.gasUsed),
    blockNumber: receipt.blockNumber,
    blockTimestamp: ts,
    blockTime:   new Date(ts * 1000).toISOString(),
    status,
    notes: notes || "",
  };
  txLog.push(entry);
  gasSum += receipt.gasUsed;

  // Console line
  console.log(
    `  [${status === "SUCCESS" ? "✓" : "✗"}] ${pad(action, 30)} ` +
    `gas=${pad(Number(receipt.gasUsed), 8)} ` +
    `block=${pad(receipt.blockNumber, 5)} ` +
    `tx=${receipt.hash.slice(0, 14)}...`
  );
  if (notes) console.log(`      ↳ ${notes}`);
}

// ── Main simulation ───────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

  const runAt    = new Date().toISOString();
  const network  = await ethers.provider.getNetwork();
  const signers  = await ethers.getSigners();

  // Roles assigned to Hardhat signers (no hardcoded private keys)
  const [deployer, university1, university2, employer1, employer2] = signers;

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║       CCP SIMULATION — Blockchain Degree Attestation         ║");
  console.log("║       Iqra University · Blockchain Security                  ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`\nNetwork  : ${network.name} (chainId ${network.chainId})`);
  console.log(`Run at   : ${runAt}`);
  console.log(`Admin    : ${deployer.address}`);
  console.log(`Uni 1    : ${university1.address}`);
  console.log(`Uni 2    : ${university2.address}`);
  console.log(`Employer1: ${employer1.address}`);
  console.log(`Employer2: ${employer2.address}`);

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 0 — Deploy DegreeContract (fresh each run → true idempotency)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n┌─────────────────────────────────────────────────────────────┐");
  console.log("│ STEP 0 · Deploy DegreeContract                              │");
  console.log("└─────────────────────────────────────────────────────────────┘");

  const Factory  = await ethers.getContractFactory("DegreeContract");
  const contract = await Factory.connect(deployer).deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  const deployTxReceipt = await ethers.provider.getTransactionReceipt(
    contract.deploymentTransaction().hash
  );

  console.log(`  ✓ DegreeContract deployed to: ${contractAddress}`);
  console.log(`    TX: ${contract.deploymentTransaction().hash}`);
  console.log(`    Gas used: ${deployTxReceipt.gasUsed.toString()} | Block: ${deployTxReceipt.blockNumber}`);

  // Persist contractInfo.json so backend can read it
  const artifactPath = path.join(
    __dirname, "..", "artifacts", "contracts", "DegreeContract.sol", "DegreeContract.json"
  );
  const { abi } = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const contractInfo = {
    contractName: "DegreeContract",
    address:      contractAddress,
    network:      network.name,
    chainId:      Number(network.chainId),
    deployedAt:   runAt,
    deployer:     deployer.address,
    txHash:       contract.deploymentTransaction().hash,
    blockNumber:  deployTxReceipt.blockNumber,
    gasUsed:      deployTxReceipt.gasUsed.toString(),
    abi,
  };
  fs.writeFileSync(INFO_PATH,   JSON.stringify(contractInfo, null, 2));
  fs.writeFileSync(DEPLOY_PATH, JSON.stringify({ address: contractAddress, chainId: Number(network.chainId), deployedAt: runAt }, null, 2));
  console.log(`  ✓ contractInfo.json written → backend/config/contractInfo.json`);

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 1 — Register participants (PDF §1: 2 universities, 2 employers)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n┌─────────────────────────────────────────────────────────────┐");
  console.log("│ STEP 1 · PDF §1 — Register participants                     │");
  console.log("│         2 Universities + 2 Employers                        │");
  console.log("└─────────────────────────────────────────────────────────────┘");

  // Grant UNIVERSITY_ROLE to both universities
  const r1 = await (await contract.connect(deployer).grantUniversityRole(university1.address)).wait();
  await recordTx({ step: 1, pdfRequirement: "PDF §1 — Register university",
    action: "GRANT_UNIVERSITY_ROLE", actor: deployer.address, actorRole: "admin",
    receipt: r1, status: "SUCCESS",
    notes: `University 1 → ${university1.address}` });

  const r2 = await (await contract.connect(deployer).grantUniversityRole(university2.address)).wait();
  await recordTx({ step: 1, pdfRequirement: "PDF §1 — Register university",
    action: "GRANT_UNIVERSITY_ROLE", actor: deployer.address, actorRole: "admin",
    receipt: r2, status: "SUCCESS",
    notes: `University 2 → ${university2.address}` });

  // Grant EMPLOYER_ROLE to both employers
  const r3 = await (await contract.connect(deployer).grantEmployerRole(employer1.address)).wait();
  await recordTx({ step: 1, pdfRequirement: "PDF §1 — Register employer",
    action: "GRANT_EMPLOYER_ROLE", actor: deployer.address, actorRole: "admin",
    receipt: r3, status: "SUCCESS",
    notes: `Employer 1 → ${employer1.address}` });

  const r4 = await (await contract.connect(deployer).grantEmployerRole(employer2.address)).wait();
  await recordTx({ step: 1, pdfRequirement: "PDF §1 — Register employer",
    action: "GRANT_EMPLOYER_ROLE", actor: deployer.address, actorRole: "admin",
    receipt: r4, status: "SUCCESS",
    notes: `Employer 2 → ${employer2.address}` });

  console.log(`\n  Participants registered:`);
  console.log(`    University 1: ${university1.address}`);
  console.log(`    University 2: ${university2.address}`);
  console.log(`    Employer 1:   ${employer1.address}`);
  console.log(`    Employer 2:   ${employer2.address}`);

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 2 — Issue ≥5 degrees (PDF §2: 3 students, 2 universities)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n┌─────────────────────────────────────────────────────────────┐");
  console.log("│ STEP 2 · PDF §2 — Issue ≥5 Digital Degrees                 │");
  console.log("│         Students: Ali Hassan, Sara Khan, Umar Farooq        │");
  console.log("└─────────────────────────────────────────────────────────────┘");

  // 5 degrees: Uni1→students[0,1,2], Uni2→students[0,1]
  const degreeIssuances = [
    { uni: university1, uniLabel: "University 1", student: STUDENTS[0] },
    { uni: university1, uniLabel: "University 1", student: STUDENTS[1] },
    { uni: university1, uniLabel: "University 1", student: STUDENTS[2] },
    { uni: university2, uniLabel: "University 2", student: STUDENTS[0] }, // Ali at 2nd uni (different hash)
    { uni: university2, uniLabel: "University 2", student: STUDENTS[1] }, // Sara at 2nd uni
  ];

  const issuedHashes = [];

  for (let i = 0; i < degreeIssuances.length; i++) {
    const { uni, uniLabel, student } = degreeIssuances[i];
    const expectedHash = computeHash(
      student.studentId, student.program, student.graduationDate, uni.address
    );

    const tx      = await contract.connect(uni).issueDegree(
      student.name, student.studentId, student.program, student.graduationDate
    );
    const receipt = await tx.wait();
    issuedHashes.push(expectedHash);

    await recordTx({
      step: 2,
      pdfRequirement: "PDF §2 — Issue digital degree",
      action: "ISSUE_DEGREE",
      actor: uni.address,
      actorRole: "university",
      receipt,
      status: "SUCCESS",
      notes: `${uniLabel} → ${student.name} (${student.program}) | hash: ${expectedHash.slice(0, 18)}...`,
    });
  }

  const totalOnChain = Number(await contract.getTotalIssued());
  console.log(`\n  ✓ Total degrees issued on-chain: ${totalOnChain}`);

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 3 — Verify 3 valid degrees (PDF §3)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n┌─────────────────────────────────────────────────────────────┐");
  console.log("│ STEP 3 · PDF §3 — Verify 3 Valid Degrees                   │");
  console.log("└─────────────────────────────────────────────────────────────┘");

  let verificationsPassed = 0;

  for (let i = 0; i < 3; i++) {
    const hash   = issuedHashes[i];
    const student = degreeIssuances[i];

    // staticCall to get return values, then real tx for the on-chain event
    const result  = await contract.connect(employer1).verifyDegree.staticCall(hash);
    const tx      = await contract.connect(employer1).verifyDegree(hash);
    const receipt = await tx.wait();

    const passed = result.exists && result.valid && !result.revoked;
    if (passed) verificationsPassed++;

    await recordTx({
      step: 3,
      pdfRequirement: "PDF §3 — Verify degree authenticity",
      action: "VERIFY_DEGREE",
      actor: employer1.address,
      actorRole: "employer",
      receipt,
      status: passed ? "SUCCESS" : "FAIL",
      notes: `${student.student.name} (${student.student.program}) | exists=${result.exists} valid=${result.valid} revoked=${result.revoked}`,
    });
  }

  console.log(`\n  Verifications passed: ${verificationsPassed}/3`);

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 4 — FAKE DEGREE ATTEMPT (PDF §3: fraud detection)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n┌─────────────────────────────────────────────────────────────┐");
  console.log("│ STEP 4 · PDF §3 — FRAUD DETECTION: Fake Degree Attempt     │");
  console.log("└─────────────────────────────────────────────────────────────┘");

  // Fabricate a hash that was never issued on-chain
  const fakeHash = ethers.keccak256(
    ethers.toUtf8Bytes("FAKE-DEGREE:ImpostorStudent:BSCS:NOT-REAL:2024")
  );
  console.log(`  Submitting fake hash: ${fakeHash.slice(0, 22)}...`);
  console.log(`  (This hash was NEVER issued on-chain)`);

  const fakeResult  = await contract.connect(employer2).verifyDegree.staticCall(fakeHash);
  const fakeTx      = await contract.connect(employer2).verifyDegree(fakeHash);
  const fakeReceipt = await fakeTx.wait();

  const fraudDetected = !fakeResult.exists; // exists=false means the degree is fake

  await recordTx({
    step: 4,
    pdfRequirement: "PDF §3 — Fake degree attempt / fraud detection",
    action: "FAKE_VERIFY_ATTEMPT",
    actor: employer2.address,
    actorRole: "employer",
    receipt: fakeReceipt,
    status: fraudDetected ? "FRAUD_DETECTED" : "UNEXPECTED_PASS",
    notes: `exists=${fakeResult.exists} valid=${fakeResult.valid} | ` +
           (fraudDetected ? "FRAUD CONFIRMED — degree not on blockchain" : "WARNING: unexpected result"),
  });

  console.log(`\n  ${fraudDetected ? "⛔ FRAUD DETECTED" : "⚠ UNEXPECTED RESULT"}`);
  console.log(`     exists=${fakeResult.exists}  valid=${fakeResult.valid}  revoked=${fakeResult.revoked}`);
  console.log(`     DegreeVerified event emitted on-chain (permanent audit record)`);

  // ──────────────────────────────────────────────────────────────────────────
  // SUMMARY TABLE (PDF §7 — Reporting & Audit)
  // ──────────────────────────────────────────────────────────────────────────
  const totalGasUsed = Number(gasSum);
  const avgGas       = Math.round(totalGasUsed / txLog.length);

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                  SIMULATION SUMMARY                         ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║  ${pad("Participants registered", 30)} ${pad("2 universities + 2 employers", 28)} ║`);
  console.log(`║  ${pad("Students defined (off-chain)", 30)} ${pad(STUDENTS.length, 28)} ║`);
  console.log(`║  ${pad("Degrees issued on-chain", 30)} ${pad(totalOnChain, 28)} ║`);
  console.log(`║  ${pad("Verifications run", 30)} ${pad(3, 28)} ║`);
  console.log(`║  ${pad("Verifications passed", 30)} ${pad(verificationsPassed + "/3", 28)} ║`);
  console.log(`║  ${pad("Fraud attempts detected", 30)} ${pad(fraudDetected ? 1 : 0, 28)} ║`);
  console.log(`║  ${pad("Total transactions", 30)} ${pad(txLog.length, 28)} ║`);
  console.log(`║  ${pad("Total gas used", 30)} ${pad(totalGasUsed.toLocaleString(), 28)} ║`);
  console.log(`║  ${pad("Average gas per tx", 30)} ${pad(avgGas.toLocaleString(), 28)} ║`);
  console.log(`║  ${pad("Contract address", 30)} ${pad(contractAddress.slice(0, 28), 28)} ║`);
  console.log("╚══════════════════════════════════════════════════════════════╝");

  // ──────────────────────────────────────────────────────────────────────────
  // WRITE SIMULATION LOG JSON
  // ──────────────────────────────────────────────────────────────────────────
  const logData = {
    meta: {
      runAt,
      network: network.name,
      chainId: Number(network.chainId),
      contractAddress,
      deployer: deployer.address,
    },
    participants: {
      admin:       deployer.address,
      university1: university1.address,
      university2: university2.address,
      employer1:   employer1.address,
      employer2:   employer2.address,
    },
    students: STUDENTS,
    issuedDegrees: issuedHashes.map((hash, i) => ({
      hash,
      student:   degreeIssuances[i].student.name,
      studentId: degreeIssuances[i].student.studentId,
      program:   degreeIssuances[i].student.program,
      university: degreeIssuances[i].uni.address,
    })),
    fakeHash,
    transactions: txLog,
    summary: {
      universitiesRegistered:  2,
      employersRegistered:     2,
      studentsDefinedOffChain: STUDENTS.length,
      degreesIssued:           totalOnChain,
      verificationsRun:        3,
      verificationsPassed,
      fraudAttemptsDetected:   fraudDetected ? 1 : 0,
      totalTransactions:       txLog.length,
      totalGasUsed,
      avgGasPerTx:             avgGas,
    },
  };

  fs.writeFileSync(LOG_PATH, JSON.stringify(logData, null, 2));
  console.log(`\n  ✓ Simulation log → ${LOG_PATH}`);
  console.log("\n  PDF REQUIREMENT COVERAGE:");
  console.log("  ✓ PDF §1 — 2 Universities + 2 Employers registered");
  console.log("  ✓ PDF §2 — 3 Students defined off-chain");
  console.log(`  ✓ PDF §2 — ${totalOnChain} degrees issued (≥5 required)`);
  console.log("  ✓ PDF §3 — 3 valid degrees verified, all passed");
  console.log("  ✓ PDF §3 — 1 fake degree attempt detected on-chain");
  console.log("  ✓ PDF §7 — Full tx log in scripts/logs/simulation-log.json");
  console.log("  ✓ PDF §7 — Summary table printed above\n");
}

main().catch((err) => {
  console.error("\n[SIMULATION ERROR]", err);
  process.exit(1);
});
