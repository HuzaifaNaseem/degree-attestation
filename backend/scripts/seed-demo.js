/**
 * seed-demo.js — populate a realistic, full dataset for demos.
 *
 * Issues a batch of degrees ON-CHAIN (Sepolia) so they truly verify, mirrors
 * them into MongoDB, revokes a couple, and enriches the audit log with a month
 * of varied events. Run from repo root:
 *   NODE_OPTIONS=--use-system-ca node backend/scripts/seed-demo.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const fs = require("fs"), path = require("path"), { ethers } = require("ethers");
const mongoose = require("mongoose");

const Degree   = require("../src/models/Degree");
const AuditLog = require("../src/models/AuditLog");
const User     = require("../src/models/User");
const { encrypt } = require("../src/services/encryptionService");

const info = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "config", "contractInfo.json"), "utf8"));

const PROGRAMS = ["BS Computer Science", "BS Software Engineering", "BS Information Technology", "BBA", "MBA", "BS Media Sciences", "BS Psychology", "BS Electrical Engineering"];
const NAMES = [
  "Hamza Naseem", "Ayesha Siddiqui", "Bilal Ahmed", "Fatima Noor", "Usman Tariq",
  "Maryam Khan", "Hassan Raza", "Zainab Ali", "Omar Farooq", "Sana Malik",
  "Ahmed Shah", "Hira Yousuf",
];

const daysAgo = (d) => new Date(Date.now() - d * 86400000);
const rand = (a) => a[Math.floor(Math.random() * a.length)];

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Mongo connected.");

  const provider  = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const uniWallet = new ethers.Wallet(process.env.UNIVERSITY_PRIVATE_KEY, provider);
  const contract  = new ethers.Contract(process.env.CONTRACT_ADDRESS, info.abi, uniWallet);
  const uniUser   = await User.findOne({ role: "university" });

  const issued = [];

  for (let i = 0; i < NAMES.length; i++) {
    const studentName = NAMES[i];
    const studentId   = `IU-2026-${500 + i}`;
    const program     = rand(PROGRAMS);
    const gradDate    = Math.floor(daysAgo(30 - i).getTime() / 1000);

    if (await Degree.findOne({ studentId })) { console.log(`skip ${studentId} (exists)`); continue; }

    try {
      const args = [studentName, studentId, program, BigInt(gradDate)];
      const hash = await contract.issueDegree.staticCall(...args);
      const tx   = await contract.issueDegree(...args);
      await tx.wait();

      const created = daysAgo(28 - i * 2);
      const doc = await Degree.create({
        degreeHash: hash, studentName, studentId, program,
        graduationDate: gradDate,
        nationalIdEnc: encrypt(`42101-${1000000 + i}-${i % 9}`),
        gpaEnc: encrypt((3 + Math.random()).toFixed(2)),
        universityWallet: uniWallet.address.toLowerCase(),
        issuedBy: uniUser?._id, txHash: tx.hash,
      });
      await Degree.updateOne({ _id: doc._id }, { $set: { createdAt: created } });
      await AuditLog.create({
        eventType: "DEGREE_ISSUED", degreeHash: hash, actor: uniWallet.address.toLowerCase(),
        actorRole: "university", txHash: tx.hash, details: { studentName, program }, timestamp: created,
      });

      issued.push({ hash, studentName });
      console.log(`OK issued ${studentName} (${studentId}) ${hash.slice(0, 14)}...`);
    } catch (e) {
      console.log(`FAIL ${studentName}: ${e.message.slice(0, 90)}`);
    }
  }

  for (const r of issued.slice(0, 2)) {
    try {
      const tx = await contract.revokeDegree(r.hash);
      await tx.wait();
      await Degree.updateOne({ degreeHash: r.hash }, { $set: { isRevoked: true, revocationReason: "Academic review" } });
      await AuditLog.create({ eventType: "DEGREE_REVOKED", degreeHash: r.hash, actor: uniWallet.address.toLowerCase(), actorRole: "university", txHash: tx.hash, timestamp: daysAgo(3) });
      console.log(`OK revoked ${r.studentName}`);
    } catch (e) { console.log(`FAIL revoke: ${e.message.slice(0, 60)}`); }
  }

  const emp = (process.env.EMPLOYER_WALLET || "0x0").toLowerCase();
  const entries = [];
  for (let i = 0; i < 32 && issued.length; i++) {
    const r = rand(issued);
    entries.push({ eventType: "DEGREE_VERIFIED", degreeHash: r.hash, actor: emp, actorRole: "employer", details: { status: "VALID" }, timestamp: daysAgo(Math.floor(Math.random() * 30)) });
  }
  for (let i = 0; i < 6; i++)
    entries.push({ eventType: "FRAUD_ATTEMPT", degreeHash: "0x" + "ab".repeat(32), actor: emp, actorRole: "employer", isFraud: true, details: { status: "INVALID" }, timestamp: daysAgo(Math.floor(Math.random() * 30)) });
  for (let i = 0; i < 18; i++)
    entries.push({ eventType: "AUTH_LOGIN", actor: rand(["admin@iqra.edu.pk", "university@iqra.edu.pk", "employer@techcorp.com"]), actorRole: "user", timestamp: daysAgo(Math.floor(Math.random() * 30)) });
  for (let i = 0; i < 4; i++)
    entries.push({ eventType: "UNAUTHORIZED_ACCESS", actor: "unknown", actorRole: "employer", details: { route: "/admin/users" }, timestamp: daysAgo(Math.floor(Math.random() * 30)) });
  for (let i = 0; i < 3; i++)
    entries.push({ eventType: "ROLE_GRANTED", actor: (process.env.ADMIN_WALLET || "").toLowerCase(), actorRole: "admin", details: { role: rand(["UNIVERSITY_ROLE", "EMPLOYER_ROLE"]) }, timestamp: daysAgo(Math.floor(Math.random() * 30)) });
  await AuditLog.insertMany(entries);
  console.log(`OK inserted ${entries.length} audit entries`);

  const extra = [
    { name: "FAST University", email: "registrar@fast.edu.pk", role: "university", walletAddress: "0x1111111111111111111111111111111111111111" },
    { name: "NUST Registrar",  email: "registrar@nust.edu.pk", role: "university", walletAddress: "0x2222222222222222222222222222222222222222" },
    { name: "Systems Ltd HR",  email: "hr@systemsltd.com",      role: "employer",   walletAddress: "0x3333333333333333333333333333333333333333" },
    { name: "Google Recruiter",email: "talent@google.com",      role: "employer",   walletAddress: "0x4444444444444444444444444444444444444444" },
  ];
  for (const u of extra) {
    if (await User.findOne({ email: u.email })) continue;
    await User.create({ ...u, passwordHash: await User.hashPassword("Demo@1234") });
  }
  console.log("OK extra users added");

  console.log(`\nDONE - issued ${issued.length} on-chain degrees + rich history.`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error("FAILED:", e); process.exit(1); });
