"use client";

import React from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function WalletConnect() {
  return (
    <div className="flex items-center gap-3">
      <ConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          mounted,
        }) => {
          const ready = mounted;
          const connected = ready && account && chain;

          return (
            <div
              {...(!ready && {
                "aria-hidden": true,
                style: { opacity: 0, pointerEvents: "none", userSelect: "none" },
              })}
            >
              {!connected ? (
                <button
                  onClick={openConnectModal}
                  className="px-5 py-2 bg-[#2F795A] text-white rounded-xl text-sm font-medium 
                             hover:bg-[#256F4E] transition-colors 
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F795A]/50"
                >
                  Connect Wallet
                </button>
              ) : chain.id !== 1979 ? (
                <button
                  onClick={openChainModal}
                  className="px-5 py-2 bg-amber-500/10 border border-amber-500 text-amber-600 rounded-xl text-sm font-medium 
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
                >
                  Wrong Network
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/60 backdrop-blur-sm rounded-xl text-xs border border-black/5">
                    <div className="w-2 h-2 rounded-full bg-[#2F795A]"></div>
                    <span className="text-black/60">Ritual Testnet</span>
                  </div>
                  <button
                    onClick={openAccountModal}
                    className="px-4 py-1.5 bg-white/60 backdrop-blur-sm rounded-xl text-sm text-black border border-black/5 
                               hover:bg-white/80 transition-colors
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F795A]/50"
                  >
                    {account.displayName}
                  </button>
                </div>
              )}
            </div>
          );
        }}
      </ConnectButton.Custom>
    </div>
  );
}
