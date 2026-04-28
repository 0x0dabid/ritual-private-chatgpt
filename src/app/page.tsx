"use client";

import React, { useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { type Address } from "viem";
import { WalletConnect } from "@/components/WalletConnect";
import { ChainGuard } from "@/components/ChainGuard";
import { SmartAccountSetup } from "@/components/SmartAccountSetup";
import { AgentSetup } from "@/components/AgentSetup";
import { ChatPanel } from "@/components/ChatPanel";
import { AgentInfo } from "@/components/AgentInfo";
import { SessionManager } from "@/components/SessionManager";
import { FundingSection } from "@/components/FundingSection";
import { Settings } from "@/components/Settings";
import { ExecutorDebugPanel } from "@/components/ExecutorDebugPanel";
import { useSessionKey } from "@/hooks/useSessionKey";
import { useExecutorDiscovery } from "@/hooks/useExecutorDiscovery";
import { useSmartAccountInfo, useIsAuthorized } from "@/hooks/useSmartAccount";
import type { AgentStatus } from "@/types/asyncTx";
import type { AppSettings } from "@/types/agent";

export default function Home() {
  const { address: userAddress, isConnected } = useAccount();
  const { sessionAddress, sessionAccount, previousSessionAddress, isNewSession } = useSessionKey();
  const { debug } = useExecutorDiscovery();

  const [agentStatus, setAgentStatus] = useState<AgentStatus>("NO_AGENT");
  const [smartAccountAddress, setSmartAccountAddress] = useState<Address | undefined>();
  const [agentDeployedAddress, setAgentDeployedAddress] = useState<`0x${string}` | undefined>();
  const [settings, setSettings] = useState<AppSettings>({
    provider: "ritual",
    model: "gpt-4",
    systemPrompt: "You are a helpful AI assistant on Ritual Chain.",
  });
  const [sessionReady, setSessionReady] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { isAuthorized: isSessionActive } = useIsAuthorized(
    smartAccountAddress,
    sessionAddress ?? undefined,
  );

  const handleSmartAccountDeployed = useCallback((addr: Address) => {
    setSmartAccountAddress(addr);
  }, []);

  const handleSessionAuthorized = useCallback(() => {
    setSessionReady(true);
  }, []);

  const handleSessionRevoked = useCallback(() => {
    setSessionReady(false);
    setAgentStatus("NO_AGENT");
    setAgentDeployedAddress(undefined);
  }, []);

  const handleAgentCreated = useCallback((addr: `0x${string}`) => {
    setAgentDeployedAddress(addr);
    setAgentStatus("AGENT_CREATED");
    setTimeout(() => setAgentStatus("AGENT_RUNNING"), 500);
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <header className="border-b border-black/5 bg-white/40 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-black tracking-tight">
            Ritual Private ChatGPT
          </h1>
          <WalletConnect />
        </div>
      </header>

      <ChainGuard>
        <main className="max-w-6xl mx-auto px-5 py-6">
          {!isConnected ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <div className="text-6xl mb-4">🔐</div>
                <h2 className="text-xl font-semibold text-black mb-2">
                  Ritual Private ChatGPT
                </h2>
                <p className="text-black/50 text-sm mb-6 max-w-md mx-auto leading-relaxed">
                  Simple text-only AI chat powered by Ritual Testnet agents.
                  Connect your wallet to get started.
                </p>
                <WalletConnect />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Left: Setup + Funding */}
              <div className="lg:col-span-1 space-y-4">
                <SmartAccountSetup
                  smartAccountAddress={smartAccountAddress}
                  onSmartAccountDeployed={handleSmartAccountDeployed}
                  onSessionAuthorized={handleSessionAuthorized}
                />

                {smartAccountAddress && sessionReady && (
                  <AgentSetup
                    agentStatus={agentStatus}
                    onAgentAddress={handleAgentCreated}
                    smartAccountAddress={smartAccountAddress}
                  />
                )}

                {smartAccountAddress && (
                  <>
                    <SessionManager
                      smartAccountAddress={smartAccountAddress}
                      onSessionRevoked={handleSessionRevoked}
                    />
                    <FundingSection
                      sessionAddress={sessionAddress}
                      previousSessionAddress={previousSessionAddress}
                      isNewSession={isNewSession}
                      smartAccountAddress={smartAccountAddress}
                      ownerAddress={userAddress}
                    />
                  </>
                )}

                <AgentInfo
                  agentAddress={agentDeployedAddress}
                  agentStatus={agentStatus}
                  smartAccountAddress={smartAccountAddress}
                  ownerAddress={userAddress}
                  sessionAddress={sessionAddress}
                  isSessionActive={isSessionActive}
                />

                {/* Advanced debug (collapsed by default) */}
                <details className="text-xs">
                  <summary
                    onClick={(e) => setShowAdvanced(!showAdvanced)}
                    className="cursor-pointer text-black/40 hover:text-black/60"
                  >
                    {showAdvanced ? "Hide" : "Show"} advanced debug
                  </summary>
                  <div className="mt-3 space-y-3">
                    <ExecutorDebugPanel debug={debug} onRetry={() => {}} />
                    <Settings settings={settings} onSettingsChange={setSettings} />
                  </div>
                </details>
              </div>

              {/* Right: Chat */}
              <div className="lg:col-span-2">
                <ChatPanel
                  agentStatus={agentStatus}
                  smartAccountAddress={smartAccountAddress}
                />
              </div>
            </div>
          )}
        </main>
      </ChainGuard>
    </div>
  );
}
