// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ChatGPTAgent
/// @notice Consumer contract for Ritual Persistent Agent — manages agent state and async callbacks.
/// @dev This contract stores prompt hashes (not raw prompts) for privacy.
///      ⚠️ Private chat content should NOT be stored publicly onchain.
///      Full conversation history lives in local browser storage.
///      SmartAccount integration enables session-authorized chat submission.
contract ChatGPTAgent {
    // ═══════════════════════════════════════════════
    // Constants
    // ═══════════════════════════════════════════════

    /// @dev AsyncDelivery system contract — the only allowed msg.sender for callbacks
    address private constant ASYNC_DELIVERY =
        0x5A16214fF555848411544b005f7Ac063742f39F6;

    /// @dev Persistent Agent Factory on Ritual Chain
    address private constant PERSISTENT_FACTORY =
        0xD4AA9D55215dc8149Af57605e70921Ea16b73591;

    /// @dev LLM precompile address
    address private constant LLM_PRECOMPILE =
        0x0000000000000000000000000000000000000802;

    /// @dev RitualWallet for fee deposits
    address private constant RITUAL_WALLET =
        0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948;

    // ═══════════════════════════════════════════════
    // Structs
    // ═══════════════════════════════════════════════

    /// @notice Metadata about a registered persistent agent instance.
    ///         Linked to a smart account, not just an EOA.
    struct AgentInfo {
        string name;
        string provider;
        string model;
        string systemPrompt;
        address smartAccount;
        bool active;
    }

    /// @notice Minimal onchain record for a prompt submission.
    /// @dev Only the prompt hash is stored, not the raw text.
    ///      Full messages are kept in local browser storage.
    struct PromptRecord {
        bytes32 promptHash;
        string response;
        bool delivered;
        address agent;
    }

    // ═══════════════════════════════════════════════
    // State
    // ═══════════════════════════════════════════════

    /// @notice Contract owner — set at deployment
    address public owner;

    /// @notice SmartAccount address => AgentInfo
    mapping(address => AgentInfo) public agents;

    /// @notice jobId => PromptRecord
    mapping(bytes32 => PromptRecord) public prompts;

    /// @notice Ordered list of pending (undelivered) job IDs
    bytes32[] public pendingJobs;

    /// @notice Total number of registered agents
    uint256 public agentCount;

    // ═══════════════════════════════════════════════
    // Events
    // ═══════════════════════════════════════════════

    /// @notice Emitted when a persistent agent is linked to a smart account
    event AgentCreated(
        address indexed smartAccount,
        string name,
        string provider,
        string model,
        string systemPrompt
    );

    /// @notice Emitted when a prompt is submitted (hash only, not raw text)
    event PromptSubmitted(
        bytes32 indexed jobId,
        bytes32 indexed promptHash,
        address indexed smartAccount,
        address agent
    );

    /// @notice Explicit job lifecycle event
    event JobCreated(
        bytes32 indexed jobId,
        address indexed smartAccount,
        address agent
    );

    /// @notice Emitted when the callback delivers a successful response
    event AgentResponseDelivered(
        bytes32 indexed jobId,
        address indexed agent,
        string response
    );

    /// @notice Emitted when the callback delivers an error
    event AgentError(
        bytes32 indexed jobId,
        address indexed agent,
        string error
    );

    // ═══════════════════════════════════════════════
    // Modifiers
    // ═══════════════════════════════════════════════

    modifier onlyOwner() {
        require(msg.sender == owner, "ChatGPTAgent: not owner");
        _;
    }

    modifier onlyAsyncDelivery() {
        require(
            msg.sender == ASYNC_DELIVERY,
            "ChatGPTAgent: only async delivery"
        );
        _;
    }

    // ═══════════════════════════════════════════════
    // Constructor
    // ═══════════════════════════════════════════════

    /// @notice Deployer is set as contract owner
    constructor() {
        owner = msg.sender;
    }

    // ═══════════════════════════════════════════════
    // Agent Management
    // ═══════════════════════════════════════════════

    /// @notice Link a Persistent Agent to a smart account.
    ///         The smart account's EOA owner retains control.
    /// @param smartAccount The smart account owning this agent
    /// @param name         Human-readable name
    /// @param provider     AI provider (e.g. "openai", "anthropic")
    /// @param model        Model name (e.g. "gpt-4", "claude-3")
    /// @param systemPrompt System-level instructions
    function registerAgent(
        address smartAccount,
        string calldata name,
        string calldata provider,
        string calldata model,
        string calldata systemPrompt
    ) external onlyOwner {
        require(
            smartAccount != address(0),
            "ChatGPTAgent: zero smart account"
        );
        require(
            bytes(agents[smartAccount].name).length == 0,
            "ChatGPTAgent: already registered"
        );

        agents[smartAccount] = AgentInfo({
            name: name,
            provider: provider,
            model: model,
            systemPrompt: systemPrompt,
            smartAccount: smartAccount,
            active: true
        });

        unchecked {
            agentCount++;
        }

        emit AgentCreated(smartAccount, name, provider, model, systemPrompt);
    }

    /// @notice Toggle agent active status
    function toggleAgent(address smartAccount) external onlyOwner {
        require(
            bytes(agents[smartAccount].name).length > 0,
            "ChatGPTAgent: agent not found"
        );
        agents[smartAccount].active = !agents[smartAccount].active;
    }

    // ═══════════════════════════════════════════════
    // Prompt Submission
    // ═══════════════════════════════════════════════

    /// @notice Submit a prompt hash for processing.
    ///         Called by the smart account (via session key) — msg.sender is the smart account.
    ///         Only the prompt hash is stored onchain. Full text stays in local storage.
    /// @param jobId      Frontend-generated deterministic job ID
    /// @param promptHash keccak256 hash of the raw prompt text
    function submitPrompt(
        bytes32 jobId,
        bytes32 promptHash
    ) external {
        address smartAccount = msg.sender;

        require(agents[smartAccount].active, "ChatGPTAgent: agent not active");
        require(
            prompts[jobId].promptHash == bytes32(0),
            "ChatGPTAgent: jobId already used"
        );
        require(promptHash != bytes32(0), "ChatGPTAgent: empty hash");

        prompts[jobId] = PromptRecord({
            promptHash: promptHash,
            response: "",
            delivered: false,
            agent: agents[smartAccount].smartAccount
        });

        pendingJobs.push(jobId);

        emit PromptSubmitted(jobId, promptHash, smartAccount, agents[smartAccount].smartAccount);
        emit JobCreated(jobId, smartAccount, agents[smartAccount].smartAccount);
    }

    // ═══════════════════════════════════════════════
    // Async Callback (called by AsyncDelivery)
    // ═══════════════════════════════════════════════

    /// @notice Callback invoked by AsyncDelivery when async job completes
    /// @param jobId   The job identifier
    /// @param result  Raw bytes response from the agent
    function onAgentResult(
        bytes32 jobId,
        bytes calldata result
    ) external onlyAsyncDelivery {
        require(
            !prompts[jobId].delivered,
            "ChatGPTAgent: already delivered"
        );

        address agentAddr = prompts[jobId].agent;
        prompts[jobId].delivered = true;

        if (result.length > 0) {
            prompts[jobId].response = string(result);
            emit AgentResponseDelivered(jobId, agentAddr, string(result));
        } else {
            emit AgentError(jobId, agentAddr, "Empty response");
        }

        _removePendingJob(jobId);
    }

    // ═══════════════════════════════════════════════
    // Owner Functions
    // ═══════════════════════════════════════════════

    /// @notice Transfer ownership
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ChatGPTAgent: zero address");
        owner = newOwner;
    }

    // ═══════════════════════════════════════════════
    // View Helpers
    // ═══════════════════════════════════════════════

    /// @notice Number of prompts still awaiting callback delivery
    function pendingPromptCount() external view returns (uint256) {
        return pendingJobs.length;
    }

    /// @notice Full list of pending job IDs
    function getPendingJobs() external view returns (bytes32[] memory) {
        return pendingJobs;
    }

    /// @notice Get stored PromptRecord for a job
    function getPromptResult(
        bytes32 jobId
    ) external view returns (PromptRecord memory) {
        return prompts[jobId];
    }

    /// @notice Get stored AgentInfo for a smart account
    function getAgentInfo(
        address smartAccount
    ) external view returns (AgentInfo memory) {
        return agents[smartAccount];
    }

    /// @notice Get contract constants for frontend display
    function getConstants()
        external
        pure
        returns (
            address asyncDelivery,
            address persistentFactory,
            address llmPrecompile,
            address ritualWallet
        )
    {
        return (ASYNC_DELIVERY, PERSISTENT_FACTORY, LLM_PRECOMPILE, RITUAL_WALLET);
    }

    // ═══════════════════════════════════════════════
    // Internal
    // ═══════════════════════════════════════════════

    /// @notice Swap-and-pop removal from pendingJobs array
    function _removePendingJob(bytes32 jobId) internal {
        uint256 length = pendingJobs.length;
        for (uint256 i = 0; i < length; ) {
            if (pendingJobs[i] == jobId) {
                pendingJobs[i] = pendingJobs[length - 1];
                pendingJobs.pop();
                return;
            }
            unchecked {
                i++;
            }
        }
    }
}
