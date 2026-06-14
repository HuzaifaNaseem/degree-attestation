/**
 * blockchain.js — ethers v6 provider, signer, and contract instance.
 *
 * Reads ABI + address from backend/config/contractInfo.json (written by
 * scripts/deploy.js).  This decouples the backend from Hardhat's artifact
 * directory — contractInfo.json is the single source of truth.
 *
 * ethers v6: JsonRpcProvider, Wallet, Contract — no ethers.utils.*, no .deployed()
 */
const { ethers } = require("ethers");
const fs          = require("fs");
const path        = require("path");

let _provider = null;
let _signer   = null;
let _contract = null;

function getProvider() {
  if (!_provider) {
    const rpc = process.env.RPC_URL;
    if (!rpc) throw new Error("RPC_URL is not set in environment");
    _provider = new ethers.JsonRpcProvider(rpc);
    // Gentler event polling so we don't hammer a free public RPC (e.g. Sepolia).
    _provider.pollingInterval = Number(process.env.RPC_POLL_MS) || 12000;
  }
  return _provider;
}

function getSigner() {
  if (!_signer) {
    const pk = process.env.DEPLOYER_PRIVATE_KEY;
    if (!pk) throw new Error("DEPLOYER_PRIVATE_KEY is not set in environment");
    // NonceManager tracks the nonce locally and auto-increments, preventing
    // "nonce already used" errors when consecutive txs fire in quick succession.
    _signer = new ethers.NonceManager(new ethers.Wallet(pk, getProvider()));
  }
  return _signer;
}

function loadContractInfo() {
  const infoPath = path.join(__dirname, "..", "..", "config", "contractInfo.json");
  if (!fs.existsSync(infoPath)) {
    throw new Error(
      `contractInfo.json not found at ${infoPath}.\n` +
      `Run: npx hardhat run scripts/deploy.js --network localhost`
    );
  }
  return JSON.parse(fs.readFileSync(infoPath, "utf8"));
}

function getContract() {
  if (!_contract) {
    const info    = loadContractInfo();
    const address = process.env.CONTRACT_ADDRESS || info.address;
    _contract = new ethers.Contract(address, info.abi, getSigner());
  }
  return _contract;
}

// Called at app startup — fails fast if contract is not deployed
async function verifyContractLive() {
  const info    = loadContractInfo();
  const address = process.env.CONTRACT_ADDRESS || info.address;
  const code    = await getProvider().getCode(address);
  if (code === "0x") {
    throw new Error(
      `No contract bytecode at ${address}.\n` +
      `Run: npx hardhat run scripts/deploy.js --network localhost`
    );
  }
  console.log(`Contract verified live at ${address}`);
}

module.exports = { getProvider, getSigner, getContract, verifyContractLive };
