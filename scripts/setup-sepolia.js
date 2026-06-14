/**
 * setup-sepolia.js — one-shot: fund university+employer and grant their roles,
 * with explicit nonces + a healthy gas price so nothing gets stuck on Sepolia.
 * Safe to re-run (skips roles already granted).
 */
require("dotenv").config();
const fs = require("fs"), path = require("path"), { ethers } = require("ethers");

async function main() {
  const info = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "backend", "config", "contractInfo.json"), "utf8"));
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const wallet   = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, info.abi, wallet);

  const uni = process.env.UNIVERSITY_WALLET;
  const emp = process.env.EMPLOYER_WALLET;
  const gasPrice = ethers.parseUnits("50", "gwei"); // force inclusion + replace any stuck tx
  let nonce = await provider.getTransactionCount(wallet.address, "latest"); // ignore stuck pending

  const send = async (label, txReq) => {
    const tx = await wallet.sendTransaction({ ...txReq, nonce, gasPrice });
    console.log(`${label}: ${tx.hash} (nonce ${nonce})`);
    await tx.wait();
    console.log(`  confirmed`);
    nonce++;
  };

  // 1 + 2: fund (replacement for the stuck nonce happens automatically — same nonce, higher fee)
  if ((await provider.getBalance(uni)) === 0n)
    await send("Fund university", { to: uni, value: ethers.parseEther("0.02") });
  else { console.log("University already funded"); }

  if ((await provider.getBalance(emp)) === 0n)
    await send("Fund employer", { to: emp, value: ethers.parseEther("0.02") });
  else { console.log("Employer already funded"); }

  // 3 + 4: grant roles
  const UR = await contract.UNIVERSITY_ROLE(), ER = await contract.EMPLOYER_ROLE();
  if (!(await contract.hasRole(UR, uni))) {
    const tx = await contract.grantUniversityRole(uni, { nonce, gasPrice });
    console.log(`Grant UNIVERSITY: ${tx.hash} (nonce ${nonce})`); await tx.wait(); console.log("  confirmed"); nonce++;
  } else console.log("UNIVERSITY_ROLE already set");

  if (!(await contract.hasRole(ER, emp))) {
    const tx = await contract.grantEmployerRole(emp, { nonce, gasPrice });
    console.log(`Grant EMPLOYER: ${tx.hash} (nonce ${nonce})`); await tx.wait(); console.log("  confirmed"); nonce++;
  } else console.log("EMPLOYER_ROLE already set");

  console.log("\nALL DONE ✓");
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
