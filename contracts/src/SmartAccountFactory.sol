// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {SmartAccount} from "./SmartAccount.sol";

/// @title SmartAccountFactory
/// @notice Deploys SmartAccount instances using CREATE2 with user-specific salt.
/// @dev Each user gets one deterministic smart account address.
contract SmartAccountFactory {
    /// @notice Emitted when a new smart account is deployed
    event SmartAccountDeployed(address indexed owner, address indexed smartAccount);

    /// @notice Deploy a SmartAccount for the caller using CREATE2
    /// @return The address of the newly deployed SmartAccount
    function deploy() external returns (address) {
        bytes32 salt = keccak256(abi.encode(msg.sender));
        SmartAccount account = new SmartAccount{salt: salt}(msg.sender);
        emit SmartAccountDeployed(msg.sender, address(account));
        return address(account);
    }

    /// @notice Predict the smart account address for a user without deploying
    /// @param owner The user's EOA address
    /// @return The deterministic smart account address
    function predictAddress(address owner) external view returns (address) {
        bytes32 salt = keccak256(abi.encode(owner));
        bytes memory creationCode = type(SmartAccount).creationCode;
        bytes memory constructorArgs = abi.encode(owner);

        return address(
            uint160(uint256(keccak256(
                abi.encodePacked(
                    bytes1(0xff),
                    address(this),
                    salt,
                    keccak256(abi.encodePacked(creationCode, constructorArgs))
                )
            )))
        );
    }

    /// @notice Check if a smart account has been deployed for a user
    /// @param owner The user's EOA address
    /// @return True if deployed
    function isDeployed(address owner) external view returns (bool) {
        address predicted = this.predictAddress(owner);
        return predicted.code.length > 0;
    }
}
