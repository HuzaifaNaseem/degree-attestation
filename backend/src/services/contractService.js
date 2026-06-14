/**
 * contractService.js — All ethers v6 interactions with DegreeContract.sol.
 *
 * Key corrections vs the prior version:
 *   1. issueDegree — contract computes the hash internally via
 *      keccak256(abi.encodePacked(studentId, program, graduationDate, msg.sender)).
 *      We retrieve it with staticCall, then send the real tx.
 *   2. verifyDegree — returns (bool exists, bool valid, bool revoked) — 3 values only.
 *   3. getDegreeDetails — correct function name (getDegreeStatus never existed).
 *   4. revokeDegree — no `reason` param on-chain; reason stays in MongoDB only.
 *   5. All state-changing calls capture txTimeMs (wall-clock ms to confirmation).
 *
 * ethers v6 reminders:
 *   - Contract.connect(signer) for role-specific txs
 *   - contract.METHOD.staticCall() to read return values of state-changing fns
 *   - await tx.wait() for receipts
 */
const { ethers }                              = require("ethers");
const { getContract, getProvider }            = require("../config/blockchain");

// ── Role queries ──────────────────────────────────────────────────────────────

async function hasUniversityRole(walletAddress) {
  const contract       = getContract();
  const UNIVERSITY_ROLE = await contract.UNIVERSITY_ROLE();
  return contract.hasRole(UNIVERSITY_ROLE, walletAddress);
}

async function hasEmployerRole(walletAddress) {
  const contract    = getContract();
  const EMPLOYER_ROLE = await contract.EMPLOYER_ROLE();
  return contract.hasRole(EMPLOYER_ROLE, walletAddress);
}

// ── Role management (called by admin wallet via deployer signer) ───────────────

async function grantUniversityRole(walletAddress) {
  const contract = getContract();
  const tx       = await contract.grantUniversityRole(walletAddress);
  return tx.wait();
}

async function revokeUniversityRole(walletAddress) {
  const contract = getContract();
  const tx       = await contract.revokeUniversityRole(walletAddress);
  return tx.wait();
}

async function grantEmployerRole(walletAddress) {
  const contract = getContract();
  const tx       = await contract.grantEmployerRole(walletAddress);
  return tx.wait();
}

async function revokeEmployerRole(walletAddress) {
  const contract = getContract();
  const tx       = await contract.revokeEmployerRole(walletAddress);
  return tx.wait();
}

// ── Degree issuance ───────────────────────────────────────────────────────────

/**
 * Issue a degree on-chain.
 *
 * Contract computes: keccak256(abi.encodePacked(studentId, program, graduationDate, msg.sender))
 * We retrieve the returned hash via staticCall so we have it for MongoDB storage.
 *
 * @param {object} params
 * @param {string} params.studentName     displayed name (non-sensitive, also on-chain)
 * @param {string} params.studentId       non-sensitive ID (e.g. "IU-2024-001"), goes on-chain
 * @param {string} params.program         e.g. "BSCS"
 * @param {number} params.graduationDate  unix timestamp
 * @param {string} signerPrivateKey       university wallet private key
 * @returns {{ receipt, degreeHash: string, txTimeMs: number }}
 */
async function issueDegree(
  { studentName, studentId, program, graduationDate },
  signerPrivateKey
) {
  const provider = getProvider();
  const wallet   = new ethers.Wallet(signerPrivateKey, provider);
  const contract = getContract().connect(wallet);

  const args = [studentName, studentId, program, BigInt(graduationDate)];

  // Retrieve the hash the contract will compute (no state change, no gas)
  const degreeHash = await contract.issueDegree.staticCall(...args);

  // Send the real tx — state-changing, emits DegreeIssued
  const start   = Date.now();
  const tx      = await contract.issueDegree(...args);
  const receipt = await tx.wait();
  const txTimeMs = Date.now() - start;

  return { receipt, degreeHash, txTimeMs };
}

// ── Degree verification ───────────────────────────────────────────────────────

/**
 * Verify a degree hash.
 *
 * verifyDegree is PUBLIC on-chain (no role required — see design note in contract).
 * Returns (bool exists, bool valid, bool revoked) — 3 values.
 * Fraud attempts (exists=false) still emit DegreeVerified on-chain.
 *
 * @param {string} degreeHash      0x-prefixed bytes32
 * @param {string} signerPrivateKey  wallet that pays gas for the event emission
 * @returns {{ receipt, exists, valid, revoked, txTimeMs }}
 */
async function verifyDegree(degreeHash, signerPrivateKey) {
  const provider = getProvider();
  const wallet   = new ethers.Wallet(signerPrivateKey, provider);
  const contract = getContract().connect(wallet);

  // Read return values without sending a tx (cheaper + atomic)
  const [exists, valid, revoked] = await contract.verifyDegree.staticCall(degreeHash);

  // Send real tx — emits DegreeVerified on-chain (required for audit trail)
  const start   = Date.now();
  const tx      = await contract.verifyDegree(degreeHash);
  const receipt = await tx.wait();
  const txTimeMs = Date.now() - start;

  return { receipt, exists, valid, revoked, txTimeMs };
}

/**
 * Read-only degree verification — NO signer, NO gas, NO state change.
 *
 * Uses staticCall against the public verifyDegree view path so anyone can
 * check a credential without a wallet or private key. This powers the public
 * (no-login) verification page. Because it sends no transaction, it emits no
 * on-chain event — it is a pure read, distinct from the official employer
 * verification which creates a permanent on-chain record.
 *
 * @param {string} degreeHash  0x-prefixed bytes32
 * @returns {{ exists, valid, revoked, readTimeMs }}
 */
async function verifyDegreeReadOnly(degreeHash) {
  const contract = getContract();
  const start    = Date.now();
  const [exists, valid, revoked] = await contract.verifyDegree.staticCall(degreeHash);
  const readTimeMs = Date.now() - start;
  return { exists, valid, revoked, readTimeMs };
}

/**
 * Live blockchain status for the public status widget.
 * Returns network identity, current block height, contract address, and the
 * on-chain total of issued degrees — all read-only.
 *
 * @returns {{ chainId, networkName, blockNumber, contractAddress, totalIssued }}
 */
async function getChainStatus() {
  const provider = getProvider();
  const contract = getContract();

  const [network, blockNumber, totalIssued] = await Promise.all([
    provider.getNetwork(),
    provider.getBlockNumber(),
    contract.getTotalIssued(),
  ]);

  return {
    chainId:         Number(network.chainId),
    networkName:     network.name && network.name !== "unknown" ? network.name : "Private Ethereum",
    blockNumber,
    contractAddress: await contract.getAddress(),
    totalIssued:     Number(totalIssued),
  };
}

// ── Degree revocation ─────────────────────────────────────────────────────────

/**
 * Revoke a degree on-chain.
 * Only the issuing university may revoke — enforced by the contract.
 * The `reason` is kept in MongoDB only; the contract has no reason field.
 *
 * @param {string} degreeHash      bytes32 hash of the degree to revoke
 * @param {string} signerPrivateKey  university wallet private key
 * @returns {{ receipt, txTimeMs }}
 */
async function revokeDegree(degreeHash, signerPrivateKey) {
  const provider = getProvider();
  const wallet   = new ethers.Wallet(signerPrivateKey, provider);
  const contract = getContract().connect(wallet);

  const start   = Date.now();
  const tx      = await contract.revokeDegree(degreeHash);
  const receipt = await tx.wait();
  const txTimeMs = Date.now() - start;

  return { receipt, txTimeMs };
}

// ── Read functions ────────────────────────────────────────────────────────────

/**
 * Fetch full on-chain Degree struct.
 * Reverts with DegreeNotFound if the hash was never issued.
 *
 * @param {string} degreeHash  bytes32
 * @returns {{ studentName, studentId, program, graduationDate, issuingUniversity, degreeHash, issueTimestamp, revoked }}
 */
async function getDegreeDetails(degreeHash) {
  const contract = getContract();
  const d        = await contract.getDegreeDetails(degreeHash);

  return {
    studentName:       d.studentName,
    studentId:         d.studentId,
    program:           d.program,
    graduationDate:    Number(d.graduationDate),
    issuingUniversity: d.issuingUniversity,
    degreeHash:        d.degreeHash,
    issueTimestamp:    Number(d.issueTimestamp),
    revoked:           d.revoked,
  };
}

async function getTotalIssued() {
  const contract = getContract();
  return Number(await contract.getTotalIssued());
}

module.exports = {
  hasUniversityRole,
  hasEmployerRole,
  grantUniversityRole,
  revokeUniversityRole,
  grantEmployerRole,
  revokeEmployerRole,
  issueDegree,
  verifyDegree,
  verifyDegreeReadOnly,
  getChainStatus,
  revokeDegree,
  getDegreeDetails,
  getTotalIssued,
};
