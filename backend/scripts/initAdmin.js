/**
 * initAdmin.js — Seeds the initial admin user in MongoDB.
 *
 * Run ONCE before starting the backend for the first time:
 *   node backend/scripts/initAdmin.js
 *
 * Uses Hardhat Account #0 as the admin wallet (deployer).
 * The private key 0xac09... is the well-known Hardhat deterministic key —
 * safe to use on a local private network; NEVER use on mainnet.
 */
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });

const mongoose = require("mongoose");
const User     = require("../src/models/User");

// Wallet addresses default to the local Hardhat deterministic accounts, but can
// be overridden via env for a cloud / testnet deployment (where you fund your own
// wallets). For the simplest live setup, point all three at one funded wallet.
const ADMIN = {
  name:          "System Administrator",
  email:         "admin@iqra.edu.pk",
  password:      "Admin@1234",
  role:          "admin",
  walletAddress: (process.env.ADMIN_WALLET || "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266").toLowerCase(),
};

const UNIVERSITY = {
  name:          "Iqra University",
  email:         "university@iqra.edu.pk",
  password:      "University@1234",
  role:          "university",
  walletAddress: (process.env.UNIVERSITY_WALLET || "0x70997970c51812dc3a010c7d01b50e0d17dc79c8").toLowerCase(),
};

const EMPLOYER = {
  name:          "TechCorp HR",
  email:         "employer@techcorp.com",
  password:      "Employer@1234",
  role:          "employer",
  walletAddress: (process.env.EMPLOYER_WALLET || "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc").toLowerCase(),
};

async function seed(data) {
  const existing = await User.findOne({ email: data.email });
  if (existing) {
    console.log(`  [SKIP] ${data.email} already exists`);
    return existing;
  }
  const passwordHash = await User.hashPassword(data.password);
  const user = await User.create({ ...data, passwordHash });
  console.log(`  [OK]   ${data.role.padEnd(10)} ${data.email}  (wallet: ${data.walletAddress})`);
  return user;
}

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI not set in .env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("MongoDB connected.\n");
  console.log("Seeding test accounts:");

  await seed(ADMIN);
  await seed(UNIVERSITY);
  await seed(EMPLOYER);

  console.log("\nDone. You can now start the backend and run test-api.js.");
  console.log("Admin credentials:      admin@iqra.edu.pk / Admin@1234");
  console.log("University credentials: university@iqra.edu.pk / University@1234");
  console.log("Employer credentials:   employer@techcorp.com / Employer@1234");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("initAdmin failed:", err.message);
  process.exit(1);
});
