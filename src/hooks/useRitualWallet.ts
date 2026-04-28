import { useReadContract, useWriteContract, useAccount } from "wagmi";
import { parseEther, type Address } from "viem";
import { useCallback } from "react";

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
  {
    type: "function" as const,
    name: "depositFor",
    inputs: [
      { name: "user", type: "address" },
      { name: "lockDuration", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "payable" as const,
  },
];

export function useRitualWalletBalance(targetAddress: Address | undefined) {
  const { data: balance, refetch } = useReadContract({
    address: RITUAL_WALLET,
    abi: RITUAL_WALLET_ABI,
    functionName: "balanceOf",
    args: targetAddress ? [targetAddress] : undefined,
    query: { enabled: !!targetAddress, refetchInterval: 12_000 },
  });

  const { data: lockUntilBlock } = useReadContract({
    address: RITUAL_WALLET,
    abi: RITUAL_WALLET_ABI,
    functionName: "lockUntil",
    args: targetAddress ? [targetAddress] : undefined,
    query: { enabled: !!targetAddress },
  });

  return {
    balance: balance ?? 0n,
    balanceFormatted: Number(balance ?? 0n) / 1e18,
    lockUntilBlock: lockUntilBlock ? Number(lockUntilBlock) : 0,
    refetch,
  };
}

export function useRitualWalletDeposit() {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  const deposit = useCallback(
    async (amountEth: string, lockDuration: bigint = 5000n) => {
      if (!address) throw new Error("Wallet not connected");
      return writeContractAsync({
        address: RITUAL_WALLET,
        abi: RITUAL_WALLET_ABI,
        functionName: "deposit",
        args: [lockDuration],
        value: parseEther(amountEth),
      });
    },
    [address, writeContractAsync],
  );

  const depositFor = useCallback(
    async (userAddress: Address, amountEth: string, lockDuration: bigint = 5000n) => {
      if (!address) throw new Error("Wallet not connected");
      return writeContractAsync({
        address: RITUAL_WALLET,
        abi: RITUAL_WALLET_ABI,
        functionName: "depositFor",
        args: [userAddress, lockDuration],
        value: parseEther(amountEth),
      });
    },
    [address, writeContractAsync],
  );

  return { deposit, depositFor, isPending };
}
