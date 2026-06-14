/**
 * testFixtures.js
 * Shared setup helpers for all Hardhat test files.
 * Uses ethers v6 — no ethers.utils.*, no .deployed().
 */
const { ethers } = require("hardhat");

/**
 * Deploy DegreeAttestation and return signers + contract in a consistent layout.
 * Called inside beforeEach / loadFixture so every test starts from clean state.
 */
async function deployFixture() {
  // ethers v6: getSigners() returns an array of HardhatEthersSigner
  const [admin, university1, university2, employer1, employer2, stranger] =
    await ethers.getSigners();

  // ethers v6: getContractFactory + deploy (no .deployed() needed)
  const Factory = await ethers.getContractFactory("DegreeAttestation");
  const contract = await Factory.deploy();

  // Grant roles
  await contract.connect(admin).grantUniversityRole(university1.address);
  await contract.connect(admin).grantUniversityRole(university2.address);
  await contract.connect(admin).grantEmployerRole(employer1.address);
  await contract.connect(admin).grantEmployerRole(employer2.address);

  return { contract, admin, university1, university2, employer1, employer2, stranger };
}

/**
 * Build a deterministic degree hash the same way the backend does:
 *   keccak256(abi.encodePacked(nationalId, studentName, program, graduationDate, universityAddress, nonce))
 *
 * In tests we pass a unique nonce string to avoid collisions.
 */
function makeDegreeHash({ nationalId, studentName, program, graduationDate, universityAddress, nonce }) {
  return ethers.keccak256(
    ethers.toUtf8Bytes(
      `${nationalId}:${studentName}:${program}:${graduationDate}:${universityAddress}:${nonce}`
    )
  );
}

/**
 * Sample degree data matching the CCP simulation scenario.
 * 2 universities, 3 students, 5 degrees.
 */
function sampleDegrees(university1Address, university2Address) {
  const now = Math.floor(Date.now() / 1000);
  return [
    // university1 → 3 degrees
    {
      hash: null, // filled below
      studentName: "Ali Hassan",
      program: "BSCS",
      graduationDate: now - 86400 * 30,
      nationalId: "42101-1234567-1",
      university: university1Address,
      nonce: "u1-s1-001",
    },
    {
      hash: null,
      studentName: "Sara Khan",
      program: "BSCE",
      graduationDate: now - 86400 * 60,
      nationalId: "42101-7654321-2",
      university: university1Address,
      nonce: "u1-s2-002",
    },
    {
      hash: null,
      studentName: "Umar Farooq",
      program: "BSIT",
      graduationDate: now - 86400 * 90,
      nationalId: "42101-1111111-3",
      university: university1Address,
      nonce: "u1-s3-003",
    },
    // university2 → 2 degrees
    {
      hash: null,
      studentName: "Sara Khan",   // same student, different university degree
      program: "MBA",
      graduationDate: now - 86400 * 10,
      nationalId: "42101-7654321-2",
      university: university2Address,
      nonce: "u2-s2-004",
    },
    {
      hash: null,
      studentName: "Nadia Malik",
      program: "BSEE",
      graduationDate: now - 86400 * 20,
      nationalId: "42101-2222222-4",
      university: university2Address,
      nonce: "u2-s4-005",
    },
  ].map((d) => ({
    ...d,
    hash: makeDegreeHash({
      nationalId:       d.nationalId,
      studentName:      d.studentName,
      program:          d.program,
      graduationDate:   d.graduationDate,
      universityAddress: d.university,
      nonce:            d.nonce,
    }),
  }));
}

module.exports = { deployFixture, makeDegreeHash, sampleDegrees };
