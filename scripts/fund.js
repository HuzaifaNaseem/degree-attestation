/**
 * fund.js — disperse a little Sepolia gas from the deployer to the
 * university + employer wallets, so you only need ONE faucet request.
 *
 * Reads SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY, UNIVERSITY_WALLET, EMPLOYER_WALLET
 * from .env. Sends 0.02 ETH to each (skip any you leave unset).
 *
 * Usage:  node scripts/fund.js
 */
require("dotenv").config();
const { ethers } = require("ethers");

async function main() {
  const rpc = process.env.SEPOLIA_RPC_URL;
  const pk  = process.env.DEPLOYER_PRIVATE_KEY;
  if (!rpc || !pk) throw new Error("Set SEPOLIA_RPC_URL and DEPLOYER_PRIVATE_KEY in .env");

  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet   = new ethers.Wallet(pk, provider);

  const targets = [process.env.UNIVERSITY_WALLET, process.env.EMPLOYER_WALLET].filter(Boolean);
  if (!targets.length) throw new Error("Set UNIVERSITY_WALLET / EMPLOYER_WALLET to fund");

  const bal = await provider.getBalance(wallet.address);
  console.log(`Deployer ${wallet.address} balance: ${ethers.formatEther(bal)} ETH`);

  for (const to of targets) {
    if (to.toLowerCase() === wallet.address.toLowerCase()) {
      console.log(`Skip ${to} (same as deployer)`);
      continue;
    }
    const tx = await wallet.sendTransaction({ to, value: ethers.parseEther("0.02") });
    console.log(`Sent 0.02 ETH → ${to}  (tx ${tx.hash})`);
    await tx.wait();
  }
  console.log("Done.");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
