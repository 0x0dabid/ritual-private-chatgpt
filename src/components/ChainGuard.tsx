"use client";

import React from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { ritualChain } from "@/lib/chain";

export function ChainGuard({ children }: { children: React.ReactNode }) {
  const { chain, isConnected } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  if (isConnected && chain?.id !== ritualChain.id) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 max-w-md w-full text-center shadow-sm border border-black/5">
          <div className="text-6xl mb-4">🌐</div>
          <h2 className="text-xl font-semibold text-black mb-2">
            Wrong Network
          </h2>
          <p className="text-black/60 mb-6 text-sm">
            You are connected to{" "}
            <span className="font-mono text-xs">{chain?.name || "Unknown"}</span>
            . Please switch to{" "}
            <span className="font-mono text-xs">Ritual Testnet (Chain ID 1979)</span>
            .
          </p>
          <button
            onClick={() => switchChain({ chainId: ritualChain.id })}
            disabled={isPending}
            className="px-6 py-2.5 bg-[#2F795A] text-white rounded-xl text-sm font-medium 
                       hover:bg-[#256F4E] transition-colors disabled:opacity-50 
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F795A]/50"
          >
            {isPending ? (
              <span className="flex items-center gap-2 justify-center">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Switching...
              </span>
            ) : (
              "Switch to Ritual Testnet"
            )}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
