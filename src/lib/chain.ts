import { defineChain } from "viem";

export const ritualChain = defineChain({
  id: 1979,
  name: "Ritual",
  nativeCurrency: {
    name: "RITUAL",
    symbol: "RITUAL",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_RITUAL_RPC_URL ??
          "https://rpc.ritualfoundation.org",
      ],
      webSocket: [
        process.env.NEXT_PUBLIC_RITUAL_WS_URL ??
          "wss://rpc.ritualfoundation.org/ws",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Ritual Explorer",
      url:
        process.env.NEXT_PUBLIC_RITUAL_EXPLORER ??
        "https://explorer.ritualfoundation.org",
    },
  },
  contracts: {
    multicall3: {
      address: "0x5577Ea679673Ec7508E9524100a188E7600202a3" as const,
    },
  },
});
