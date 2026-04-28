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
import { Settings } from "@/components/Settings";
import { useSessionKey } from "@/hooks/useSessionKey";
import { useSmartAccountInfo, useIsAuthorized } from "@/hooks/useSmartAccount";
import type { AgentStatus } from "@/types/asyncTx";
import type { AppSettings } from "@/types/agent";

export default function Home() {
  const { address, isConnected } = useAccount();
  const { sessionAddress } = useSessionKey();

  const [agentStatus, setAgentStatus] = useState<AgentStatus>("NO_AGENT");
  const [smartAccountAddress, setSmartAccountAddress] = useState<Address | undefined>();
  const [agentDeployedAddress, setAgentDeployedAddress] = useState<`0x${string}` | undefined>();
  const [activeTab, setActiveTab] = useState<"chat" | "settings">("chat");
  const [settings, setSettings] = useState<AppSettings>({
    provider: "ritual",
    model: "gpt-4",
    systemPrompt: "You are a helpful AI assistant on Ritual Chain.",
  });
  const [sessionReady, setSessionReady] = useState(false);

  const { isAuthorized: isSessionActive } = useIsAuthorized(
    smartAccountAddress,
    sessionAddress ?? undefined
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

  const handleAgentCreated = useCallback(
    (addr: `0x${string}`) => {
      setAgentDeployedAddress(addr);
      setAgentStatus("AGENT_CREATED");
      setTimeout(() => setAgentStatus("AGENT_RUNNING"), 500);
    },
    []
  );

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      {/* Header */}
      <header className="border-b border-black/5 bg-white/40 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-black tracking-tight">
              Ritual Private ChatGPT
            </h1>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-white/60 rounded-lg border border-black/5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#2F795A]" />
              <span className="text-[11px] text-black/60 font-mono">
                Ritual Testnet · Chain ID 1979
              </span>
            </div>
            {/* CSS sanity badges — visible if styling is working */}
            <div className="hidden sm:flex items-center gap-1">
              <div className="sanity-bg w-2 h-2 rounded-full" title="bg #F5F0E8 check"></div>
              <div className="sanity-btn w-2 h-2 rounded-full" title="btn #2F795A check"></div>
            </div>
          </div>
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
                  Welcome to Ritual Private ChatGPT
                </h2>
                <p className="text-black/50 text-sm mb-6 max-w-md mx-auto leading-relaxed">
                  Simple text-only AI chat powered by Ritual Testnet agents.
                  Connect your wallet to create your own persistent onchain AI assistant
                  with session-authorized chat.
                </p>
                <WalletConnect />
                <div className="mt-8 grid grid-cols-3 gap-4 max-w-lg mx-auto">
                  <FeatureCard icon="🤖" title="Persistent Agent" desc="Long-lived onchain AI with memory" />
                  <FeatureCard icon="🔑" title="Session Keys" desc="One signature, unlimited messages" />
                  <FeatureCard icon="🔒" title="TEE Verified" desc="All processing in secure enclaves" />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Left sidebar */}
              <div className="lg:col-span-1 space-y-4">
                {/* Step 1: Smart Account */}
                <SmartAccountSetup
                  smartAccountAddress={smartAccountAddress}
                  onSmartAccountDeployed={handleSmartAccountDeployed}
                  onSessionAuthorized={handleSessionAuthorized}
                />

                {/* Step 2: Agent Setup (requires smart account) */}
                {smartAccountAddress && sessionReady && (
                  <AgentSetup
                    agentStatus={agentStatus}
                    onAgentAddress={handleAgentCreated}
                    smartAccountAddress={smartAccountAddress}
                  />
                )}

                {/* Step 3: Session Controls */}
                {smartAccountAddress && (
                  <SessionManager
                    smartAccountAddress={smartAccountAddress}
                    onSessionRevoked={handleSessionRevoked}
                  />
                )}

                {/* Agent Info */}
                <AgentInfo
                  agentAddress={agentDeployedAddress}
                  agentStatus={agentStatus}
                  smartAccountAddress={smartAccountAddress}
                  ownerAddress={address}
                  sessionAddress={sessionAddress}
                  isSessionActive={isSessionActive}
                />

                {/* Mobile tab switcher */}
                {agentStatus === "AGENT_RUNNING" && (
                  <div className="flex sm:hidden gap-2">
                    <button
                      onClick={() => setActiveTab("chat")}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                        activeTab === "chat"
                          ? "bg-[#2F795A] text-white"
                          : "bg-white/60 text-black/60 border border-black/5"
                      }`}
                    >
                      Chat
                    </button>
                    <button
                      onClick={() => setActiveTab("settings")}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                        activeTab === "settings"
                          ? "bg-[#2F795A] text-white"
                          : "bg-white/60 text-black/60 border border-black/5"
                      }`}
                    >
                      Settings
                    </button>
                  </div>
                )}
              </div>

              {/* Main content */}
              <div className="lg:col-span-2 space-y-4">
                {(activeTab === "chat" || true) && (
                  <>
                    <ChatPanel
                      agentStatus={agentStatus}
                      smartAccountAddress={smartAccountAddress}
                    />
                    <div className="hidden lg:block">
                      <Settings settings={settings} onSettingsChange={setSettings} />
                    </div>
                  </>
                )}
                {activeTab === "settings" && (
                  <div className="lg:hidden">
                    <Settings settings={settings} onSettingsChange={setSettings} />
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </ChainGuard>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 text-center shadow-sm border border-black/5">
      <div className="text-2xl mb-2">{icon}</div>
      <h3 className="text-xs font-semibold text-black mb-1">{title}</h3>
      <p className="text-[10px] text-black/40 leading-relaxed">{desc}</p>
    </div>
  );
}
