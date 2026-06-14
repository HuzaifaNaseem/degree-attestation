/**
 * genwallet.js — generate fresh Ethereum wallets for the cloud/testnet deploy.
 *
 * Public Hardhat keys are well-known and get swept by bots on public testnets,
 * so generate your own. Fund the FIRST one (deployer) from a Sepolia faucet;
 * scripts/fund.js can then disperse a little gas to the others.
 *
 * Usage:  node scripts/genwallet.js [count=3]
 */
const { Wallet } = require("ethers");

const count = Number(process.argv[2] || 3);
const labels = ["DEPLOYER / ADMIN", "UNIVERSITY", "EMPLOYER"];

console.log("\n=== Fresh wallets (KEEP THE PRIVATE KEYS SECRET) ===\n");
for (let i = 0; i < count; i++) {
  const w = Wallet.createRandom();
  console.log(`#${i}  ${labels[i] || "EXTRA"}`);
  console.log(`  address    : ${w.address}`);
  console.log(`  privateKey : ${w.privateKey}\n`);
}

console.log("Next steps:");
console.log("  1. Fund wallet #0 with Sepolia ETH from a faucet (e.g. sepoliafaucet.com).");
console.log("  2. Put wallet #0's privateKey in DEPLOYER_PRIVATE_KEY.");
console.log("  3. Set ADMIN_WALLET / UNIVERSITY_WALLET / EMPLOYER_WALLET to the addresses above.");
console.log("  4. (optional) node scripts/fund.js  — sends gas from #0 to the others.\n");
