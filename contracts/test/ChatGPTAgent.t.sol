// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ChatGPTAgent} from "../src/ChatGPTAgent.sol";
import {SmartAccount} from "../src/SmartAccount.sol";

contract ChatGPTAgentTest is Test {
    ChatGPTAgent public consumer;
    SmartAccount public smartAccount;
    address public owner = address(0x1);
    address public user = address(0x2);
    address constant ASYNC_DELIVERY = 0x5A16214fF555848411544b005f7Ac063742f39F6;

    function setUp() public {
        vm.prank(owner);
        consumer = new ChatGPTAgent();

        // Deploy a smart account for testing
        vm.prank(user);
        smartAccount = new SmartAccount(user);
    }

    function test_OwnerSet() public view {
        assertEq(consumer.owner(), owner);
    }

    function test_RegisterAgent() public {
        vm.prank(owner);
        consumer.registerAgent(address(smartAccount), "MyAgent", "openai", "gpt-4", "You are helpful");

        (string memory name, string memory provider, string memory model, string memory sysPrompt, address sa, bool active) =
            consumer.agents(address(smartAccount));
        assertEq(name, "MyAgent");
        assertEq(provider, "openai");
        assertEq(model, "gpt-4");
        assertEq(sysPrompt, "You are helpful");
        assertEq(sa, address(smartAccount));
        assertTrue(active);
    }

    function test_RegisterAgentNotOwner() public {
        vm.prank(user);
        vm.expectRevert("ChatGPTAgent: not owner");
        consumer.registerAgent(address(smartAccount), "", "", "", "");
    }

    function test_RegisterAgentZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert("ChatGPTAgent: zero smart account");
        consumer.registerAgent(address(0), "", "", "", "");
    }

    function test_RegisterDuplicate() public {
        vm.prank(owner);
        consumer.registerAgent(address(smartAccount), "A", "b", "c", "d");
        vm.prank(owner);
        vm.expectRevert("ChatGPTAgent: already registered");
        consumer.registerAgent(address(smartAccount), "A2", "b", "c", "d");
    }

    function test_SubmitPrompt() public {
        _registerDefaultAgent();

        bytes32 jobId = keccak256(abi.encodePacked("test-job-1"));
        bytes32 promptHash = keccak256(bytes("Hello agent"));

        // Submit through smart account
        vm.prank(address(smartAccount));
        consumer.submitPrompt(jobId, promptHash);

        (bytes32 storedHash, string memory response, bool delivered, address agent) =
            consumer.prompts(jobId);
        assertEq(storedHash, promptHash);
        assertEq(response, "");
        assertFalse(delivered);
        assertEq(agent, address(smartAccount));
    }

    function test_SubmitPromptNotFromSmartAccount() public {
        _registerDefaultAgent();

        bytes32 jobId = keccak256(abi.encodePacked("x"));
        bytes32 promptHash = keccak256(bytes("test"));

        // Submit from EOA directly (not smart account) — should fail
        // because agents mapping keys on smartAccount, not EOA
        vm.prank(user);
        vm.expectRevert("ChatGPTAgent: agent not active");
        consumer.submitPrompt(jobId, promptHash);
    }

    function test_SubmitPromptEmptyHash() public {
        _registerDefaultAgent();

        bytes32 jobId = keccak256(abi.encodePacked("empty"));
        vm.prank(address(smartAccount));
        vm.expectRevert("ChatGPTAgent: empty hash");
        consumer.submitPrompt(jobId, bytes32(0));
    }

    function test_SubmitPromptDuplicateJobId() public {
        _registerDefaultAgent();

        bytes32 jobId = keccak256(abi.encodePacked("dup"));
        bytes32 promptHash = keccak256(bytes("first"));

        vm.prank(address(smartAccount));
        consumer.submitPrompt(jobId, promptHash);

        vm.prank(address(smartAccount));
        vm.expectRevert("ChatGPTAgent: jobId already used");
        consumer.submitPrompt(jobId, promptHash);
    }

    function test_CallbackOnlyAsyncDelivery() public {
        bytes32 jobId = keccak256(abi.encodePacked("cb-1"));
        bytes memory result = bytes("test response");

        vm.prank(address(0xdead));
        vm.expectRevert("ChatGPTAgent: only async delivery");
        consumer.onAgentResult(jobId, result);
    }

    function test_CallbackDeliversResponse() public {
        _registerDefaultAgent();

        bytes32 jobId = keccak256(abi.encodePacked("cb-2"));
        vm.prank(address(smartAccount));
        consumer.submitPrompt(jobId, keccak256(bytes("Hello")));

        bytes memory result = bytes("Hello! How can I help you today?");
        vm.prank(ASYNC_DELIVERY);
        consumer.onAgentResult(jobId, result);

        ChatGPTAgent.PromptRecord memory pr = consumer.getPromptResult(jobId);
        assertTrue(pr.delivered);
        assertEq(pr.response, "Hello! How can I help you today?");
    }

    function test_CallbackAlreadyDelivered() public {
        _registerDefaultAgent();

        bytes32 jobId = keccak256(abi.encodePacked("cb-3"));
        vm.prank(address(smartAccount));
        consumer.submitPrompt(jobId, keccak256(bytes("Hi")));

        vm.prank(ASYNC_DELIVERY);
        consumer.onAgentResult(jobId, bytes("response"));

        vm.prank(ASYNC_DELIVERY);
        vm.expectRevert("ChatGPTAgent: already delivered");
        consumer.onAgentResult(jobId, bytes("second"));
    }

    function test_CallbackEmptyResponse() public {
        _registerDefaultAgent();

        bytes32 jobId = keccak256(abi.encodePacked("cb-4"));
        vm.prank(address(smartAccount));
        consumer.submitPrompt(jobId, keccak256(bytes("Test")));

        vm.prank(ASYNC_DELIVERY);
        consumer.onAgentResult(jobId, bytes(""));

        ChatGPTAgent.PromptRecord memory pr = consumer.getPromptResult(jobId);
        assertTrue(pr.delivered);
    }

    function test_AgentCount() public {
        assertEq(consumer.agentCount(), 0);

        vm.prank(owner);
        consumer.registerAgent(address(0x101), "A1", "o", "g", "h");
        assertEq(consumer.agentCount(), 1);

        vm.prank(owner);
        consumer.registerAgent(address(0x102), "A2", "o", "g", "h");
        assertEq(consumer.agentCount(), 2);
    }

    function test_PendingPromptCount() public {
        _registerDefaultAgent();
        assertEq(consumer.pendingPromptCount(), 0);

        vm.prank(address(smartAccount));
        consumer.submitPrompt(keccak256(abi.encodePacked("j1")), keccak256(bytes("q1")));
        assertEq(consumer.pendingPromptCount(), 1);

        vm.prank(address(smartAccount));
        consumer.submitPrompt(keccak256(abi.encodePacked("j2")), keccak256(bytes("q2")));
        assertEq(consumer.pendingPromptCount(), 2);
    }

    function test_GetConstants() public {
        (address asyncDelivery, address pf, address llm, address rw) = consumer.getConstants();
        assertEq(asyncDelivery, ASYNC_DELIVERY);
        assertEq(pf, 0xD4AA9D55215dc8149Af57605e70921Ea16b73591);
        assertEq(llm, 0x0000000000000000000000000000000000000802);
        assertEq(rw, 0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948);
    }

    function test_SmartAccountDeployment() public {
        assertEq(smartAccount.owner(), user);
        assertEq(smartAccount.sessionKeyCount(), 0);
    }

    function test_SmartAccountAddSessionKey() public {
        address sessionKey = address(0xABCD);
        vm.prank(user);
        smartAccount.addSessionKey(sessionKey);

        assertTrue(smartAccount.sessionKeys(sessionKey));
        assertEq(smartAccount.sessionKeyCount(), 1);
    }

    function test_SmartAccountAddSessionKeyNotOwner() public {
        vm.prank(address(0xDEAD));
        vm.expectRevert("SmartAccount: not owner");
        smartAccount.addSessionKey(address(0xABCD));
    }

    function test_SmartAccountRemoveSessionKey() public {
        address sessionKey = address(0xABCD);
        vm.prank(user);
        smartAccount.addSessionKey(sessionKey);
        assertEq(smartAccount.sessionKeyCount(), 1);

        vm.prank(user);
        smartAccount.removeSessionKey(sessionKey);
        assertFalse(smartAccount.sessionKeys(sessionKey));
        assertEq(smartAccount.sessionKeyCount(), 0);
    }

    function test_SmartAccountExecuteThroughSession() public {
        _registerDefaultAgent();

        // Add session key
        address sessionKey = address(0xBEEF);
        vm.prank(user);
        smartAccount.addSessionKey(sessionKey);

        // Submit prompt through session key via smart account
        bytes32 jobId = keccak256(abi.encodePacked("session-job"));
        bytes32 promptHash = keccak256(bytes("Session test"));

        bytes memory callData = abi.encodeWithSignature(
            "submitPrompt(bytes32,bytes32)",
            jobId,
            promptHash
        );

        vm.prank(sessionKey);
        (bool success, ) = smartAccount.execute(address(consumer), callData);
        assertTrue(success);

        (bytes32 storedHash,, bool delivered,) = consumer.prompts(jobId);
        assertEq(storedHash, promptHash);
        assertFalse(delivered);
    }

    function test_SmartAccountExecuteUnauthorized() public {
        bytes memory callData = abi.encodeWithSignature(
            "submitPrompt(bytes32,bytes32)",
            keccak256(abi.encodePacked("x")),
            keccak256(bytes("x"))
        );

        vm.prank(address(0xDEAD));
        vm.expectRevert("SmartAccount: not authorized");
        smartAccount.execute(address(consumer), callData);
    }

    function _registerDefaultAgent() internal {
        vm.prank(owner);
        consumer.registerAgent(address(smartAccount), "Default", "openai", "gpt-4", "You are a helpful assistant.");
    }
}
