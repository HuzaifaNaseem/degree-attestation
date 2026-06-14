// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  IDegreeAttestation
 * @notice ABI interface consumed by the backend (ethers v6 Contract factory)
 *         and the test helpers.  Keeps backend and contract in sync without
 *         importing the full implementation.
 */
interface IDegreeAttestation {

    // ── Events ───────────────────────────────────────────────────────────────

    event DegreeIssued(
        bytes32 indexed degreeHash,
        address indexed university,
        string  studentName,
        string  program,
        uint256 graduationDate,
        uint256 timestamp
    );

    event DegreeVerified(
        bytes32 indexed degreeHash,
        address indexed verifier,
        bool    isValid,
        bool    isRevoked,
        uint256 timestamp
    );

    event DegreeRevoked(
        bytes32 indexed degreeHash,
        address indexed university,
        string  reason,
        uint256 timestamp
    );

    event RoleGrantedByAdmin(
        bytes32 indexed role,
        address indexed account,
        address indexed admin,
        uint256 timestamp
    );

    // ── Role management ──────────────────────────────────────────────────────

    function grantUniversityRole(address account) external;
    function revokeUniversityRole(address account) external;
    function grantEmployerRole(address account) external;
    function revokeEmployerRole(address account) external;

    // ── Core functions ───────────────────────────────────────────────────────

    function issueDegree(
        bytes32 degreeHash,
        string  calldata studentName,
        string  calldata program,
        uint256 graduationDate
    ) external;

    function verifyDegree(bytes32 degreeHash)
        external
        returns (
            bool    exists,
            bool    isRevoked,
            address issuingUniversity,
            string  memory program,
            uint256 issuedAt
        );

    function revokeDegree(bytes32 degreeHash, string calldata reason) external;

    // ── Read ─────────────────────────────────────────────────────────────────

    function getDegreeStatus(bytes32 degreeHash)
        external
        view
        returns (
            bool    exists,
            bool    isRevoked,
            address issuingUniversity,
            uint256 issuedAt
        );

    function getTotalIssued() external view returns (uint256);

    // ── OZ AccessControl (subset used by backend) ────────────────────────────

    function hasRole(bytes32 role, address account) external view returns (bool);
    function UNIVERSITY_ROLE() external view returns (bytes32);
    function EMPLOYER_ROLE() external view returns (bytes32);
}
