"use client";

import React, { useState, useEffect } from "react";
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
  const { deploy, isDeploying, deployedAddr, deployHash } = useDeploySmartAccount();
  const { addSessionKey, isPending: isAddingSession } = useAddSessionKey(predictedAddress);
  const { isAuthorized } = useIsAuthorized(predictedAddress, sessionAddress ?? undefined);
  const [deployMsg, setDeployMsg] = useState<string | null>(null);
  const [authMsg, setAuthMsg] = useState<string | null>(null);
  const [txPending, setTxPending] = useState(false);

  // When deploy tx hash appears, show pending state
  useEffect(() => {
    if (deployHash) {
      setTxPending(true);
      setDeployMsg("Transaction submitted. Waiting for confirmation...");
    }
  }, [deployHash]);

  // When deployed address appears from event parsing or isDeployed flips, it's done
  useEffect(() => {
    if (deployedAddr) {
      setTxPending(false);
      setDeployMsg(`Deployed at ${deployedAddr.slice(0, 10)}...${deployedAddr.slice(-6)}`);
      onSmartAccountDeployed(deployedAddr);
    }
  }, [deployedAddr, onSmartAccountDeployed]);

  // If isDeployed flips but deployedAddr wasn't caught by event parsing
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

      <div className="flex items-center justify-between">
        <span className="text-xs text-black/50">Predicted Address</span>
        <span className="text-xs font-mono text-black">{short(predictedAddress)}</span>
      </div>

      <div className="bg-white/40 rounded-xl p-3 border border-black/5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-black/60">Deployment Status</span>
          <span className={`text-[11px] font-medium flex items-center gap-1 ${
            isDeployed ? "text-[#2F795A]" : "text-red-500"
          }`}>
            {isDeployed ? (
              <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>Deployed</>
            ) : txPending ? (
              <span className="text-amber-600">Confirming...</span>
            ) : (
              "Not deployed"
            )}
          </span>
        </div>

        {!isDeployed && predictedAddress && (
          <div>
            <p className="text-[10px] text-black/40 mb-2">
              Deploy a SmartAccount owned by your wallet. This enables
              session-based execution through the account abstraction path.
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

        {isDeployed && predictedAddress && (
          <div className="text-[10px] text-black/40">
            <p className="font-mono text-black/60 break-all">{predictedAddress}</p>
          </div>
        )}
      </div>

      {isDeployed && predictedAddress && (
        <div className="bg-white/40 rounded-xl p-3 border border-black/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-black/60">Session Authorization</span>
            <span className={`text-[11px] font-medium ${isAuthorized ? "text-[#2F795A]" : "text-amber-600"}`}>
              {isAuthorized ? "Authorized" : "Not authorized"}
            </span>
          </div>

          {!isAuthorized && sessionAddress && (
            <div>
              <p className="text-[10px] text-black/40 mb-2">
                Authorize session key <span className="font-mono">{short(sessionAddress)}</span>
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
            <p className="text-[10px] text-black/40">Session key is authorized.</p>
          )}
        </div>
      )}

      {!predictedAddress && (
        <p className="text-[10px] text-amber-600">
          SmartAccountFactory address not configured in .env.local
        </p>
      )}
    </div>
  );
}
