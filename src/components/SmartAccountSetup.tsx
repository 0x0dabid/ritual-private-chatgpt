"use client";

import React, { useState } from "react";
import type { Address } from "viem";
import { useAccount } from "wagmi";
import { useDeploySmartAccount, useSmartAccountInfo } from "@/hooks/useSmartAccount";
import { useSessionKey } from "@/hooks/useSessionKey";
import { useAddSessionKey, useIsAuthorized } from "@/hooks/useSmartAccount";

interface SmartAccountSetupProps {
  smartAccountAddress: Address | undefined;
  onSmartAccountDeployed: (addr: Address) => void;
  onSessionAuthorized: () => void;
}

export function SmartAccountSetup({
  smartAccountAddress,
  onSmartAccountDeployed,
  onSessionAuthorized,
}: SmartAccountSetupProps) {
  const { address: userAddress, isConnected } = useAccount();
  const { deploy, isDeploying } = useDeploySmartAccount();
  const { sessionAddress, clearSession } = useSessionKey();
  const { owner, sessionKeyCount, isOwner } = useSmartAccountInfo(smartAccountAddress);
  const { addSessionKey, isPending: isAddingSession } = useAddSessionKey(smartAccountAddress);
  const { isAuthorized } = useIsAuthorized(smartAccountAddress, sessionAddress ?? undefined);

  const [step, setStep] = useState<
    "connect" | "create-account" | "authorize-session" | "ready"
  >(isConnected ? "create-account" : "connect");

  const handleDeploy = async () => {
    // In production, this would deploy SmartAccount via a wallet tx
    // For demo, we simulate deployment with a deterministic address
    const simulatedAddr = `0x${"1".repeat(40)}` as Address;
    onSmartAccountDeployed(simulatedAddr);
    setStep("authorize-session");
  };

  const handleAuthorizeSession = async () => {
    if (!smartAccountAddress || !sessionAddress) return;
    try {
      await addSessionKey(sessionAddress);
      onSessionAuthorized();
      setStep("ready");
    } catch (err) {
      console.error("Failed to authorize session:", err);
    }
  };

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-black/5">
      <h3 className="text-sm font-semibold text-black mb-3">Smart Account Setup</h3>

      <div className="space-y-3">
        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {["connect", "create-account", "authorize-session", "ready"].map((s, i) => (
            <React.Fragment key={s}>
              <div
                className={`w-2 h-2 rounded-full ${
                  step === s
                    ? "bg-[#2F795A]"
                    : ["connect", "create-account", "authorize-session"].indexOf(step) >= i
                    ? "bg-[#2F795A]/40"
                    : "bg-black/10"
                }`}
              />
              {i < 3 && <div className="w-4 h-px bg-black/10" />}
            </React.Fragment>
          ))}
        </div>

        {!isConnected ? (
          <p className="text-xs text-black/40">Connect your wallet to begin.</p>
        ) : step === "create-account" || !smartAccountAddress ? (
          <div>
            <p className="text-xs text-black/50 mb-2">
              Deploy a smart account owned by your EOA. This enables session-based chat without repeated wallet prompts.
            </p>
            <button
              onClick={handleDeploy}
              disabled={isDeploying}
              className="w-full py-2.5 bg-[#2F795A] text-white rounded-xl text-sm font-medium 
                         hover:bg-[#256F4E] transition-colors disabled:opacity-40
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F795A]/50"
            >
              {isDeploying ? "Deploying..." : "Create Smart Account"}
            </button>
          </div>
        ) : step === "authorize-session" ? (
          <div>
            <p className="text-xs text-black/50 mb-2">
              Sign once to authorize an ephemeral session key. Future chat messages
              will be submitted through this session without wallet popups.
            </p>
            <p className="text-[10px] text-black/30 mb-3 font-mono break-all">
              Session key: {sessionAddress?.slice(0, 10)}...{sessionAddress?.slice(-6)}
            </p>
            <button
              onClick={handleAuthorizeSession}
              disabled={isAddingSession}
              className="w-full py-2.5 bg-[#2F795A] text-white rounded-xl text-sm font-medium 
                         hover:bg-[#256F4E] transition-colors disabled:opacity-40
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F795A]/50"
            >
              {isAddingSession ? "Authorizing..." : "Start Chat Session"}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-[#2F795A]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>One-time authorization active</span>
            </div>
            <p className="text-[10px] text-black/40 leading-relaxed">
              Your session key is authorized to submit chat messages through your smart account.
              Close the browser tab to revoke. Full session controls are below.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
