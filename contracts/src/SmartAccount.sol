// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title SmartAccount
/// @notice Minimal smart account for Ritual Chain with session key support.
/// @dev Owned by user EOA. Authorized session keys can execute calls without
///      requiring the owner to sign every transaction.
contract SmartAccount {
    // ═══════════════════════════════════════════════
    // State
    // ═══════════════════════════════════════════════

    /// @notice Owner EOA that controls this smart account
    address public owner;

    /// @notice Mapping of authorized session keys (address => isAuthorized)
    mapping(address => bool) public sessionKeys;

    /// @notice Counter for number of authorized session keys
    uint256 public sessionKeyCount;

    // ═══════════════════════════════════════════════
    // Events
    // ═══════════════════════════════════════════════

    /// @notice Emitted when a session key is authorized
    event SessionKeyAdded(address indexed key, uint256 timestamp);

    /// @notice Emitted when a session key is revoked
    event SessionKeyRemoved(address indexed key, uint256 timestamp);

    /// @notice Emitted when a call is executed through the account
    event CallExecuted(address indexed target, bytes4 indexed selector, bool success);

    // ═══════════════════════════════════════════════
    // Modifiers
    // ═══════════════════════════════════════════════

    modifier onlyOwner() {
        require(msg.sender == owner, "SmartAccount: not owner");
        _;
    }

    modifier onlySession() {
        require(
            msg.sender == owner || sessionKeys[msg.sender],
            "SmartAccount: not authorized"
        );
        _;
    }

    // ═══════════════════════════════════════════════
    // Constructor
    // ═══════════════════════════════════════════════

    /// @notice Sets the owner of this smart account
    /// @param _owner The EOA that controls this account
    constructor(address _owner) {
        require(_owner != address(0), "SmartAccount: zero owner");
        owner = _owner;
    }

    // ═══════════════════════════════════════════════
    // Session Key Management
    // ═══════════════════════════════════════════════

    /// @notice Authorize a session key to execute calls on behalf of this account
    /// @param key The session key address to authorize
    function addSessionKey(address key) external onlyOwner {
        require(key != address(0), "SmartAccount: zero key");
        require(!sessionKeys[key], "SmartAccount: already authorized");

        sessionKeys[key] = true;
        unchecked {
            sessionKeyCount++;
        }

        emit SessionKeyAdded(key, block.timestamp);
    }

    /// @notice Revoke a session key's authorization
    /// @param key The session key to revoke
    function removeSessionKey(address key) external onlyOwner {
        require(sessionKeys[key], "SmartAccount: not authorized");

        sessionKeys[key] = false;
        unchecked {
            sessionKeyCount--;
        }

        emit SessionKeyRemoved(key, block.timestamp);
    }

    /// @notice Check if a key has active session authorization
    /// @param key The address to check
    /// @return True if the key is authorized
    function isAuthorized(address key) external view returns (bool) {
        return key == owner || sessionKeys[key];
    }

    // ═══════════════════════════════════════════════
    // Execution
    // ═══════════════════════════════════════════════

    /// @notice Execute a call through this smart account.
    ///         Can be called by owner or any authorized session key.
    /// @param target The contract to call
    /// @param data   Calldata for the call
    /// @return success Whether the call succeeded
    /// @return result Return data from the call
    function execute(
        address target,
        bytes calldata data
    ) external onlySession returns (bool success, bytes memory result) {
        (success, result) = target.call(data);

        bytes4 selector;
        if (data.length >= 4) {
            assembly {
                selector := calldataload(data.offset)
            }
        }

        emit CallExecuted(target, selector, success);

        if (!success) {
            // Bubble up the revert reason
            if (result.length > 0) {
                assembly {
                    let returndata_size := mload(result)
                    revert(add(32, result), returndata_size)
                }
            } else {
                revert("SmartAccount: call failed");
            }
        }
    }

    // ═══════════════════════════════════════════════
    // Receive (accept RITUAL for funding)
    // ═══════════════════════════════════════════════

    receive() external payable {}
}
