/// All Ritual Testnet contract addresses.
/// These are known deployed addresses — no env var fallback logic needed.

/// @dev AsyncDelivery system contract
export const ASYNC_DELIVERY = "0x5A16214fF555848411544b005f7Ac063742f39F6" as const;

/// @dev Persistent Agent Factory
export const PERSISTENT_FACTORY = "0xD4AA9D55215dc8149Af57605e70921Ea16b73591" as const;

/// @dev LLM precompile
export const LLM_PRECOMPILE = "0x0000000000000000000000000000000000000802" as const;

/// @dev RitualWallet for fee deposits
export const RITUAL_WALLET = "0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948" as const;

/// @dev Persistent Agent precompile
export const PERSISTENT_AGENT_PRECOMPILE = "0x0000000000000000000000000000000000000820" as const;

/// @dev AsyncJobTracker
export const ASYNC_JOB_TRACKER = "0xC069FFCa0389f44eCA2C626e55491b0ab045AEF5" as const;

/// @dev TEEServiceRegistry
export const TEE_SERVICE_REGISTRY = "0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F" as const;

/// @dev SmartAccountFactory (deployed on Ritual Testnet)
export const SMART_ACCOUNT_FACTORY = "0xd3C70a0f35a530cC64153F8c0d47Fca7003a73F9" as const;

/// @dev ChatGPTAgent consumer contract (deployed on Ritual Testnet)
export const CONSUMER_CONTRACT_ADDRESS = "0x0383b95E6D895bb00c8f9AE1b6f67116b1EbcC4F" as const;
