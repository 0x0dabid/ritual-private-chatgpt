"use client";

import React, { useState } from "react";
import type { Address } from "viem";
import { useAccount } from "wagmi";
import { usePredictSmartAccount, useIsSmartAccountDeployed, useDeploySmartAccount, useAddSessionKey, useIsAuthorized } from "@/hooks/useSmartAccount";
import { useSessionKey } from "@/hooks/useSessionKey";

interface SmartAccountSetupProps {
  onSmartAccountDeployed: (addr: Address) => void;
  onSessionAuthorized: () => void;
}

export function SmartAccountSetup({
  onSmartAccountDeployed,
  onSessionAuthorized,
}: SmartAccountSetupProps) {
  const { address: userAddress, isConnected } = useAccount();
  const { sessionAddress } = useSessionKey();
  const { predictedAddress } = usePredictSmartAccount(userAddress);
  const { isDeployed } = useIsSmartAccountDeployed(userAddress);
  const { deploy, isDeploying } = useDeploySmartAccount();
  const { addSessionKey, isPending: isAddingSession } = useAddSessionKey(predictedAddress);
  const { isAuthorized } = useIsAuthorized(predictedAddress, sessionAddress ?? undefined);
  const [deployMsg, setDeployMsg] = useState<string | null>(null);
  const [authMsg, setAuthMsg] = useState<string | null>(null);

  const handleDeploy = async () => {
    setDeployMsg(null);
    try {
      const addr = await deploy();
      if (addr) {
        onSmartAccountDeployed(addr);
        setDeployMsg(`Deployed at ${addr.slice(0, 10)}...${addr.slice(-6)}`);
      }
    } catch (err: any) {
      setDeployMsg(`Deploy failed: ${err?.message?.slice(0, 80) || "unknown error"}`);
    }
  };

  const handleAuthorizeSession = async () => {
    if (!predictedAddress || !sessionAddress) return;
    setAuthMsg(null);
    try {
      await addSessionKey(sessionAddress);
      onSessionAuthorized();
      setAuthMsg("Session key authorized");
    } catch (err: any) {
      setAuthMsg(`Authorization failed: ${err?.message?.slice(0, 80) || "unknown error"}`);
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

      {/* Predicted address (deterministic) */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-black/50">Predicted Address</span>
        <span className="text-xs font-mono text-black">{short(predictedAddress)}</span>
      </div>

      {/* Deployment status */}
      <div className="bg-white/40 rounded-xl p-3 border border-black/5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-black/60">Deployment Status</span>
          <div className="flex items-center gap-1">
            {isDeployed === null ? (
              <span className="text-[10px] text-black/30">Checking...</span>
            ) : isDeployed ? (
              <span className="text-[11px] text-[#2F795A] font-medium flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Deployed
              </span>
            ) : (
              <span className="text-[11px] text-red-500 font-medium">Not deployed</span>
            )}
          </div>
        </div>

        {!isDeployed && predictedAddress && (
          <div>
            <p className="text-[10px] text-black/40 mb-2">
              No SmartAccount exists for your wallet. Deploy one to enable session-based
              chat through the account abstraction path.
            </p>
            <button
              onClick={handleDeploy}
              disabled={isDeploying}
              className="w-full py-2 bg-[#2F795A] text-white rounded-xl text-xs font-medium
                         hover:bg-[#256F4E] transition-colors disabled:opacity-40"
            >
              {isDeploying ? "Deploying..." : "Create Smart Account"}
            </button>
            {deployMsg && (
              <p className={`text-[10px] mt-1.5 ${deployMsg.includes("failed") ? "text-red-500" : "text-[#2F795A]"}`}>
                {deployMsg}
              </p>
            )}
          </div>
        )}

        {isDeployed && predictedAddress && (
          <div className="text-[10px] text-black/40">
            <p className="mb-1">SmartAccount is deployed and ready.</p>
            <p className="font-mono text-black/60 break-all">{predictedAddress}</p>
          </div>
        )}
      </div>

      {/* Session key authorization (only shown if deployed) */}
      {isDeployed && predictedAddress && (
        <div className="bg-white/40 rounded-xl p-3 border border-black/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-black/60">Session Authorization</span>
            <div className="flex items-center gap-1">
              {isAuthorized === null ? (
                <span className="text-[10px] text-black/30">Checking...</span>
              ) : isAuthorized ? (
                <span className="text-[11px] text-[#2F795A] font-medium flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Authorized
                </span>
              ) : (
                <span className="text-[11px] text-amber-600 font-medium">Not authorized</span>
              )}
            </div>
          </div>

          {!isAuthorized && sessionAddress && (
            <div>
              <p className="text-[10px] text-black/40 mb-2">
                Authorize your session key to submit chat messages through the smart account
                without repeated wallet popups.
              </p>
              <p className="text-[10px] font-mono text-black/30 mb-2">
                Session key: {short(sessionAddress)}
              </p>
              <button
                onClick={handleAuthorizeSession}
                disabled={isAddingSession}
                className="w-full py-2 bg-[#2F795A] text-white rounded-xl text-xs font-medium
                           hover:bg-[#256F4E] transition-colors disabled:opacity-40"
              >
                {isAddingSession ? "Authorizing..." : "Authorize Session Key"}
              </button>
              {authMsg && (
                <p className={`text-[10px] mt-1.5 ${authMsg.includes("failed") ? "text-red-500" : "text-[#2F795A]"}`}>
                  {authMsg}
                </p>
              )}
            </div>
          )}

          {isAuthorized && (
            <p className="text-[10px] text-black/40">
              Session key is authorized to execute calls through the SmartAccount.
            </p>
          )}

          {!sessionAddress && (
            <p className="text-[10px] text-black/30">No session key generated yet.</p>
          )}
        </div>
      )}

      {/* Not deployed + no predicted address (factory not set) */}
      {!predictedAddress && !isDeployed && (
        <p className="text-[10px] text-amber-600">
          SmartAccountFactory address not configured. Set NEXT_PUBLIC_SMART_ACCOUNT_FACTORY in .env.local.
        </p>
      )}
    </div>
  );
}
