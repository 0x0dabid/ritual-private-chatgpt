"use client";

import React, { useState, useEffect } from "react";
import type { Address } from "viem";
import { useAccount } from "wagmi";
import { usePredictSmartAccount, useIsSmartAccountDeployed, useDeploySmartAccount } from "@/hooks/useSmartAccount";

interface SmartAccountSetupProps {
  onSmartAccountDeployed: (addr: Address) => void;
}

export function SmartAccountSetup({ onSmartAccountDeployed }: SmartAccountSetupProps) {
  const { address: userAddress, isConnected } = useAccount();
  const { predictedAddress } = usePredictSmartAccount(userAddress);
  const { isDeployed } = useIsSmartAccountDeployed(userAddress);
  const { deploy, isDeploying, deployedAddr, deployHash } = useDeploySmartAccount();
  const [deployMsg, setDeployMsg] = useState<string | null>(null);
  const [txPending, setTxPending] = useState(false);

  useEffect(() => {
    if (deployHash) {
      setTxPending(true);
      setDeployMsg("Transaction submitted. Waiting for confirmation...");
    }
  }, [deployHash]);

  useEffect(() => {
    if (deployedAddr) {
      setTxPending(false);
      setDeployMsg("Deployed!");
      onSmartAccountDeployed(deployedAddr);
    }
  }, [deployedAddr, onSmartAccountDeployed]);

  useEffect(() => {
    if (isDeployed && predictedAddress && !deployedAddr) {
      onSmartAccountDeployed(predictedAddress);
    }
  }, [isDeployed, predictedAddress, deployedAddr, onSmartAccountDeployed]);

  const handleDeploy = async () => {
    setDeployMsg(null);
    setTxPending(true);
    try {
      await deploy();
    } catch (err: any) {
      setTxPending(false);
      setDeployMsg(`Deploy failed: ${err?.message?.slice(0, 80) || "unknown error"}`);
    }
  };

  const short = (addr: Address | null | undefined) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "—";

  if (!isConnected) {
    return (
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-black/5">
        <h3 className="text-sm font-semibold text-black mb-2">Smart Account</h3>
        <p className="text-xs text-black/40">Connect your wallet to begin.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-black/5 space-y-3">
      <h3 className="text-sm font-semibold text-black">Smart Account</h3>

      <div className="bg-white/40 rounded-xl p-3 border border-black/5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-black/60">Status</span>
          <span className={`text-[11px] font-medium ${isDeployed ? "text-[#2F795A]" : "text-red-500"}`}>
            {isDeployed ? "Deployed" : txPending ? "Confirming..." : "Not deployed"}
          </span>
        </div>
        {predictedAddress && (
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-black/40">Address (deterministic)</span>
            <span className="font-mono text-black/60">{short(predictedAddress)}</span>
          </div>
        )}

        {!isDeployed && (
          <div className="mt-3">
            <p className="text-[10px] text-black/40 mb-2">
              Your permanent onchain wallet on Ritual. Deploy once — this is the wallet that
              sends LLM transactions and holds the RitualWallet deposit.
            </p>
            <button
              onClick={handleDeploy}
              disabled={isDeploying || txPending}
              className="w-full py-2 bg-[#2F795A] text-white rounded-xl text-xs font-medium
                         hover:bg-[#256F4E] transition-colors disabled:opacity-40"
            >
              {txPending ? "Waiting for confirmation..." : isDeploying ? "Submitting..." : "Deploy Smart Account"}
            </button>
            {deployMsg && (
              <p className={`text-[10px] mt-1.5 ${deployMsg.includes("failed") ? "text-red-500" : deployMsg.includes("Deployed") ? "text-[#2F795A]" : "text-amber-600"}`}>
                {deployMsg}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
