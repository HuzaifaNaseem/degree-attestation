/**
 * DegreeContract.test.js
 * ──────────────────────
 * Full test coverage for DegreeContract.sol
 * Covers: every function, every role, every custom error, and every edge case.
 * Uses: Hardhat 2.x · ethers v6 · chai · hardhat-chai-matchers
 *
 * Edge cases explicitly tested:
 *   ✓ Duplicate issuance (DegreeAlreadyExists)
 *   ✓ Non-existent degree verification (exists = false, NO revert)
 *   ✓ Revoked-degree verification (valid = false, revoked = true)
 *   ✓ Unauthorized caller on role-gated functions
 *   ✓ Revoke by non-issuing university (NotIssuingUniversity)
 *   ✓ Double revocation (DegreeAlreadyRevoked)
 *   ✓ FAKE DEGREE scenario (verify a hash never issued → exists=false)
 */
const { expect }      = require("chai");
const { ethers }      = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue }    = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

// ── Test data ─────────────────────────────────────────────────────────────────

const SAMPLE = {
  studentName:    "Ali Hassan",
  studentId:      "STU-2024-001",
  program:        "BSCS",
  graduationDate: 1700000000, // arbitrary unix ts
};

const SAMPLE2 = {
  studentName:    "Sara Khan",
  studentId:      "STU-2024-002",
  program:        "BSCE",
  graduationDate: 1700086400,
};

// ── Shared fixture ────────────────────────────────────────────────────────────

async function deployFixture() {
  const [admin, university1, university2, employer, stranger] =
    await ethers.getSigners();

  const Factory  = await ethers.getContractFactory("DegreeContract");
  const contract = await Factory.deploy();

  // Grant roles using the convenience wrappers (tested separately below)
  await contract.connect(admin).grantUniversityRole(university1.address);
  await contract.connect(admin).grantUniversityRole(university2.address);
  await contract.connect(admin).grantEmployerRole(employer.address);

  return { contract, admin, university1, university2, employer, stranger };
}

// Helper: compute the exact hash the contract will produce for a given issuance
function expectedHash(studentId, program, graduationDate, universityAddress) {
  return ethers.keccak256(
    ethers.solidityPacked(
      ["string", "string", "uint256", "address"],
      [studentId, program, graduationDate, universityAddress]
    )
  );
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe("DegreeContract", function () {

  // ── 1. Deployment & role constants ──────────────────────────────────────────

  describe("Deployment", function () {
    it("deployer receives DEFAULT_ADMIN_ROLE and ADMIN_ROLE", async function () {
      const { contract, admin } = await loadFixture(deployFixture);
      expect(await contract.hasRole(await contract.DEFAULT_ADMIN_ROLE(), admin.address)).to.equal(true);
      expect(await contract.hasRole(await contract.ADMIN_ROLE(), admin.address)).to.equal(true);
    });

    it("ADMIN_ROLE is admin of UNIVERSITY_ROLE and EMPLOYER_ROLE", async function () {
      const { contract } = await loadFixture(deployFixture);
      const ADMIN_ROLE      = await contract.ADMIN_ROLE();
      const UNIVERSITY_ROLE = await contract.UNIVERSITY_ROLE();
      const EMPLOYER_ROLE   = await contract.EMPLOYER_ROLE();
      expect(await contract.getRoleAdmin(UNIVERSITY_ROLE)).to.equal(ADMIN_ROLE);
      expect(await contract.getRoleAdmin(EMPLOYER_ROLE)).to.equal(ADMIN_ROLE);
    });

    it("starts with zero degrees issued", async function () {
      const { contract } = await loadFixture(deployFixture);
      expect(await contract.getTotalIssued()).to.equal(0n);
    });
  });

  // ── 2. Role management ───────────────────────────────────────────────────────

  describe("Role Management", function () {
    it("admin grants UNIVERSITY_ROLE — hasRole returns true", async function () {
      const { contract, university1 } = await loadFixture(deployFixture);
      const UNIVERSITY_ROLE = await contract.UNIVERSITY_ROLE();
      expect(await contract.hasRole(UNIVERSITY_ROLE, university1.address)).to.equal(true);
    });

    it("admin grants EMPLOYER_ROLE — hasRole returns true", async function () {
      const { contract, employer } = await loadFixture(deployFixture);
      const EMPLOYER_ROLE = await contract.EMPLOYER_ROLE();
      expect(await contract.hasRole(EMPLOYER_ROLE, employer.address)).to.equal(true);
    });

    it("admin revokes UNIVERSITY_ROLE — hasRole returns false", async function () {
      const { contract, admin, university1 } = await loadFixture(deployFixture);
      await contract.connect(admin).revokeUniversityRole(university1.address);
      const UNIVERSITY_ROLE = await contract.UNIVERSITY_ROLE();
      expect(await contract.hasRole(UNIVERSITY_ROLE, university1.address)).to.equal(false);
    });

    it("admin revokes EMPLOYER_ROLE — hasRole returns false", async function () {
      const { contract, admin, employer } = await loadFixture(deployFixture);
      await contract.connect(admin).revokeEmployerRole(employer.address);
      const EMPLOYER_ROLE = await contract.EMPLOYER_ROLE();
      expect(await contract.hasRole(EMPLOYER_ROLE, employer.address)).to.equal(false);
    });

    it("reverts ZeroAddress when granting to address(0)", async function () {
      const { contract, admin } = await loadFixture(deployFixture);
      await expect(
        contract.connect(admin).grantUniversityRole(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(contract, "ZeroAddress");

      await expect(
        contract.connect(admin).grantEmployerRole(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(contract, "ZeroAddress");
    });

    it("EDGE: stranger cannot grant roles — OZ reverts", async function () {
      const { contract, stranger } = await loadFixture(deployFixture);
      await expect(
        contract.connect(stranger).grantUniversityRole(stranger.address)
      ).to.be.reverted;
    });

    it("EDGE: university cannot grant employer role — OZ reverts", async function () {
      const { contract, university1, stranger } = await loadFixture(deployFixture);
      await expect(
        contract.connect(university1).grantEmployerRole(stranger.address)
      ).to.be.reverted;
    });
  });

  // ── 3. issueDegree ───────────────────────────────────────────────────────────

  describe("issueDegree", function () {
    it("HAPPY PATH: university issues a degree and DegreeIssued is emitted", async function () {
      const { contract, university1 } = await loadFixture(deployFixture);
      const hash = expectedHash(SAMPLE.studentId, SAMPLE.program, SAMPLE.graduationDate, university1.address);

      await expect(
        contract.connect(university1).issueDegree(
          SAMPLE.studentName, SAMPLE.studentId, SAMPLE.program, SAMPLE.graduationDate
        )
      )
        .to.emit(contract, "DegreeIssued")
        .withArgs(hash, university1.address, SAMPLE.studentName, SAMPLE.studentId, SAMPLE.program, SAMPLE.graduationDate, anyValue);
    });

    it("increments getTotalIssued after each issuance", async function () {
      const { contract, university1, university2 } = await loadFixture(deployFixture);
      await contract.connect(university1).issueDegree(SAMPLE.studentName,  SAMPLE.studentId,  SAMPLE.program,  SAMPLE.graduationDate);
      await contract.connect(university2).issueDegree(SAMPLE2.studentName, SAMPLE2.studentId, SAMPLE2.program, SAMPLE2.graduationDate);
      expect(await contract.getTotalIssued()).to.equal(2n);
    });

    it("returns the correct degreeHash from the transaction", async function () {
      const { contract, university1 } = await loadFixture(deployFixture);
      const hash = expectedHash(SAMPLE.studentId, SAMPLE.program, SAMPLE.graduationDate, university1.address);

      // Use staticCall to get the return value
      const returned = await contract.connect(university1).issueDegree.staticCall(
        SAMPLE.studentName, SAMPLE.studentId, SAMPLE.program, SAMPLE.graduationDate
      );
      expect(returned).to.equal(hash);
    });

    it("EDGE: DegreeAlreadyExists — same student+program+date+university reverts", async function () {
      const { contract, university1 } = await loadFixture(deployFixture);
      const hash = expectedHash(SAMPLE.studentId, SAMPLE.program, SAMPLE.graduationDate, university1.address);

      await contract.connect(university1).issueDegree(
        SAMPLE.studentName, SAMPLE.studentId, SAMPLE.program, SAMPLE.graduationDate
      );

      await expect(
        contract.connect(university1).issueDegree(
          SAMPLE.studentName, SAMPLE.studentId, SAMPLE.program, SAMPLE.graduationDate
        )
      )
        .to.be.revertedWithCustomError(contract, "DegreeAlreadyExists")
        .withArgs(hash);
    });

    it("EDGE: same student+program from DIFFERENT university → different hash, does NOT revert", async function () {
      const { contract, university1, university2 } = await loadFixture(deployFixture);

      // Both universities can issue the same student with the same program — they are different hashes
      await expect(
        contract.connect(university1).issueDegree(
          SAMPLE.studentName, SAMPLE.studentId, SAMPLE.program, SAMPLE.graduationDate
        )
      ).to.not.be.reverted;

      await expect(
        contract.connect(university2).issueDegree(
          SAMPLE.studentName, SAMPLE.studentId, SAMPLE.program, SAMPLE.graduationDate
        )
      ).to.not.be.reverted;

      expect(await contract.getTotalIssued()).to.equal(2n);
    });

    it("EDGE: InvalidInput — empty studentName reverts", async function () {
      const { contract, university1 } = await loadFixture(deployFixture);
      await expect(
        contract.connect(university1).issueDegree("", SAMPLE.studentId, SAMPLE.program, SAMPLE.graduationDate)
      ).to.be.revertedWithCustomError(contract, "InvalidInput").withArgs("studentName");
    });

    it("EDGE: InvalidInput — empty program reverts", async function () {
      const { contract, university1 } = await loadFixture(deployFixture);
      await expect(
        contract.connect(university1).issueDegree(SAMPLE.studentName, SAMPLE.studentId, "", SAMPLE.graduationDate)
      ).to.be.revertedWithCustomError(contract, "InvalidInput").withArgs("program");
    });

    it("EDGE: Unauthorized — stranger cannot issue a degree", async function () {
      const { contract, stranger } = await loadFixture(deployFixture);
      await expect(
        contract.connect(stranger).issueDegree(
          SAMPLE.studentName, SAMPLE.studentId, SAMPLE.program, SAMPLE.graduationDate
        )
      ).to.be.reverted;
    });

    it("EDGE: Unauthorized — employer cannot issue a degree", async function () {
      const { contract, employer } = await loadFixture(deployFixture);
      await expect(
        contract.connect(employer).issueDegree(
          SAMPLE.studentName, SAMPLE.studentId, SAMPLE.program, SAMPLE.graduationDate
        )
      ).to.be.reverted;
    });
  });

  // ── 4. verifyDegree ──────────────────────────────────────────────────────────

  describe("verifyDegree", function () {
    async function issueOne(contract, university) {
      await contract.connect(university).issueDegree(
        SAMPLE.studentName, SAMPLE.studentId, SAMPLE.program, SAMPLE.graduationDate
      );
      return expectedHash(SAMPLE.studentId, SAMPLE.program, SAMPLE.graduationDate, university.address);
    }

    it("HAPPY PATH: valid degree returns exists=true, valid=true, revoked=false", async function () {
      const { contract, university1, stranger } = await loadFixture(deployFixture);
      const hash = await issueOne(contract, university1);

      const result = await contract.connect(stranger).verifyDegree.staticCall(hash);
      expect(result.exists).to.equal(true);
      expect(result.valid).to.equal(true);
      expect(result.revoked).to.equal(false);
    });

    it("PUBLIC: any caller (no role) can verify — stranger succeeds", async function () {
      const { contract, university1, stranger } = await loadFixture(deployFixture);
      const hash = await issueOne(contract, university1);

      // Must NOT revert for a stranger
      await expect(contract.connect(stranger).verifyDegree(hash)).to.not.be.reverted;
    });

    it("emits DegreeVerified with isValid=true for a genuine degree", async function () {
      const { contract, university1, employer } = await loadFixture(deployFixture);
      const hash = await issueOne(contract, university1);

      await expect(contract.connect(employer).verifyDegree(hash))
        .to.emit(contract, "DegreeVerified")
        .withArgs(hash, employer.address, true, true, false, anyValue);
    });

    it("FAKE DEGREE: unknown hash returns exists=false, valid=false — NO revert", async function () {
      const { contract, stranger } = await loadFixture(deployFixture);
      const fakeHash = ethers.keccak256(ethers.toUtf8Bytes("this-degree-was-never-issued"));

      // MUST NOT revert — fraud attempt is silently logged via event
      const result = await contract.connect(stranger).verifyDegree.staticCall(fakeHash);
      expect(result.exists).to.equal(false);
      expect(result.valid).to.equal(false);
      expect(result.revoked).to.equal(false);
    });

    it("FAKE DEGREE: DegreeVerified event emitted with exists=false (fraud on-chain log)", async function () {
      const { contract, employer } = await loadFixture(deployFixture);
      const fakeHash = ethers.keccak256(ethers.toUtf8Bytes("fake-degree-simulation"));

      await expect(contract.connect(employer).verifyDegree(fakeHash))
        .to.emit(contract, "DegreeVerified")
        .withArgs(fakeHash, employer.address, false, false, false, anyValue);
    });

    it("EDGE: revoked degree returns exists=true, valid=false, revoked=true", async function () {
      const { contract, university1, employer } = await loadFixture(deployFixture);
      const hash = await issueOne(contract, university1);

      await contract.connect(university1).revokeDegree(hash);

      const result = await contract.connect(employer).verifyDegree.staticCall(hash);
      expect(result.exists).to.equal(true);
      expect(result.valid).to.equal(false);
      expect(result.revoked).to.equal(true);
    });

    it("EDGE: revoked degree emits DegreeVerified with valid=false, revoked=true", async function () {
      const { contract, university1, employer } = await loadFixture(deployFixture);
      const hash = await issueOne(contract, university1);
      await contract.connect(university1).revokeDegree(hash);

      await expect(contract.connect(employer).verifyDegree(hash))
        .to.emit(contract, "DegreeVerified")
        .withArgs(hash, employer.address, true, false, true, anyValue);
    });
  });

  // ── 5. revokeDegree ──────────────────────────────────────────────────────────

  describe("revokeDegree", function () {
    async function issueOne(contract, university) {
      await contract.connect(university).issueDegree(
        SAMPLE.studentName, SAMPLE.studentId, SAMPLE.program, SAMPLE.graduationDate
      );
      return expectedHash(SAMPLE.studentId, SAMPLE.program, SAMPLE.graduationDate, university.address);
    }

    it("HAPPY PATH: issuing university revokes its own degree and DegreeRevoked emitted", async function () {
      const { contract, university1 } = await loadFixture(deployFixture);
      const hash = await issueOne(contract, university1);

      await expect(contract.connect(university1).revokeDegree(hash))
        .to.emit(contract, "DegreeRevoked")
        .withArgs(hash, university1.address, anyValue);
    });

    it("sets revoked=true in storage after revocation", async function () {
      const { contract, university1 } = await loadFixture(deployFixture);
      const hash = await issueOne(contract, university1);
      await contract.connect(university1).revokeDegree(hash);

      const details = await contract.getDegreeDetails(hash);
      expect(details.revoked).to.equal(true);
    });

    it("EDGE: DegreeNotFound — unknown hash reverts", async function () {
      const { contract, university1 } = await loadFixture(deployFixture);
      const unknownHash = ethers.id("never-issued");

      await expect(
        contract.connect(university1).revokeDegree(unknownHash)
      )
        .to.be.revertedWithCustomError(contract, "DegreeNotFound")
        .withArgs(unknownHash);
    });

    it("EDGE: NotIssuingUniversity — different university cannot revoke", async function () {
      const { contract, university1, university2 } = await loadFixture(deployFixture);
      const hash = await issueOne(contract, university1);

      await expect(contract.connect(university2).revokeDegree(hash))
        .to.be.revertedWithCustomError(contract, "NotIssuingUniversity")
        .withArgs(hash, university2.address);
    });

    it("EDGE: DegreeAlreadyRevoked — double revocation reverts", async function () {
      const { contract, university1 } = await loadFixture(deployFixture);
      const hash = await issueOne(contract, university1);

      await contract.connect(university1).revokeDegree(hash);

      await expect(contract.connect(university1).revokeDegree(hash))
        .to.be.revertedWithCustomError(contract, "DegreeAlreadyRevoked")
        .withArgs(hash);
    });

    it("EDGE: Unauthorized — stranger cannot revoke", async function () {
      const { contract, university1, stranger } = await loadFixture(deployFixture);
      const hash = await issueOne(contract, university1);
      await expect(contract.connect(stranger).revokeDegree(hash)).to.be.reverted;
    });

    it("EDGE: Unauthorized — employer cannot revoke", async function () {
      const { contract, university1, employer } = await loadFixture(deployFixture);
      const hash = await issueOne(contract, university1);
      await expect(contract.connect(employer).revokeDegree(hash)).to.be.reverted;
    });
  });

  // ── 6. getDegreeDetails ──────────────────────────────────────────────────────

  describe("getDegreeDetails", function () {
    it("returns correct struct for an issued degree", async function () {
      const { contract, university1 } = await loadFixture(deployFixture);
      await contract.connect(university1).issueDegree(
        SAMPLE.studentName, SAMPLE.studentId, SAMPLE.program, SAMPLE.graduationDate
      );
      const hash    = expectedHash(SAMPLE.studentId, SAMPLE.program, SAMPLE.graduationDate, university1.address);
      const details = await contract.getDegreeDetails(hash);

      expect(details.studentName).to.equal(SAMPLE.studentName);
      expect(details.studentId).to.equal(SAMPLE.studentId);
      expect(details.program).to.equal(SAMPLE.program);
      expect(details.graduationDate).to.equal(BigInt(SAMPLE.graduationDate));
      expect(details.issuingUniversity).to.equal(university1.address);
      expect(details.degreeHash).to.equal(hash);
      expect(details.revoked).to.equal(false);
    });

    it("EDGE: DegreeNotFound for an unknown hash — reverts", async function () {
      const { contract } = await loadFixture(deployFixture);
      const unknownHash  = ethers.id("ghost-hash");

      await expect(contract.getDegreeDetails(unknownHash))
        .to.be.revertedWithCustomError(contract, "DegreeNotFound")
        .withArgs(unknownHash);
    });

    it("reflects revoked=true after revocation", async function () {
      const { contract, university1 } = await loadFixture(deployFixture);
      await contract.connect(university1).issueDegree(
        SAMPLE.studentName, SAMPLE.studentId, SAMPLE.program, SAMPLE.graduationDate
      );
      const hash = expectedHash(SAMPLE.studentId, SAMPLE.program, SAMPLE.graduationDate, university1.address);
      await contract.connect(university1).revokeDegree(hash);

      const details = await contract.getDegreeDetails(hash);
      expect(details.revoked).to.equal(true);
    });

    it("any caller can call getDegreeDetails (view, no role check)", async function () {
      const { contract, university1, stranger } = await loadFixture(deployFixture);
      await contract.connect(university1).issueDegree(
        SAMPLE.studentName, SAMPLE.studentId, SAMPLE.program, SAMPLE.graduationDate
      );
      const hash = expectedHash(SAMPLE.studentId, SAMPLE.program, SAMPLE.graduationDate, university1.address);

      // Stranger calling view function — must not revert
      await expect(contract.connect(stranger).getDegreeDetails(hash)).to.not.be.reverted;
    });
  });

  // ── 7. Full CCP simulation scenario ─────────────────────────────────────────

  describe("CCP Simulation Scenario", function () {
    it("5 degrees issued across 2 universities, 3 verified, 1 fake attempt", async function () {
      const { contract, university1, university2, employer, stranger } =
        await loadFixture(deployFixture);

      const degrees = [
        { uni: university1, name: "Ali Hassan",   id: "STU-001", prog: "BSCS", date: 1700000000 },
        { uni: university1, name: "Sara Khan",    id: "STU-002", prog: "BSCE", date: 1700086400 },
        { uni: university1, name: "Umar Farooq", id: "STU-003", prog: "BSIT", date: 1700172800 },
        { uni: university2, name: "Sara Khan",   id: "STU-002", prog: "MBA",  date: 1700259200 },
        { uni: university2, name: "Nadia Malik", id: "STU-004", prog: "BSEE", date: 1700345600 },
      ];

      // Issue 5 degrees
      const hashes = [];
      for (const d of degrees) {
        await contract.connect(d.uni).issueDegree(d.name, d.id, d.prog, d.date);
        hashes.push(expectedHash(d.id, d.prog, d.date, d.uni.address));
      }
      expect(await contract.getTotalIssued()).to.equal(5n);

      // Verify 3 genuine degrees
      for (const hash of hashes.slice(0, 3)) {
        const r = await contract.connect(employer).verifyDegree.staticCall(hash);
        expect(r.exists).to.equal(true);
        expect(r.valid).to.equal(true);
      }

      // 1 fake degree attempt
      const fakeHash = ethers.keccak256(ethers.toUtf8Bytes("impostor-degree-fraud-001"));
      const fraud = await contract.connect(stranger).verifyDegree.staticCall(fakeHash);
      expect(fraud.exists).to.equal(false);
      expect(fraud.valid).to.equal(false);

      await expect(contract.connect(stranger).verifyDegree(fakeHash))
        .to.emit(contract, "DegreeVerified")
        .withArgs(fakeHash, stranger.address, false, false, false, anyValue);
    });
  });

});
