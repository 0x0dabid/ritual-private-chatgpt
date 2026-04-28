import { useWriteContract } from "wagmi";
import { parseEther, type Address } from "viem";
import { useCallback, useState } from "react";

const RITUAL_WALLET = "0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948" as const;

const RITUAL_WALLET_ABI = [
  {
    type: "function" as const,
    name: "balanceOf",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view" as const,
  },
  {
    type: "function" as const,
    name: "lockUntil",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view" as const,
  },
  {
    type: "function" as const,
    name: "deposit",
    inputs: [{ name: "lockDuration", type: "uint256" }],
    outputs: [],
    stateMutability: "payable" as const,
  },
];

export function useRitualWallet() {
  const { writeContractAsync, isPending } = useWriteContract();
  const [hash, setHash] = useState<`0x${string}` | undefined>();

  const deposit = useCallback(
    async (amountEth: string, lockDuration: bigint = 5000n) => {
      const txHash = await writeContractAsync({
        address: RITUAL_WALLET,
        abi: RITUAL_WALLET_ABI,
        functionName: "deposit",
        args: [lockDuration],
        value: parseEther(amountEth),
      });
      setHash(txHash);
      return txHash;
    },
    [writeContractAsync]
  );

  return {
    deposit,
    isPending,
    hash,
    walletAddress: RITUAL_WALLET,
  };
}
