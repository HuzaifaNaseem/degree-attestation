// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title  DegreeAttestation
 * @notice Issues, verifies, and revokes academic degree credentials on a
 *         private Ethereum network.  Only the keccak256 hash and non-sensitive
 *         metadata (name, program, date) are stored on-chain; all PII is kept
 *         encrypted in MongoDB (off-chain).
 *
 * Roles
 * ─────
 *   DEFAULT_ADMIN_ROLE  – platform deployer; grants / revokes other roles
 *   UNIVERSITY_ROLE     – may issue and revoke their own degrees
 *   EMPLOYER_ROLE       – may submit verification requests
 */
contract DegreeAttestation is AccessControl {

    // ── Role constants ───────────────────────────────────────────────────────

    bytes32 public constant UNIVERSITY_ROLE = keccak256("UNIVERSITY_ROLE");
    bytes32 public constant EMPLOYER_ROLE   = keccak256("EMPLOYER_ROLE");

    // ── Custom errors (cheaper than require strings per EIP-838) ─────────────

    /// @notice Emitted when the same degree hash is issued twice
    error DegreeAlreadyIssued(bytes32 degreeHash);

    /// @notice Emitted when querying / revoking a hash that was never issued
    error DegreeNotFound(bytes32 degreeHash);

    /// @notice Emitted when trying to revoke an already-revoked degree
    error DegreeAlreadyRevoked(bytes32 degreeHash);

    /// @notice Emitted when a university tries to revoke another university's degree
    error NotIssuingUniversity(bytes32 degreeHash);

    /// @notice Emitted when bytes32(0) is supplied as a degree hash
    error InvalidDegreeHash();

    /// @notice Emitted when address(0) is supplied to a role function
    error ZeroAddress();

    // ── Data structures ──────────────────────────────────────────────────────

    /**
     * @dev Only non-sensitive fields stored on-chain.
     *      Sensitive data (national ID, GPA, DOB) lives AES-256 encrypted
     *      in MongoDB, referenced by degreeHash.
     */
    struct DegreeRecord {
        address issuingUniversity; // wallet of the issuing university
        string  studentName;       // first + last name only (non-sensitive)
        string  program;           // e.g. "BSCS", "BSCE"
        uint256 graduationDate;    // unix timestamp of graduation
        uint256 issuedAt;          // block.timestamp at issuance (0 = does not exist)
        bool    isRevoked;
        uint256 revokedAt;         // block.timestamp of revocation (0 if active)
    }

    /// @dev Primary storage: degreeHash → record
    mapping(bytes32 => DegreeRecord) private _degrees;

    /// @dev Running counter of all issued degrees (never decremented on revocation)
    uint256 private _totalIssued;

    // ── Events ───────────────────────────────────────────────────────────────

    /**
     * @notice Emitted when a university successfully issues a degree.
     * @param degreeHash     keccak256 hash constructed off-chain by the backend
     * @param university     address of the issuing university wallet
     * @param studentName    non-sensitive name for UI display
     * @param program        degree program identifier
     * @param graduationDate unix timestamp
     * @param timestamp      block.timestamp at issuance
     */
    event DegreeIssued(
        bytes32 indexed degreeHash,
        address indexed university,
        string  studentName,
        string  program,
        uint256 graduationDate,
        uint256 timestamp
    );

    /**
     * @notice Emitted on every verification call — including fraud attempts.
     *         isValid=false + exists=false signals a fake degree attempt.
     */
    event DegreeVerified(
        bytes32 indexed degreeHash,
        address indexed verifier,
        bool    isValid,   // true only if exists AND not revoked
        bool    isRevoked,
        uint256 timestamp
    );

    /**
     * @notice Emitted when a university revokes one of its own degrees.
     */
    event DegreeRevoked(
        bytes32 indexed degreeHash,
        address indexed university,
        string  reason,
        uint256 timestamp
    );

    /**
     * @notice Emitted alongside OZ's built-in RoleGranted for admin audit trail.
     */
    event RoleGrantedByAdmin(
        bytes32 indexed role,
        address indexed account,
        address indexed admin,
        uint256 timestamp
    );

    // ── Constructor ──────────────────────────────────────────────────────────

    /**
     * @dev OZ v5 pattern: _grantRole instead of deprecated _setupRole.
     *      The deployer becomes the sole DEFAULT_ADMIN_ROLE holder.
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ── Role management (ADMIN only) ─────────────────────────────────────────

    /**
     * @notice Grant UNIVERSITY_ROLE to a wallet address.
     * @param account  wallet to receive the role
     */
    function grantUniversityRole(address account)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (account == address(0)) revert ZeroAddress();
        _grantRole(UNIVERSITY_ROLE, account);
        emit RoleGrantedByAdmin(UNIVERSITY_ROLE, account, msg.sender, block.timestamp);
    }

    /**
     * @notice Revoke UNIVERSITY_ROLE from a wallet address.
     */
    function revokeUniversityRole(address account)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (account == address(0)) revert ZeroAddress();
        _revokeRole(UNIVERSITY_ROLE, account);
    }

    /**
     * @notice Grant EMPLOYER_ROLE to a wallet address.
     */
    function grantEmployerRole(address account)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (account == address(0)) revert ZeroAddress();
        _grantRole(EMPLOYER_ROLE, account);
        emit RoleGrantedByAdmin(EMPLOYER_ROLE, account, msg.sender, block.timestamp);
    }

    /**
     * @notice Revoke EMPLOYER_ROLE from a wallet address.
     */
    function revokeEmployerRole(address account)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (account == address(0)) revert ZeroAddress();
        _revokeRole(EMPLOYER_ROLE, account);
    }

    // ── Degree issuance (UNIVERSITY only) ───────────────────────────────────

    /**
     * @notice Issue a degree by registering its keccak256 hash on-chain.
     * @param degreeHash     Hash produced by backend: keccak256(nationalId + name +
     *                       program + graduationDate + universityAddress + nonce).
     *                       The nonce prevents collisions for identical records.
     * @param studentName    Student's first + last name (non-sensitive)
     * @param program        Degree program (e.g. "BSCS")
     * @param graduationDate Unix timestamp of graduation
     */
    function issueDegree(
        bytes32        degreeHash,
        string calldata studentName,
        string calldata program,
        uint256         graduationDate
    )
        external
        onlyRole(UNIVERSITY_ROLE)
    {
        if (degreeHash == bytes32(0))            revert InvalidDegreeHash();
        if (_degrees[degreeHash].issuedAt != 0) revert DegreeAlreadyIssued(degreeHash);

        _degrees[degreeHash] = DegreeRecord({
            issuingUniversity: msg.sender,
            studentName:       studentName,
            program:           program,
            graduationDate:    graduationDate,
            issuedAt:          block.timestamp,
            isRevoked:         false,
            revokedAt:         0
        });

        _totalIssued++;

        emit DegreeIssued(
            degreeHash,
            msg.sender,
            studentName,
            program,
            graduationDate,
            block.timestamp
        );
    }

    // ── Degree verification (EMPLOYER only) ─────────────────────────────────

    /**
     * @notice Verify a degree by its hash.
     *         Always emits DegreeVerified — even for unknown hashes — so that
     *         fraud attempts are captured on-chain and in the audit log.
     * @return exists            true if the hash was ever registered
     * @return isRevoked         true if subsequently revoked
     * @return issuingUniversity wallet of the issuing university (zero if not found)
     * @return program           degree program string
     * @return issuedAt          block.timestamp of issuance (0 if not found)
     */
    function verifyDegree(bytes32 degreeHash)
        external
        onlyRole(EMPLOYER_ROLE)
        returns (
            bool    exists,
            bool    isRevoked,
            address issuingUniversity,
            string  memory program,
            uint256 issuedAt
        )
    {
        if (degreeHash == bytes32(0)) revert InvalidDegreeHash();

        DegreeRecord storage rec = _degrees[degreeHash];

        exists            = rec.issuedAt != 0;
        isRevoked         = rec.isRevoked;
        issuingUniversity = rec.issuingUniversity;
        program           = rec.program;
        issuedAt          = rec.issuedAt;

        // Emit for every call — fraud attempts (exists=false) are still logged
        emit DegreeVerified(
            degreeHash,
            msg.sender,
            exists && !isRevoked,
            isRevoked,
            block.timestamp
        );
    }

    // ── Degree revocation (UNIVERSITY — own degrees only) ────────────────────

    /**
     * @notice Revoke a degree.  Only the university that issued it may revoke it.
     * @param degreeHash  hash of the degree to revoke
     * @param reason      human-readable revocation reason (stored on-chain)
     */
    function revokeDegree(bytes32 degreeHash, string calldata reason)
        external
        onlyRole(UNIVERSITY_ROLE)
    {
        DegreeRecord storage rec = _degrees[degreeHash];

        if (rec.issuedAt == 0)                    revert DegreeNotFound(degreeHash);
        if (rec.issuingUniversity != msg.sender)  revert NotIssuingUniversity(degreeHash);
        if (rec.isRevoked)                        revert DegreeAlreadyRevoked(degreeHash);

        rec.isRevoked = true;
        rec.revokedAt = block.timestamp;

        emit DegreeRevoked(degreeHash, msg.sender, reason, block.timestamp);
    }

    // ── Public read functions (no role restriction) ──────────────────────────

    /**
     * @notice Read-only status check — any caller (incl. unauthenticated).
     *         The hash itself reveals nothing; the sensitive data is off-chain.
     */
    function getDegreeStatus(bytes32 degreeHash)
        external
        view
        returns (
            bool    exists,
            bool    isRevoked,
            address issuingUniversity,
            uint256 issuedAt
        )
    {
        DegreeRecord storage rec = _degrees[degreeHash];
        exists            = rec.issuedAt != 0;
        isRevoked         = rec.isRevoked;
        issuingUniversity = rec.issuingUniversity;
        issuedAt          = rec.issuedAt;
    }

    /// @notice Returns total degrees ever issued (revoked degrees still counted).
    function getTotalIssued() external view returns (uint256) {
        return _totalIssued;
    }
}
