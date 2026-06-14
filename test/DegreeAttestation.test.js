/**
 * DegreeAttestation.test.js
 * Full test suite — happy path, edge cases, role guards, fraud simulation.
 * ethers v6 | Hardhat 2.x | chai
 */
const { expect }        = require("chai");
const { ethers }        = require("hardhat");
const { loadFixture }   = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { deployFixture, makeDegreeHash, sampleDegrees } = require("./helpers/testFixtures");

// ── Helpers ──────────────────────────────────────────────────────────────────

const ZERO_HASH = ethers.ZeroHash; // bytes32(0) in ethers v6

// ── Test Suite ───────────────────────────────────────────────────────────────

describe("DegreeAttestation", function () {

  // ── 1. Deployment ───────────────────────────────────────────────────────

  describe("Deployment", function () {
    it("grants DEFAULT_ADMIN_ROLE to deployer", async function () {
      const { contract, admin } = await loadFixture(deployFixture);
      const adminRole = await contract.DEFAULT_ADMIN_ROLE();
      expect(await contract.hasRole(adminRole, admin.address)).to.equal(true);
    });

    it("starts with zero degrees issued", async function () {
      const { contract } = await loadFixture(deployFixture);
      expect(await contract.getTotalIssued()).to.equal(0n);
    });
  });

  // ── 2. Role Management ──────────────────────────────────────────────────

  describe("Role Management", function () {
    it("admin can grant UNIVERSITY_ROLE", async function () {
      const { contract, university1 } = await loadFixture(deployFixture);
      const uniRole = await contract.UNIVERSITY_ROLE();
      expect(await contract.hasRole(uniRole, university1.address)).to.equal(true);
    });

    it("admin can grant EMPLOYER_ROLE", async function () {
      const { contract, employer1 } = await loadFixture(deployFixture);
      const empRole = await contract.EMPLOYER_ROLE();
      expect(await contract.hasRole(empRole, employer1.address)).to.equal(true);
    });

    it("admin can revoke UNIVERSITY_ROLE", async function () {
      const { contract, admin, university1 } = await loadFixture(deployFixture);
      await contract.connect(admin).revokeUniversityRole(university1.address);
      const uniRole = await contract.UNIVERSITY_ROLE();
      expect(await contract.hasRole(uniRole, university1.address)).to.equal(false);
    });

    it("reverts ZeroAddress when granting to address(0)", async function () {
      const { contract, admin } = await loadFixture(deployFixture);
      await expect(
        contract.connect(admin).grantUniversityRole(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(contract, "ZeroAddress");
    });

    it("stranger cannot grant roles", async function () {
      const { contract, stranger } = await loadFixture(deployFixture);
      await expect(
        contract.connect(stranger).grantUniversityRole(stranger.address)
      ).to.be.reverted; // OZ AccessControlUnauthorizedAccount
    });

    it("emits RoleGrantedByAdmin on grantUniversityRole", async function () {
      const { contract, admin } = await loadFixture(deployFixture);
      const [, , , , , stranger] = await ethers.getSigners();
      const uniRole = await contract.UNIVERSITY_ROLE();

      await expect(contract.connect(admin).grantUniversityRole(stranger.address))
        .to.emit(contract, "RoleGrantedByAdmin")
        .withArgs(uniRole, stranger.address, admin.address, anyTimestamp());
    });
  });

  // ── 3. Degree Issuance ─────────────────────────────────────────────────

  describe("issueDegree", function () {
    it("issues 5 degrees in the simulation scenario", async function () {
      const { contract, university1, university2 } = await loadFixture(deployFixture);
      const degrees = sampleDegrees(university1.address, university2.address);

      for (const d of degrees) {
        const uni = d.university === university1.address ? university1 : university2;
        await expect(
          contract.connect(uni).issueDegree(d.hash, d.studentName, d.program, d.graduationDate)
        ).to.emit(contract, "DegreeIssued").withArgs(
          d.hash, uni.address, d.studentName, d.program, d.graduationDate, anyTimestamp()
        );
      }

      expect(await contract.getTotalIssued()).to.equal(5n);
    });

    it("reverts DegreeAlreadyIssued on duplicate hash", async function () {
      const { contract, university1 } = await loadFixture(deployFixture);
      const hash = makeDegreeHash({
        nationalId: "42101-0000000-1", studentName: "Test", program: "BSCS",
        graduationDate: 1700000000, universityAddress: university1.address, nonce: "dup-001",
      });

      await contract.connect(university1).issueDegree(hash, "Test", "BSCS", 1700000000);

      await expect(
        contract.connect(university1).issueDegree(hash, "Test", "BSCS", 1700000000)
      ).to.be.revertedWithCustomError(contract, "DegreeAlreadyIssued").withArgs(hash);
    });

    it("reverts InvalidDegreeHash when bytes32(0) passed", async function () {
      const { contract, university1 } = await loadFixture(deployFixture);
      await expect(
        contract.connect(university1).issueDegree(ZERO_HASH, "X", "BSCS", 0)
      ).to.be.revertedWithCustomError(contract, "InvalidDegreeHash");
    });

    it("reverts when called by non-university wallet", async function () {
      const { contract, stranger } = await loadFixture(deployFixture);
      const hash = makeDegreeHash({
        nationalId: "X", studentName: "X", program: "X",
        graduationDate: 0, universityAddress: stranger.address, nonce: "x",
      });
      await expect(
        contract.connect(stranger).issueDegree(hash, "X", "X", 0)
      ).to.be.reverted;
    });
  });

  // ── 4. Degree Verification ─────────────────────────────────────────────

  describe("verifyDegree", function () {
    it("verifies a valid degree — Case 1", async function () {
      const { contract, university1, employer1 } = await loadFixture(deployFixture);
      const degrees = sampleDegrees(university1.address, university1.address);
      const d = degrees[0];

      await contract.connect(university1).issueDegree(d.hash, d.studentName, d.program, d.graduationDate);

      // verifyDegree is a transaction (state-changing due to event) — use staticCall for return values
      const result = await contract.connect(employer1).verifyDegree.staticCall(d.hash);
      expect(result.exists).to.equal(true);
      expect(result.isRevoked).to.equal(false);
      expect(result.issuingUniversity).to.equal(university1.address);
    });

    it("emits DegreeVerified with isValid=true for a genuine degree", async function () {
      const { contract, university1, employer1 } = await loadFixture(deployFixture);
      const degrees = sampleDegrees(university1.address, university1.address);
      const d = degrees[1];

      await contract.connect(university1).issueDegree(d.hash, d.studentName, d.program, d.graduationDate);

      await expect(contract.connect(employer1).verifyDegree(d.hash))
        .to.emit(contract, "DegreeVerified")
        .withArgs(d.hash, employer1.address, true, false, anyTimestamp());
    });

    it("FRAUD DETECTION — fake hash returns exists=false and emits DegreeVerified(isValid=false)", async function () {
      const { contract, employer1 } = await loadFixture(deployFixture);
      const fakeHash = makeDegreeHash({
        nationalId: "FAKE-ID", studentName: "Fake Person", program: "BSCS",
        graduationDate: 1700000000, universityAddress: ethers.ZeroAddress, nonce: "fraud-001",
      });

      // Must NOT revert — fraud attempt must be recorded on-chain via event
      await expect(contract.connect(employer1).verifyDegree(fakeHash))
        .to.emit(contract, "DegreeVerified")
        .withArgs(fakeHash, employer1.address, false, false, anyTimestamp());

      // Confirm status is "not found"
      const status = await contract.getDegreeStatus(fakeHash);
      expect(status.exists).to.equal(false);
    });

    it("reverts InvalidDegreeHash for bytes32(0)", async function () {
      const { contract, employer1 } = await loadFixture(deployFixture);
      await expect(
        contract.connect(employer1).verifyDegree(ZERO_HASH)
      ).to.be.revertedWithCustomError(contract, "InvalidDegreeHash");
    });

    it("reverts when called by non-employer", async function () {
      const { contract, stranger } = await loadFixture(deployFixture);
      const fakeHash = ethers.id("anything");
      await expect(contract.connect(stranger).verifyDegree(fakeHash)).to.be.reverted;
    });
  });

  // ── 5. Degree Revocation ───────────────────────────────────────────────

  describe("revokeDegree", function () {
    async function issueOne(contract, university) {
      const hash = makeDegreeHash({
        nationalId: "42101-9999999-9", studentName: "Rev Test", program: "BSCS",
        graduationDate: 1700000000, universityAddress: university.address, nonce: "rev-001",
      });
      await contract.connect(university).issueDegree(hash, "Rev Test", "BSCS", 1700000000);
      return hash;
    }

    it("university can revoke its own degree and emits DegreeRevoked", async function () {
      const { contract, university1 } = await loadFixture(deployFixture);
      const hash = await issueOne(contract, university1);

      await expect(contract.connect(university1).revokeDegree(hash, "Administrative error"))
        .to.emit(contract, "DegreeRevoked")
        .withArgs(hash, university1.address, "Administrative error", anyTimestamp());

      const status = await contract.getDegreeStatus(hash);
      expect(status.isRevoked).to.equal(true);
    });

    it("reverts DegreeNotFound for unknown hash", async function () {
      const { contract, university1 } = await loadFixture(deployFixture);
      const unknown = ethers.id("unknown-hash");
      await expect(
        contract.connect(university1).revokeDegree(unknown, "reason")
      ).to.be.revertedWithCustomError(contract, "DegreeNotFound").withArgs(unknown);
    });

    it("reverts NotIssuingUniversity when other university tries to revoke", async function () {
      const { contract, university1, university2 } = await loadFixture(deployFixture);
      const hash = await issueOne(contract, university1);

      await expect(
        contract.connect(university2).revokeDegree(hash, "cross-uni attack")
      ).to.be.revertedWithCustomError(contract, "NotIssuingUniversity").withArgs(hash);
    });

    it("reverts DegreeAlreadyRevoked on second revocation", async function () {
      const { contract, university1 } = await loadFixture(deployFixture);
      const hash = await issueOne(contract, university1);

      await contract.connect(university1).revokeDegree(hash, "first");
      await expect(
        contract.connect(university1).revokeDegree(hash, "second")
      ).to.be.revertedWithCustomError(contract, "DegreeAlreadyRevoked").withArgs(hash);
    });

    it("revoked degree returns isValid=false in verification", async function () {
      const { contract, university1, employer1 } = await loadFixture(deployFixture);
      const hash = await issueOne(contract, university1);

      await contract.connect(university1).revokeDegree(hash, "fraud confirmed");

      await expect(contract.connect(employer1).verifyDegree(hash))
        .to.emit(contract, "DegreeVerified")
        .withArgs(hash, employer1.address, false, true, anyTimestamp());
    });
  });

  // ── 6. MockAttacker (role-bypass simulation) ───────────────────────────

  describe("MockAttacker — unauthorized access simulation", function () {
    it("attacker cannot call verifyDegree without EMPLOYER_ROLE", async function () {
      const { contract } = await loadFixture(deployFixture);

      const AttackerFactory = await ethers.getContractFactory("MockAttacker");
      const attacker = await AttackerFactory.deploy(await contract.getAddress());

      const fakeHash = ethers.id("attack-vector");
      await expect(attacker.attackVerify(fakeHash)).to.be.reverted;
    });

    it("attacker cannot call issueDegree without UNIVERSITY_ROLE", async function () {
      const { contract } = await loadFixture(deployFixture);

      const AttackerFactory = await ethers.getContractFactory("MockAttacker");
      const attacker = await AttackerFactory.deploy(await contract.getAddress());

      const fakeHash = ethers.id("issue-attack");
      await expect(attacker.attackIssue(fakeHash)).to.be.reverted;
    });
  });

  // ── 7. Public read ─────────────────────────────────────────────────────

  describe("getDegreeStatus", function () {
    it("returns correct data for an issued degree", async function () {
      const { contract, university1 } = await loadFixture(deployFixture);
      const hash = makeDegreeHash({
        nationalId: "42101-5555555-5", studentName: "Read Test", program: "BSIT",
        graduationDate: 1700000000, universityAddress: university1.address, nonce: "read-001",
      });

      await contract.connect(university1).issueDegree(hash, "Read Test", "BSIT", 1700000000);

      const status = await contract.getDegreeStatus(hash);
      expect(status.exists).to.equal(true);
      expect(status.isRevoked).to.equal(false);
      expect(status.issuingUniversity).to.equal(university1.address);
    });

    it("returns exists=false for an unknown hash — no revert", async function () {
      const { contract } = await loadFixture(deployFixture);
      const status = await contract.getDegreeStatus(ethers.id("ghost"));
      expect(status.exists).to.equal(false);
    });
  });

});

// ── Utility: loose timestamp matcher ──────────────────────────────────────────
// verifyDegree events carry block.timestamp which we cannot predict exactly.
// We use a custom Chai predicate via ignoring the field — simplest approach
// is to match with anyValue from hardhat-chai-matchers.
function anyTimestamp() {
  const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
  return anyValue;
}
