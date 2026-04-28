/// @dev AsyncDelivery system contract — the only allowed msg.sender for callbacks
export const ASYNC_DELIVERY =
  "0x5A16214fF555848411544b005f7Ac063742f39F6" as const;

/// @dev Persistent Agent Factory on Ritual Chain
export const PERSISTENT_FACTORY =
  "0xD4AA9D55215dc8149Af57605e70921Ea16b73591" as const;

/// @dev LLM precompile address
export const LLM_PRECOMPILE =
  "0x0000000000000000000000000000000000000802" as const;

/// @dev RitualWallet for fee deposits
export const RITUAL_WALLET =
  "0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948" as const;

/// @dev Persistent Agent precompile
export const PERSISTENT_AGENT_PRECOMPILE =
  "0x0000000000000000000000000000000000000820" as const;

/// @dev AsyncJobTracker for monitoring job lifecycle
export const ASYNC_JOB_TRACKER =
  "0xC069FFCa0389f44eCA2C626e55491b0ab045AEF5" as const;

/// @dev TEEServiceRegistry for executor discovery
export const TEE_SERVICE_REGISTRY =
  "0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F" as const;

/// @dev SmartAccountFactory — already deployed on Ritual Testnet.
///      Users deploy SmartAccounts through this factory.
export const SMART_ACCOUNT_FACTORY: `0x${string}` =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SMART_ACCOUNT_FACTORY) as `0x${string}`
  ?? "0xd3C70a0f35a530cC64153F8c0d47Fca7003a73F9" as const;

/// @dev Deployed ChatGPTAgent consumer contract address.
///      Already deployed on Ritual Testnet.
export const CONSUMER_CONTRACT_ADDRESS: `0x${string}` =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_CONSUMER_CONTRACT) as `0x${string}`
  ?? "0x0383b95E6D895bb00c8f9AE1b6f67116b1EbcC4F" as const;
