"use client";

import React from "react";
import { type Address } from "viem";
import { useSessionKeyBalance } from "@/hooks/useSessionKeyBalance";
import { useRitualWalletBalance } from "@/hooks/useRitualWallet";
import type { ExecutorInfo } from "@/hooks/useExecutorDiscovery";

interface VerifySetupProps {
  isSmartAccountDeployed: boolean;
  isSessionAuthorized: boolean;
  sessionAddress: Address | null;
  executor: ExecutorInfo | null;
}

type CheckStatus = "pass" | "fail" | "info" | "loading";

function CheckRow({ label, status, detail }: { label: string; status: CheckStatus; detail?: string }) {
  const colors = {
    pass: { dot: "bg-[#2F795A]", text: "text-[#2F795A]" },
    fail: { dot: "bg-red-400", text: "text-red-500" },
    info: { dot: "bg-black/20", text: "text-black/40" },
    loading: { dot: "bg-amber-400 animate-pulse", text: "text-amber-600" },
  };
  const c = colors[status];
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
        <span className="text-[10px] text-black/50">{label}</span>
      </div>
      <span className={`text-[10px] font-mono ${c.text}`}>{detail || (status === "pass" ? "OK" : status === "fail" ? "FAIL" : status === "loading" ? "..." : "—")}</span>
    </div>
  );
}

export function VerifySetup({ isSmartAccountDeployed, isSessionAuthorized, sessionAddress, executor }: VerifySetupProps) {
  const { balanceFormatted: gasBalance, hasBalance, loading: gasLoading } = useSessionKeyBalance();
  const { balanceFormatted: walletBalance, balance } = useRitualWalletBalance(sessionAddress ?? undefined);

  // LLM mode detection: "direct" if session key can send to 0x0802
  const llmMode = isSmartAccountDeployed && isSessionAuthorized ? "smart-account" : "direct";
  const executorReady = !!executor;

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-black/5">
      <h3 className="text-sm font-semibold text-black mb-2">Setup Verification</h3>
      <div className="space-y-0.5">
        <CheckRow
          label="SmartAccount deployed"
          status={isSmartAccountDeployed ? "pass" : "fail"}
          detail={isSmartAccountDeployed ? "Deployed" : "Not deployed"}
        />
        <CheckRow
          label="Session key authorized"
          status={isSmartAccountDeployed ? (isSessionAuthorized ? "pass" : "fail") : "info"}
          detail={!isSmartAccountDeployed ? "N/A (no SA)" : isSessionAuthorized ? "Authorized" : "Not authorized"}
        />
        <CheckRow
          label="Session key gas balance"
          status={gasLoading ? "loading" : hasBalance ? "pass" : "fail"}
          detail={gasLoading ? "..." : `${gasBalance.toFixed(4)} RITUAL`}
        />
        <CheckRow
          label="RitualWallet escrow"
          status={balance > 0n ? "pass" : "fail"}
          detail={balance > 0n ? `${walletBalance.toFixed(4)} RITUAL` : "0 RITUAL"}
        />
        <CheckRow
          label="Executor ready"
          status={executorReady ? "pass" : "fail"}
          detail={executorReady ? `${executor!.teeAddress.slice(0, 8)}...` : "No executor"}
        />
        <CheckRow
          label="LLM mode"
          status="info"
          detail={llmMode === "direct" ? "Direct (session → 0x0802)" : "SmartAccount"}
        />
      </div>

      {isSmartAccountDeployed === false && sessionAddress && executorReady && hasBalance && balance > 0n && (
        <div className="mt-2 text-[10px] text-[#2F795A] bg-[#2F795A]/5 rounded-xl p-2 text-center">
          ✅ Direct LLM mode is ready. SmartAccount not required — session key sends directly to precompile 0x0802.
        </div>
      )}

      {!executorReady && (
        <div className="mt-2 text-[10px] text-amber-600 bg-amber-50 rounded-xl p-2 text-center">
          Waiting for executor discovery. Retry if this persists.
        </div>
      )}
    </div>
  );
}
