"use client";

import React, { useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { type Address } from "viem";
import { WalletConnect } from "@/components/WalletConnect";
import { ChainGuard } from "@/components/ChainGuard";
import { SmartAccountSetup } from "@/components/SmartAccountSetup";
import { ChatPanel } from "@/components/ChatPanel";
import { FundingSection } from "@/components/FundingSection";
import { usePredictSmartAccount, useIsSmartAccountDeployed } from "@/hooks/useSmartAccount";

export default function Home() {
  const { address: userAddress, isConnected } = useAccount();
  const { predictedAddress } = usePredictSmartAccount(userAddress);
  const { isDeployed: isSmartAccountDeployed } = useIsSmartAccountDeployed(userAddress);
  const smartAccountAddress = isSmartAccountDeployed ? predictedAddress : undefined;
  const [manualDeployAddr, setManualDeployAddr] = useState<Address | undefined>();

  // If the user just deployed via the button, use that address
  const effectiveSA = smartAccountAddress ?? manualDeployAddr;

  const handleSmartAccountDeployed = useCallback((addr: Address) => {
    setManualDeployAddr(addr);
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <header className="border-b border-black/5 bg-white/40 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-black tracking-tight">Ritual Private ChatGPT</h1>
          <WalletConnect />
        </div>
      </header>

      <ChainGuard>
        <main className="max-w-6xl mx-auto px-5 py-6">
          {!isConnected ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <div className="text-6xl mb-4">🔐</div>
                <h2 className="text-xl font-semibold text-black mb-2">Ritual Private ChatGPT</h2>
                <p className="text-black/50 text-sm mb-6 max-w-md mx-auto leading-relaxed">
                  Onchain AI chat powered by Ritual Testnet. Connect your wallet to get started.
                </p>
                <WalletConnect />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Left: Setup + Funding */}
              <div className="lg:col-span-1 space-y-4">
                <SmartAccountSetup onSmartAccountDeployed={handleSmartAccountDeployed} />

                <FundingSection
                  smartAccountAddress={effectiveSA}
                  ownerAddress={userAddress}
                />

                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-black/5 text-[10px] text-black/40 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Your Wallet (EOA)</span>
                    <span className="font-mono">{userAddress?.slice(0, 6)}...{userAddress?.slice(-4)}</span>
                  </div>
                  {effectiveSA && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#2F795A]">Smart Account</span>
                      <span className="font-mono">{effectiveSA.slice(0, 6)}...{effectiveSA.slice(-4)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Chat */}
              <div className="lg:col-span-2">
                <ChatPanel
                  agentStatus={effectiveSA ? "AGENT_RUNNING" : "NO_AGENT"}
                  smartAccountAddress={effectiveSA}
                  isSmartAccountDeployed={isSmartAccountDeployed || !!manualDeployAddr}
                />
              </div>
            </div>
          )}
        </main>
      </ChainGuard>
    </div>
  );
}
