/**
 * deploy.js
 * ─────────
 * Deploys DegreeContract.sol to the target Hardhat network.
 * Writes address + full ABI to backend/config/contractInfo.json
 * so the backend can consume it without importing Hardhat artifacts directly.
 *
 * Usage:
 *   npx hardhat run scripts/deploy.js --network localhost
 *
 * ethers v6 — no .deployed(), no ethers.utils.*
 */
const { ethers } = require("hardhat");
const fs   = require("fs");
const path = require("path");

async function main() {
  // ── Deployer info ────────────────────────────────────────────────────────
  const [deployer] = await ethers.getSigners();
  const network    = await ethers.provider.getNetwork();

  console.log("═══════════════════════════════════════════════");
  console.log(" DegreeContract — Deployment");
  console.log("═══════════════════════════════════════════════");
  console.log("Network  :", network.name, `(chainId ${network.chainId})`);
  console.log("Deployer :", deployer.address);
  console.log(
    "Balance  :",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH"
  );

  // ── Deploy ────────────────────────────────────────────────────────────────
  console.log("\nDeploying DegreeContract...");
  const Factory  = await ethers.getContractFactory("DegreeContract");
  const contract = await Factory.deploy();

  // ethers v6: waitForDeployment() replaces .deployed()
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const receipt = await ethers.provider.getTransactionReceipt(
    contract.deploymentTransaction().hash
  );

  console.log("✓ Deployed to      :", address);
  console.log("  TX hash          :", contract.deploymentTransaction().hash);
  console.log("  Block number     :", receipt.blockNumber);
  console.log("  Gas used         :", receipt.gasUsed.toString());

  // ── Load ABI from Hardhat artifact ────────────────────────────────────────
  const artifactPath = path.join(
    __dirname, "..", "artifacts", "contracts",
    "DegreeContract.sol", "DegreeContract.json"
  );
  const { abi } = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  // ── Write backend/config/contractInfo.json ────────────────────────────────
  const contractInfo = {
    contractName:    "DegreeContract",
    address,
    network:         network.name,
    chainId:         Number(network.chainId),
    deployedAt:      new Date().toISOString(),
    deployer:        deployer.address,
    txHash:          contract.deploymentTransaction().hash,
    blockNumber:     receipt.blockNumber,
    gasUsed:         receipt.gasUsed.toString(),
    abi,
  };

  const outPath = path.join(__dirname, "..", "backend", "config", "contractInfo.json");
  fs.writeFileSync(outPath, JSON.stringify(contractInfo, null, 2));
  console.log("\n✓ contractInfo.json written to:", outPath);

  // ── Also update root deployments.json for seed/simulate scripts ───────────
  const deployPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(
    deployPath,
    JSON.stringify({ address, chainId: Number(network.chainId), deployedAt: new Date().toISOString() }, null, 2)
  );
  console.log("✓ deployments.json updated");
  console.log("═══════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
