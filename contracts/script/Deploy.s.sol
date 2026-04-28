// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {ChatGPTAgent} from "../src/ChatGPTAgent.sol";
import {SmartAccountFactory} from "../src/SmartAccountFactory.sol";

/// @title DeployScript
/// @notice Deploys ChatGPTAgent consumer contract and SmartAccountFactory
contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        ChatGPTAgent agent = new ChatGPTAgent();
        SmartAccountFactory factory = new SmartAccountFactory();

        vm.stopBroadcast();

        console2.log("ChatGPTAgent deployed at:", address(agent));
        console2.log("SmartAccountFactory deployed at:", address(factory));
    }
}
