export const chatGptAgentAbi = [
  { type: "function", name: "owner", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "agentCount", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "agents", inputs: [{ type: "address" }], outputs: [{ type: "string" }, { type: "string" }, { type: "string" }, { type: "string" }, { type: "address" }, { type: "bool" }], stateMutability: "view" },
  { type: "function", name: "prompts", inputs: [{ type: "bytes32" }], outputs: [{ type: "bytes32" }, { type: "string" }, { type: "bool" }, { type: "address" }], stateMutability: "view" },
  { type: "function", name: "pendingJobs", inputs: [{ type: "uint256" }], outputs: [{ type: "bytes32" }], stateMutability: "view" },
  { type: "function", name: "pendingPromptCount", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getPendingJobs", inputs: [], outputs: [{ type: "bytes32[]" }], stateMutability: "view" },
  { type: "function", name: "getPromptResult", inputs: [{ name: "jobId", type: "bytes32" }], outputs: [{ type: "bytes32" }, { type: "string" }, { type: "bool" }, { type: "address" }], stateMutability: "view" },
  { type: "function", name: "getAgentInfo", inputs: [{ name: "agentInstance", type: "address" }], outputs: [{ type: "string" }, { type: "string" }, { type: "string" }, { type: "string" }, { type: "address" }, { type: "bool" }], stateMutability: "view" },
  { type: "function", name: "getConstants", inputs: [], outputs: [{ type: "address" }, { type: "address" }, { type: "address" }, { type: "address" }], stateMutability: "pure" },
  { type: "function", name: "registerAgent", inputs: [{ name: "smartAccount", type: "address" }, { name: "name", type: "string" }, { name: "provider", type: "string" }, { name: "model", type: "string" }, { name: "systemPrompt", type: "string" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "toggleAgent", inputs: [{ name: "agentInstance", type: "address" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "transferOwnership", inputs: [{ name: "newOwner", type: "address" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "submitPrompt", inputs: [{ name: "jobId", type: "bytes32" }, { name: "promptHash", type: "bytes32" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "onAgentResult", inputs: [{ name: "jobId", type: "bytes32" }, { name: "result", type: "bytes" }], outputs: [], stateMutability: "nonpayable" },
  { type: "event", name: "AgentCreated", inputs: [{ name: "smartAccount", type: "address", indexed: true }, { name: "name", type: "string", indexed: false }, { name: "provider", type: "string", indexed: false }, { name: "model", type: "string", indexed: false }, { name: "systemPrompt", type: "string", indexed: false }], anonymous: false },
  { type: "event", name: "PromptSubmitted", inputs: [{ name: "jobId", type: "bytes32", indexed: true }, { name: "promptHash", type: "bytes32", indexed: true }, { name: "smartAccount", type: "address", indexed: true }, { name: "agent", type: "address", indexed: false }], anonymous: false },
  { type: "event", name: "JobCreated", inputs: [{ name: "jobId", type: "bytes32", indexed: true }, { name: "smartAccount", type: "address", indexed: true }, { name: "agent", type: "address", indexed: false }], anonymous: false },
  { type: "event", name: "AgentResponseDelivered", inputs: [{ name: "jobId", type: "bytes32", indexed: true }, { name: "agent", type: "address", indexed: true }, { name: "response", type: "string", indexed: false }], anonymous: false },
  { type: "event", name: "AgentError", inputs: [{ name: "jobId", type: "bytes32", indexed: true }, { name: "agent", type: "address", indexed: true }, { name: "error", type: "string", indexed: false }], anonymous: false },
] as const;

export const smartAccountAbi = [
  { type: "function", name: "owner", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "sessionKeys", inputs: [{ type: "address" }], outputs: [{ type: "bool" }], stateMutability: "view" },
  { type: "function", name: "sessionKeyCount", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "isAuthorized", inputs: [{ type: "address" }], outputs: [{ type: "bool" }], stateMutability: "view" },
  { type: "function", name: "addSessionKey", inputs: [{ type: "address" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "removeSessionKey", inputs: [{ type: "address" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "execute", inputs: [{ name: "target", type: "address" }, { name: "data", type: "bytes" }], outputs: [{ type: "bool" }, { type: "bytes" }], stateMutability: "nonpayable" },
  { type: "event", name: "SessionKeyAdded", inputs: [{ name: "key", type: "address", indexed: true }, { name: "timestamp", type: "uint256", indexed: false }], anonymous: false },
  { type: "event", name: "SessionKeyRemoved", inputs: [{ name: "key", type: "address", indexed: true }, { name: "timestamp", type: "uint256", indexed: false }], anonymous: false },
  { type: "event", name: "CallExecuted", inputs: [{ name: "target", type: "address", indexed: true }, { name: "selector", type: "bytes4", indexed: true }, { name: "success", type: "bool", indexed: false }], anonymous: false },
] as const;

export const smartAccountFactoryAbi = [
  { type: "function", name: "deploy", inputs: [], outputs: [{ type: "address" }], stateMutability: "nonpayable" },
  { type: "function", name: "predictAddress", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "isDeployed", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "bool" }], stateMutability: "view" },
  { type: "event", name: "SmartAccountDeployed", inputs: [{ name: "owner", type: "address", indexed: true }, { name: "smartAccount", type: "address", indexed: true }], anonymous: false },
] as const;
