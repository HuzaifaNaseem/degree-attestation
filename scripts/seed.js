/**
 * seed.js
 * Runs the CCP simulation scenario on the already-deployed contract:
 *
 *   2 universities, 3 students, 2 employers
 *   5 digital degrees issued
 *   3 degree verifications
 *   1 fake degree attempt (fraud detection)
 *
 * Reads deployments.json for contract address.
 * Uses ethers v6 — no ethers.utils.*, no .deployed().
 *
 * Usage (after `hardhat node` + `deploy.js`):
 *   node scripts/seed.js
 */
require("dotenv").config();
const { ethers } = require("ethers");
const fs          = require("fs");
const path        = require("path");

// ── Load deployment info ──────────────────────────────────────────────────────

const deployments = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "deployments.json"), "utf8")
);
const CONTRACT_ADDRESS = deployments.contractAddress;

// ── Load ABI from Hardhat artifact ───────────────────────────────────────────

const artifact = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", "artifacts", "contracts", "DegreeAttestation.sol", "DegreeAttestation.json"),
    "utf8"
  )
);
const ABI = artifact.abi;

// ── Provider + signers (Hardhat local node accounts) ─────────────────────────

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://127.0.0.1:8545");

// Hardhat deterministic private keys (accounts 0-4)
const PRIVATE_KEYS = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // account 0 — deployer/admin
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", // account 1 — university1
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", // account 2 — university2
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", // account 3 — employer1
  "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926b", // account 4 — employer2
];

const [admin, university1, university2, employer1, employer2] =
  PRIVATE_KEYS.map((pk) => new ethers.Wallet(pk, provider));

// ── Hash helper (matches testFixtures.js logic) ───────────────────────────────

function makeDegreeHash({ nationalId, studentName, program, graduationDate, universityAddress, nonce }) {
  return ethers.keccak256(
    ethers.toUtf8Bytes(
      `${nationalId}:${studentName}:${program}:${graduationDate}:${universityAddress}:${nonce}`
    )
  );
}

// ── Main simulation ───────────────────────────────────────────────────────────

async function main() {
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, admin);

  // Verify the contract is live
  const code = await provider.getCode(CONTRACT_ADDRESS);
  if (code === "0x") {
    throw new Error(`No contract found at ${CONTRACT_ADDRESS}. Run deploy.js first.`);
  }

  console.log("\n═══════════════════════════════════════════════");
  console.log(" CCP SIMULATION — Degree Attestation System");
  console.log("═══════════════════════════════════════════════\n");

  // ── Step 1: Grant roles ───────────────────────────────────────────────────

  console.log("── Step 1: Granting roles ──");

  const UNIVERSITY_ROLE = await contract.UNIVERSITY_ROLE();
  const EMPLOYER_ROLE   = await contract.EMPLOYER_ROLE();

  // Idempotent: skip if already granted
  if (!(await contract.hasRole(UNIVERSITY_ROLE, university1.address))) {
    await (await contract.grantUniversityRole(university1.address)).wait();
    console.log("  UNIVERSITY_ROLE granted → University 1:", university1.address);
  } else {
    console.log("  UNIVERSITY_ROLE already set for University 1");
  }

  if (!(await contract.hasRole(UNIVERSITY_ROLE, university2.address))) {
    await (await contract.grantUniversityRole(university2.address)).wait();
    console.log("  UNIVERSITY_ROLE granted → University 2:", university2.address);
  } else {
    console.log("  UNIVERSITY_ROLE already set for University 2");
  }

  if (!(await contract.hasRole(EMPLOYER_ROLE, employer1.address))) {
    await (await contract.grantEmployerRole(employer1.address)).wait();
    console.log("  EMPLOYER_ROLE granted → Employer 1:", employer1.address);
  } else {
    console.log("  EMPLOYER_ROLE already set for Employer 1");
  }

  if (!(await contract.hasRole(EMPLOYER_ROLE, employer2.address))) {
    await (await contract.grantEmployerRole(employer2.address)).wait();
    console.log("  EMPLOYER_ROLE granted → Employer 2:", employer2.address);
  } else {
    console.log("  EMPLOYER_ROLE already set for Employer 2");
  }

  // ── Step 2: Issue 5 degrees ───────────────────────────────────────────────

  console.log("\n── Step 2: Issuing 5 degrees ──");

  const now = Math.floor(Date.now() / 1000);

  const degrees = [
    // University 1 → Students 1, 2, 3
    { studentName: "Ali Hassan",   program: "BSCS", nationalId: "42101-1234567-1", nonce: "u1-s1-001", graduationDate: now - 86400 * 30,  university: university1 },
    { studentName: "Sara Khan",    program: "BSCE", nationalId: "42101-7654321-2", nonce: "u1-s2-002", graduationDate: now - 86400 * 60,  university: university1 },
    { studentName: "Umar Farooq", program: "BSIT", nationalId: "42101-1111111-3", nonce: "u1-s3-003", graduationDate: now - 86400 * 90,  university: university1 },
    // University 2 → Students 2, 4
    { studentName: "Sara Khan",   program: "MBA",  nationalId: "42101-7654321-2", nonce: "u2-s2-004", graduationDate: now - 86400 * 10,  university: university2 },
    { studentName: "Nadia Malik", program: "BSEE", nationalId: "42101-2222222-4", nonce: "u2-s4-005", graduationDate: now - 86400 * 20,  university: university2 },
  ];

  for (const d of degrees) {
    d.hash = makeDegreeHash({
      nationalId:        d.nationalId,
      studentName:       d.studentName,
      program:           d.program,
      graduationDate:    d.graduationDate,
      universityAddress: d.university.address,
      nonce:             d.nonce,
    });

    const tx = await contract.connect(d.university).issueDegree(
      d.hash, d.studentName, d.program, d.graduationDate
    );
    const receipt = await tx.wait();
    console.log(`  ✓ Issued: ${d.studentName} (${d.program}) | hash: ${d.hash.slice(0, 18)}... | tx: ${receipt.hash.slice(0, 18)}...`);
  }

  // ── Step 3: Verify 3 degrees ──────────────────────────────────────────────

  console.log("\n── Step 3: Verifying 3 degrees ──");

  for (const d of degrees.slice(0, 3)) {
    const tx = await contract.connect(employer1).verifyDegree(d.hash);
    await tx.wait();
    // Use staticCall to read return values
    const result = await contract.connect(employer1).verifyDegree.staticCall(d.hash);
    console.log(`  ✓ Verified: ${d.studentName} (${d.program}) | valid: ${result.exists && !result.isRevoked}`);
  }

  // ── Step 4: Fake degree attempt ───────────────────────────────────────────

  console.log("\n── Step 4: FRAUD DETECTION — fake degree attempt ──");

  const fakeHash = makeDegreeHash({
    nationalId:        "FAKE-99999",
    studentName:       "Impostor Student",
    program:           "BSCS",
    graduationDate:    now,
    universityAddress: ethers.ZeroAddress,
    nonce:             "fraud-simulation-001",
  });

  const fakeTx = await contract.connect(employer2).verifyDegree(fakeHash);
  const fakeReceipt = await fakeTx.wait();

  // Parse the DegreeVerified event from the receipt
  const iface = new ethers.Interface(ABI);
  const fakeLog = fakeReceipt.logs
    .map((log) => { try { return iface.parseLog(log); } catch { return null; } })
    .find((e) => e && e.name === "DegreeVerified");

  console.log(`  ✗ Fake hash attempted: ${fakeHash.slice(0, 18)}...`);
  console.log(`    DegreeVerified event: isValid=${fakeLog?.args?.isValid}, isRevoked=${fakeLog?.args?.isRevoked}`);
  console.log(`    SYSTEM DETECTED FRAUD — degree does not exist on-chain`);

  // ── Step 5: Summary ───────────────────────────────────────────────────────

  console.log("\n── Step 5: Summary ──");
  const total = await contract.getTotalIssued();
  console.log(`  Total degrees on-chain: ${total}`);

  // Save hashes for backend integration
  const seedData = {
    contractAddress: CONTRACT_ADDRESS,
    roles: {
      admin:       admin.address,
      university1: university1.address,
      university2: university2.address,
      employer1:   employer1.address,
      employer2:   employer2.address,
    },
    degrees: degrees.map(({ hash, studentName, program, graduationDate, university }) => ({
      hash, studentName, program, graduationDate, university: university.address,
    })),
    fakeHash,
  };

  fs.writeFileSync(
    path.join(__dirname, "..", "seed-data.json"),
    JSON.stringify(seedData, null, 2)
  );
  console.log("\n  Seed data written to seed-data.json");
  console.log("\n═══════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
