/**
 * grantRoles.js — grant UNIVERSITY_ROLE + EMPLOYER_ROLE on the deployed contract.
 *
 * Uses the deployer (DEFAULT_ADMIN_ROLE) to grant roles to the configured wallets,
 * so issuing/verifying works immediately after a cloud deploy. Idempotent.
 *
 * Reads from .env: SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY, CONTRACT_ADDRESS,
 * UNIVERSITY_WALLET, EMPLOYER_WALLET. ABI from backend/config/contractInfo.json.
 *
 * Usage:  node scripts/grantRoles.js
 */
require("dotenv").config();
const fs   = require("fs");
const path = require("path");
const { ethers } = require("ethers");

async function main() {
  const rpc  = process.env.SEPOLIA_RPC_URL || process.env.RPC_URL;
  const pk   = process.env.DEPLOYER_PRIVATE_KEY;
  const info = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "backend", "config", "contractInfo.json"), "utf8"));
  const addr = process.env.CONTRACT_ADDRESS || info.address;

  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet   = new ethers.Wallet(pk, provider);
  const contract = new ethers.Contract(addr, info.abi, wallet);

  const uni = process.env.UNIVERSITY_WALLET;
  const emp = process.env.EMPLOYER_WALLET;
  const UNIVERSITY_ROLE = await contract.UNIVERSITY_ROLE();
  const EMPLOYER_ROLE   = await contract.EMPLOYER_ROLE();

  if (!(await contract.hasRole(UNIVERSITY_ROLE, uni))) {
    const tx = await contract.grantUniversityRole(uni);
    console.log("Granting UNIVERSITY_ROLE →", uni, "tx", tx.hash);
    await tx.wait();
  } else { console.log("UNIVERSITY_ROLE already set for", uni); }

  if (!(await contract.hasRole(EMPLOYER_ROLE, emp))) {
    const tx = await contract.grantEmployerRole(emp);
    console.log("Granting EMPLOYER_ROLE →", emp, "tx", tx.hash);
    await tx.wait();
  } else { console.log("EMPLOYER_ROLE already set for", emp); }

  console.log("Roles ready.");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
