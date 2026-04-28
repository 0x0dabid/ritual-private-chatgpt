import { useCallback, useState } from "react";
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { type Address, type Hash } from "viem";
import { smartAccountAbi, smartAccountFactoryAbi } from "@/lib/abi";
import { SMART_ACCOUNT_FACTORY } from "@/lib/addresses";

export function useDeploySmartAccount() {
  const { address } = useAccount();
  const { writeContractAsync, isPending, data: deployHash } = useWriteContract();

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: deployHash,
    query: { enabled: !!deployHash },
  });

  const deploy = useCallback(async (): Promise<Hash> => {
    if (!address) throw new Error("Wallet not connected");
    const hash = await writeContractAsync({
      address: SMART_ACCOUNT_FACTORY,
      abi: smartAccountFactoryAbi,
      functionName: "deploy",
      gas: 1_000_000n,
    });
    return hash;
  }, [address, writeContractAsync]);

  return { deploy, isDeploying: isPending || isConfirming, deployHash: deployHash as Hash | undefined };
}

export function usePredictSmartAccount(owner: Address | undefined) {
  const { data: predictedAddress } = useReadContract({
    address: SMART_ACCOUNT_FACTORY,
    abi: smartAccountFactoryAbi,
    functionName: "predictAddress",
    args: owner ? [owner] : undefined,
    query: { enabled: !!owner },
  });
  return { predictedAddress: predictedAddress as Address | undefined };
}

export function useIsSmartAccountDeployed(owner: Address | undefined) {
  const { data: isDeployed, refetch } = useReadContract({
    address: SMART_ACCOUNT_FACTORY,
    abi: smartAccountFactoryAbi,
    functionName: "isDeployed",
    args: owner ? [owner] : undefined,
    query: { enabled: !!owner },
  });
  return { isDeployed: isDeployed as boolean | undefined, refetch };
}

export function useSmartAccountInfo(smartAccountAddress: Address | undefined) {
  const { address: userAddress } = useAccount();

  const { data: owner } = useReadContract({
    address: smartAccountAddress,
    abi: smartAccountAbi,
    functionName: "owner",
    query: { enabled: !!smartAccountAddress },
  });

  const { data: sessionKeyCount } = useReadContract({
    address: smartAccountAddress,
    abi: smartAccountAbi,
    functionName: "sessionKeyCount",
    query: { enabled: !!smartAccountAddress },
  });

  const isOwner =
    !!userAddress && !!owner && userAddress.toLowerCase() === owner.toLowerCase();

  return { owner, sessionKeyCount: sessionKeyCount ?? 0n, isOwner };
}

export function useAddSessionKey(smartAccountAddress: Address | undefined) {
  const { writeContractAsync, isPending } = useWriteContract();

  const addSessionKey = useCallback(
    async (sessionKeyAddress: Address) => {
      if (!smartAccountAddress) throw new Error("Smart account not deployed");
      return writeContractAsync({
        address: smartAccountAddress,
        abi: smartAccountAbi,
        functionName: "addSessionKey",
        args: [sessionKeyAddress],
      });
    },
    [smartAccountAddress, writeContractAsync]
  );

  return { addSessionKey, isPending };
}

export function useRemoveSessionKey(smartAccountAddress: Address | undefined) {
  const { writeContractAsync, isPending } = useWriteContract();

  const removeSessionKey = useCallback(
    async (sessionKeyAddress: Address) => {
      if (!smartAccountAddress) throw new Error("Smart account not deployed");
      return writeContractAsync({
        address: smartAccountAddress,
        abi: smartAccountAbi,
        functionName: "removeSessionKey",
        args: [sessionKeyAddress],
      });
    },
    [smartAccountAddress, writeContractAsync]
  );

  return { removeSessionKey, isPending };
}

export function useIsAuthorized(smartAccountAddress: Address | undefined, sessionAddress: Address | undefined) {
  const { data: isAuthorized } = useReadContract({
    address: smartAccountAddress,
    abi: smartAccountAbi,
    functionName: "isAuthorized",
    args: sessionAddress ? [sessionAddress] : undefined,
    query: { enabled: !!smartAccountAddress && !!sessionAddress },
  });
  return { isAuthorized: (isAuthorized as boolean) ?? false };
}
