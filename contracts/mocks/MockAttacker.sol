// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../DegreeAttestation.sol";

/**
 * @title  MockAttacker
 * @notice Simulates a fake-degree attack scenario for the CCP test suite.
 *         An attacker wallet (no EMPLOYER_ROLE) attempts to call verifyDegree
 *         directly — the AccessControl modifier must revert with the OZ
 *         AccessControlUnauthorizedAccount error.
 *
 *         A separate fraud-detection path (valid employer, fake hash) is
 *         exercised directly in the test suite without this contract.
 */
contract MockAttacker {
    DegreeAttestation private immutable _target;

    constructor(address target) {
        _target = DegreeAttestation(target);
    }

    /**
     * @notice Attempt to verify a degree without EMPLOYER_ROLE.
     *         Expected to revert — proves role enforcement works.
     */
    function attackVerify(bytes32 fakeHash) external {
        _target.verifyDegree(fakeHash);
    }

    /**
     * @notice Attempt to issue a degree without UNIVERSITY_ROLE.
     *         Expected to revert — proves issuance is gated.
     */
    function attackIssue(bytes32 fakeHash) external {
        _target.issueDegree(fakeHash, "Fake Student", "BSCS", block.timestamp);
    }
}
