"use client";

import React from "react";
import type { Address } from "viem";
import { useSessionKey } from "@/hooks/useSessionKey";
import { useRemoveSessionKey, useIsAuthorized } from "@/hooks/useSmartAccount";

interface SessionManagerProps {
  smartAccountAddress: Address | undefined;
  onSessionRevoked: () => void;
}

export function SessionManager({
  smartAccountAddress,
  onSessionRevoked,
}: SessionManagerProps) {
  const { sessionAddress, clearSession } = useSessionKey();
  const { removeSessionKey, isPending: isRevoking } = useRemoveSessionKey(smartAccountAddress);
  const { isAuthorized } = useIsAuthorized(
    smartAccountAddress,
    sessionAddress ?? undefined
  );

  const handleRevoke = async () => {
    if (!smartAccountAddress || !sessionAddress) return;
    try {
      await removeSessionKey(sessionAddress);
    } catch (err) {
      console.error("Failed to revoke session:", err);
    }
    clearSession();
    onSessionRevoked();
  };

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-black/5">
      <h3 className="text-sm font-semibold text-black mb-3">Session Controls</h3>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-black/50">Status</span>
          <div className="flex items-center gap-1.5">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                isAuthorized ? "bg-[#2F795A]" : "bg-black/20"
              }`}
            />
            <span className={`text-xs ${isAuthorized ? "text-[#2F795A]" : "text-black/40"}`}>
              {isAuthorized ? "Session active" : "No active session"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-black/50">Session Key</span>
          <span className="text-xs font-mono text-black">
            {sessionAddress
              ? `${sessionAddress.slice(0, 6)}...${sessionAddress.slice(-4)}`
              : "—"}
          </span>
        </div>

        <button
          onClick={handleRevoke}
          disabled={!isAuthorized || isRevoking}
          className="w-full py-2 border border-red-400/30 text-red-500 rounded-xl text-xs font-medium 
                     hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
        >
          {isRevoking ? "Revoking..." : "Revoke Session"}
        </button>

        <p className="text-[10px] text-black/30 leading-relaxed">
          Session key is stored in your browser (localStorage). It persists across
          refreshes and redeploys. Click &quot;Revoke Session&quot; above to clear it.
        </p>
      </div>
    </div>
  );
}
