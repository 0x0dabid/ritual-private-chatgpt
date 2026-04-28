import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { ritualChain } from "./chain";

const rpcUrl =
  process.env.NEXT_PUBLIC_RITUAL_RPC_URL ?? "https://rpc.ritualfoundation.org";

export const config = createConfig({
  chains: [ritualChain],
  connectors: [injected()],
  transports: {
    [ritualChain.id]: http(rpcUrl),
  },
});
