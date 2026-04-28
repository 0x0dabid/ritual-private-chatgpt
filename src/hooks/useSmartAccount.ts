import { useCallback, useState } from "react";
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { decodeEventLog, type Address, type Hash, type Log } from "viem";
import { smartAccountAbi, smartAccountFactoryAbi } from "@/lib/abi";
import { SMART_ACCOUNT_FACTORY } from "@/lib/addresses";

export function useDeploySmartAccount() {
  const { address } = useAccount();
  const { writeContractAsync, isPending, data: deployHash } = useWriteContract();
  const [deployedAddr, setDeployedAddr] = useState<Address | null>(null);

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: deployHash,
    query: { enabled: !!deployHash },
  });

  // Parse the event from the receipt when confirmed
  const { data: receipt } = useWaitForTransactionReceipt({
    hash: deployHash,
    query: { enabled: !!deployHash },
  });

  if (receipt && !deployedAddr) {
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: smartAccountFactoryAbi,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "SmartAccountDeployed") {
          const saAddr = (decoded.args as any).smartAccount as Address;
          if (saAddr) setDeployedAddr(saAddr);
        }
      } catch { /* skip non-matching logs */ }
    }
  }

  const deploy = useCallback(async (): Promise<Address | null> => {
    if (!address) throw new Error("Wallet not connected");
    if (SMART_ACCOUNT_FACTORY === "0x0000000000000000000000000000000000000000") {
      throw new Error("SmartAccountFactory not deployed yet. Run forge script first.");
    }
    setDeployedAddr(null);
    await writeContractAsync({
      address: SMART_ACCOUNT_FACTORY,
      abi: smartAccountFactoryAbi,
      functionName: "deploy",
    });
    return null; // Will be set via event parsing
  }, [address, writeContractAsync]);

  return { deploy, isDeploying: isPending || isConfirming, deployHash: deployHash as Hash | undefined, deployedAddr };
}

export function usePredictSmartAccount(owner: Address | undefined) {
  const { data: predictedAddress } = useReadContract({
    address: SMART_ACCOUNT_FACTORY,
    abi: smartAccountFactoryAbi,
    functionName: "predictAddress",
    args: owner ? [owner] : undefined,
    query: { enabled: !!owner && SMART_ACCOUNT_FACTORY !== "0x0000000000000000000000000000000000000000" },
  });
  return { predictedAddress: predictedAddress as Address | undefined };
}

export function useIsSmartAccountDeployed(owner: Address | undefined) {
  const { data: isDeployed } = useReadContract({
    address: SMART_ACCOUNT_FACTORY,
    abi: smartAccountFactoryAbi,
    functionName: "isDeployed",
    args: owner ? [owner] : undefined,
    query: { enabled: !!owner && SMART_ACCOUNT_FACTORY !== "0x0000000000000000000000000000000000000000" },
  });
  return { isDeployed: isDeployed as boolean | undefined };
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
