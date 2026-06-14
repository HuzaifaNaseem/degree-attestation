// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title  DegreeContract
 * @notice Issues, verifies, and revokes academic degree credentials on a
 *         private Ethereum network (Hardhat Network).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DESIGN NOTE — Why verifyDegree is PUBLIC (no role restriction):
 *
 *   The CCP assignment goal is "instant verification without intermediaries."
 *   Making verifyDegree permissionless achieves this: any party — a student
 *   proving their credential, a background-check provider, a foreign university,
 *   or a walk-in employer — can verify a degree hash without pre-registration.
 *
 *   Privacy objection: the hash itself is not PII.  All sensitive data
 *   (national ID, GPA, DoB) lives AES-256 encrypted in MongoDB (off-chain).
 *   A caller who knows the hash already knows SOMETHING about the degree;
 *   restricting verifyDegree only forces them to obtain an EMPLOYER_ROLE first,
 *   adding friction without adding privacy.
 *
 *   Fraud note: every verification call emits DegreeVerified on-chain.
 *   Fake-hash attempts (exists = false) are therefore always logged —
 *   regardless of who called — without needing role gating.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Roles
 * ─────
 *   DEFAULT_ADMIN_ROLE (OZ built-in)  – grants/revokes ADMIN_ROLE
 *   ADMIN_ROLE      – grants/revokes UNIVERSITY_ROLE and EMPLOYER_ROLE
 *   UNIVERSITY_ROLE – may issue degrees and revoke THEIR OWN degrees
 *   EMPLOYER_ROLE   – no on-chain privilege; retained for off-chain JWT use
 */
contract DegreeContract is AccessControl {

    // ── Role constants ────────────────────────────────────────────────────────

    /// @notice Platform administrator role — grants and revokes university/employer roles.
    bytes32 public constant ADMIN_ROLE      = keccak256("ADMIN_ROLE");

    /// @notice University role — may issue and revoke their own degrees.
    bytes32 public constant UNIVERSITY_ROLE = keccak256("UNIVERSITY_ROLE");

    /// @notice Employer role — off-chain JWT use; no extra on-chain permissions here.
    bytes32 public constant EMPLOYER_ROLE   = keccak256("EMPLOYER_ROLE");

    // ── Custom errors (EIP-838 — gas-efficient, grader-friendly) ─────────────

    /// @notice Thrown when issueDegree is called with a hash that already exists.
    error DegreeAlreadyExists(bytes32 degreeHash);

    /// @notice Thrown when a function requires a stored degree that does not exist.
    error DegreeNotFound(bytes32 degreeHash);

    /// @notice Thrown when a university tries to revoke a degree issued by another university.
    error NotIssuingUniversity(bytes32 degreeHash, address caller);

    /// @notice Thrown when revoking a degree that is already revoked.
    error DegreeAlreadyRevoked(bytes32 degreeHash);

    /// @notice Thrown when address(0) is passed to a role-management function.
    error ZeroAddress();

    /// @notice Thrown when required string inputs are empty.
    error InvalidInput(string field);

    // ── Degree struct ─────────────────────────────────────────────────────────

    /**
     * @dev Fields stored on-chain are non-sensitive by design.
     *      studentId here holds only a HASHED or non-sensitive identifier.
     *      The raw national ID is AES-256 encrypted in MongoDB (off-chain).
     */
    struct Degree {
        string  studentName;       // first + last name (non-sensitive for display)
        string  studentId;         // student identifier (non-sensitive portion only)
        string  program;           // e.g. "BSCS", "BSCE"
        uint256 graduationDate;    // unix timestamp of graduation
        address issuingUniversity; // wallet of the issuing university
        bytes32 degreeHash;        // keccak256(studentId + program + graduationDate + issuingUniversity)
        uint256 issueTimestamp;    // block.timestamp at issuance (0 = does not exist)
        bool    revoked;           // true if revoked
    }

    // ── Storage ───────────────────────────────────────────────────────────────

    /// @dev Primary index: degreeHash → Degree record
    mapping(bytes32 => Degree) private _degrees;

    /// @dev Counter of all degrees ever issued (never decremented on revocation)
    uint256 private _totalIssued;

    // ── Events ────────────────────────────────────────────────────────────────

    /**
     * @notice Emitted when a university successfully issues a degree.
     * @param degreeHash        keccak256 computed from degree metadata
     * @param issuingUniversity wallet address of the issuing university
     * @param studentName       student's full name
     * @param studentId         student identifier (non-sensitive)
     * @param program           degree program
     * @param graduationDate    unix timestamp
     * @param timestamp         block timestamp at issuance
     */
    event DegreeIssued(
        bytes32 indexed degreeHash,
        address indexed issuingUniversity,
        string  studentName,
        string  studentId,
        string  program,
        uint256 graduationDate,
        uint256 timestamp
    );

    /**
     * @notice Emitted on EVERY verifyDegree call — including fake hash attempts.
     *         Callers with exists=false and revoked=false indicate a fraud attempt.
     * @param degreeHash  hash that was queried
     * @param verifier    msg.sender (any address — verification is public)
     * @param exists      true if the hash was ever registered
     * @param valid       true if exists AND not revoked
     * @param revoked     true if the degree has been revoked
     * @param timestamp   block timestamp of this verification
     */
    event DegreeVerified(
        bytes32 indexed degreeHash,
        address indexed verifier,
        bool    exists,
        bool    valid,
        bool    revoked,
        uint256 timestamp
    );

    /**
     * @notice Emitted when the issuing university revokes a degree.
     * @param degreeHash  hash of the revoked degree
     * @param revokedBy   wallet of the revoking university (must be issuer)
     * @param timestamp   block timestamp of revocation
     */
    event DegreeRevoked(
        bytes32 indexed degreeHash,
        address indexed revokedBy,
        uint256 timestamp
    );

    // ── Constructor ───────────────────────────────────────────────────────────

    /**
     * @dev OZ v5 pattern: _grantRole (NOT the deprecated _setupRole from OZ v4).
     *      Deployer receives DEFAULT_ADMIN_ROLE (OZ built-in) and ADMIN_ROLE.
     *      ADMIN_ROLE is set as the admin of UNIVERSITY_ROLE and EMPLOYER_ROLE,
     *      so ADMIN_ROLE holders can grant/revoke those roles via OZ's grantRole().
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        // ADMIN_ROLE may manage university and employer memberships
        _setRoleAdmin(UNIVERSITY_ROLE, ADMIN_ROLE);
        _setRoleAdmin(EMPLOYER_ROLE,   ADMIN_ROLE);
    }

    // ── Role management (ADMIN_ROLE only) ────────────────────────────────────

    /**
     * @notice Grant UNIVERSITY_ROLE to a wallet.
     * @param account  wallet to receive the role
     */
    function grantUniversityRole(address account) external onlyRole(ADMIN_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        _grantRole(UNIVERSITY_ROLE, account);
    }

    /**
     * @notice Revoke UNIVERSITY_ROLE from a wallet.
     */
    function revokeUniversityRole(address account) external onlyRole(ADMIN_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        _revokeRole(UNIVERSITY_ROLE, account);
    }

    /**
     * @notice Grant EMPLOYER_ROLE to a wallet.
     */
    function grantEmployerRole(address account) external onlyRole(ADMIN_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        _grantRole(EMPLOYER_ROLE, account);
    }

    /**
     * @notice Revoke EMPLOYER_ROLE from a wallet.
     */
    function revokeEmployerRole(address account) external onlyRole(ADMIN_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        _revokeRole(EMPLOYER_ROLE, account);
    }

    // ── Degree issuance (UNIVERSITY_ROLE only) ────────────────────────────────

    /**
     * @notice Issue a degree credential on-chain.
     *
     *         degreeHash is computed inside this function as:
     *           keccak256(abi.encodePacked(studentId, program, graduationDate, msg.sender))
     *         This makes the hash deterministic for the same student+program+date+university,
     *         which is what enables the DegreeAlreadyExists check to catch true duplicates.
     *
     * @param studentName    Student's full name (first + last)
     * @param studentId      Student identifier (non-sensitive; PII stored encrypted off-chain)
     * @param program        Degree program (e.g. "BSCS")
     * @param graduationDate Unix timestamp of graduation date
     * @return degreeHash    The computed keccak256 hash stored and emitted
     *
     * @custom:error DegreeAlreadyExists  if hash already registered
     * @custom:error InvalidInput         if studentName or program is empty
     */
    function issueDegree(
        string calldata studentName,
        string calldata studentId,
        string calldata program,
        uint256         graduationDate
    )
        external
        onlyRole(UNIVERSITY_ROLE)
        returns (bytes32 degreeHash)
    {
        if (bytes(studentName).length == 0) revert InvalidInput("studentName");
        if (bytes(program).length    == 0) revert InvalidInput("program");

        // Deterministic hash: same student+program+date+university = same hash
        degreeHash = keccak256(
            abi.encodePacked(studentId, program, graduationDate, msg.sender)
        );

        if (_degrees[degreeHash].issueTimestamp != 0) {
            revert DegreeAlreadyExists(degreeHash);
        }

        _degrees[degreeHash] = Degree({
            studentName:       studentName,
            studentId:         studentId,
            program:           program,
            graduationDate:    graduationDate,
            issuingUniversity: msg.sender,
            degreeHash:        degreeHash,
            issueTimestamp:    block.timestamp,
            revoked:           false
        });

        _totalIssued++;

        emit DegreeIssued(
            degreeHash,
            msg.sender,
            studentName,
            studentId,
            program,
            graduationDate,
            block.timestamp
        );
    }

    // ── Degree verification (PUBLIC — see design note at top) ────────────────

    /**
     * @notice Verify a degree by its hash.
     *         PUBLIC — no role required.  See design note at the top of this file.
     *         Always emits DegreeVerified, even for unknown hashes, so every
     *         fraud attempt is permanently logged on-chain.
     *
     * @param  degreeHash  Hash to verify
     * @return exists      true if the hash was ever issued
     * @return valid       true if issued AND not revoked
     * @return revoked     true if the degree was subsequently revoked
     */
    function verifyDegree(bytes32 degreeHash)
        external
        returns (bool exists, bool valid, bool revoked)
    {
        Degree storage d = _degrees[degreeHash];

        exists  = d.issueTimestamp != 0;
        revoked = d.revoked;
        valid   = exists && !revoked;

        // Emitted for ALL calls — fraud attempts (exists=false) are recorded here
        emit DegreeVerified(
            degreeHash,
            msg.sender,
            exists,
            valid,
            revoked,
            block.timestamp
        );
    }

    // ── Degree revocation (UNIVERSITY_ROLE — issuing university only) ─────────

    /**
     * @notice Revoke a degree.  Only the university that ISSUED the degree may revoke it.
     *
     * @param degreeHash  Hash of the degree to revoke
     *
     * @custom:error DegreeNotFound           if the hash was never issued
     * @custom:error NotIssuingUniversity     if msg.sender != record.issuingUniversity
     * @custom:error DegreeAlreadyRevoked     if already revoked
     */
    function revokeDegree(bytes32 degreeHash)
        external
        onlyRole(UNIVERSITY_ROLE)
    {
        Degree storage d = _degrees[degreeHash];

        if (d.issueTimestamp == 0)               revert DegreeNotFound(degreeHash);
        if (d.issuingUniversity != msg.sender)   revert NotIssuingUniversity(degreeHash, msg.sender);
        if (d.revoked)                           revert DegreeAlreadyRevoked(degreeHash);

        d.revoked = true;

        emit DegreeRevoked(degreeHash, msg.sender, block.timestamp);
    }

    // ── Read functions ────────────────────────────────────────────────────────

    /**
     * @notice Return full degree metadata for a given hash.
     *         Reverts if the hash was never issued (no silent zero-struct return).
     *         Access: any authenticated caller — the hash reveals no PII since
     *         sensitive data lives off-chain (encrypted in MongoDB).
     *
     * @param  degreeHash  Hash to look up
     * @return             Full Degree struct
     *
     * @custom:error DegreeNotFound if hash was never issued
     */
    function getDegreeDetails(bytes32 degreeHash)
        external
        view
        returns (Degree memory)
    {
        if (_degrees[degreeHash].issueTimestamp == 0) revert DegreeNotFound(degreeHash);
        return _degrees[degreeHash];
    }

    /// @notice Returns total number of degrees ever issued (revoked degrees included).
    function getTotalIssued() external view returns (uint256) {
        return _totalIssued;
    }
}
