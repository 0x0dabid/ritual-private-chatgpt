"use client";

import { createPublicClient, http, type Address } from "viem";
import { useEffect, useState, useCallback } from "react";
import { ritualChain } from "@/lib/chain";

const RPC_URL = process.env.NEXT_PUBLIC_RITUAL_RPC_URL ?? "https://rpc.ritualfoundation.org";

const publicClient = createPublicClient({
  chain: ritualChain,
  transport: http(RPC_URL),
});

export function useAddressBalance(walletAddress: Address | undefined) {
  const [balance, setBalance] = useState<bigint>(0n);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!walletAddress) return;
    let cancelled = false;
    setLoading(true);

    publicClient
      .getBalance({ address: walletAddress as Address })
      .then((b) => {
        if (!cancelled) setBalance(b);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [walletAddress, refreshKey]);

  const balanceFormatted = Number(balance) / 1e18;
  const hasBalance = balance > 0n;

  return { balance, balanceFormatted, hasBalance, loading, refresh };
}
