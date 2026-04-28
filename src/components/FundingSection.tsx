"use client";

import React, { useState } from "react";
import { useAccount, useSendTransaction } from "wagmi";
import { parseEther, type Address } from "viem";
import { useSessionKeyBalance } from "@/hooks/useSessionKeyBalance";
import { useRitualWalletDeposit, useRitualWalletBalance } from "@/hooks/useRitualWallet";

const RITUAL_WALLET_ADDRESS = "0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948" as const;

interface FundingSectionProps {
  sessionAddress: `0x${string}` | null;
  previousSessionAddress: `0x${string}` | null;
  isNewSession: boolean;
  smartAccountAddress: `0x${string}` | undefined;
  ownerAddress: `0x${string}` | undefined;
}

export function FundingSection({
  sessionAddress,
  previousSessionAddress,
  isNewSession,
  smartAccountAddress,
  ownerAddress,
}: FundingSectionProps) {
  const { address } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const [gasAmount, setGasAmount] = useState("0.02");
  const [walletAmount, setWalletAmount] = useState("0.02");
  const [sending, setSending] = useState(false);
  const {
    balance: gasBalance,
    balanceFormatted: gasBalanceFormatted,
    hasBalance,
    refresh: refreshGas,
  } = useSessionKeyBalance();
  const { depositFor, isPending: isDepositing } = useRitualWalletDeposit();
  const {
    balance: walletBalance,
    balanceFormatted: walletBalanceFormatted,
    refetch: refetchWallet,
  } = useRitualWalletBalance(sessionAddress ?? undefined);
  // Also check owner EOA balance (from old deposit() calls before depositFor was added)
  const {
    balance: ownerWalletBalance,
    balanceFormatted: ownerWalletFormatted,
  } = useRitualWalletBalance(ownerAddress ?? undefined);
  const [fundMsg, setFundMsg] = useState<string | null>(null);

  const handleFundGas = async () => {
    if (!address || !sessionAddress) return;
    setSending(true);
    setFundMsg(null);
    try {
      const txHash = await sendTransactionAsync({
        to: sessionAddress,
        value: parseEther(gasAmount),
      });
      setFundMsg(`Sent ${gasAmount} RITUAL. Tx: ${txHash.slice(0, 10)}...`);
      setTimeout(refreshGas, 3000);
    } catch (err: any) {
      setFundMsg(`Failed: ${err?.message || "unknown error"}`);
    } finally {
      setSending(false);
    }
  };

  const handleDeposit = async () => {
    if (!sessionAddress) return;
    try {
      await depositFor(sessionAddress, walletAmount, 5000n);
      setTimeout(refetchWallet, 3000);
    } catch (err: any) {
      console.error("Deposit failed:", err);
    }
  };

  const short = (addr: `0x${string}` | null | undefined): string =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "—";

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-black/5 space-y-3">
      {/* Section header */}
      <h3 className="text-sm font-semibold text-black">Funding</h3>

      {/* Session Key warning */}
      {isNewSession && previousSessionAddress && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-[11px] font-semibold text-red-600 mb-1">
            ⚠️ New session key detected
          </p>
          <p className="text-[10px] text-red-500">
            Previous gas/deposits belong to your old session key.
            Previous session key: <span className="font-mono">{short(previousSessionAddress)}</span>
          </p>
        </div>
      )}

      {/* Session Key address (shown once) */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-black/50 font-medium">Session Key</span>
        <span className="text-xs font-mono text-black">{short(sessionAddress)}</span>
      </div>

      {/* Native Gas Balance */}
      <div className="bg-white/40 rounded-xl p-3 space-y-1.5 border border-black/5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-black/60">Native Gas Balance</span>
          <div className="flex items-center gap-1">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                hasBalance ? "bg-[#2F795A]" : "bg-red-400"
              }`}
            />
            <span className="text-xs font-mono text-black">
              {gasBalanceFormatted.toFixed(4)}
            </span>
            <span className="text-[10px] text-black/40">RITUAL</span>
          </div>
        </div>
        <p className="text-[10px] text-black/30">
          Used to pay gas for session-key transactions.
        </p>
        <div className="flex gap-2">
          <input
            type="number"
            value={gasAmount}
            onChange={(e) => setGasAmount(e.target.value)}
            min="0"
            step="0.01"
            className="w-20 px-2 py-1.5 bg-white/80 border border-black/10 rounded-xl text-xs text-black
                       placeholder:text-black/30 focus:outline-none focus:border-[#2F795A]/40
                       [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            onClick={handleFundGas}
            disabled={sending || !address || !sessionAddress}
            className="px-3 py-1.5 bg-[#2F795A] text-white rounded-xl text-xs font-medium
                       hover:bg-[#256F4E] transition-colors disabled:opacity-40 whitespace-nowrap"
          >
            {sending ? "Sending..." : "Fund Session Key Gas"}
          </button>
        </div>
        {fundMsg && <p className="text-[10px] text-black/50">{fundMsg}</p>}
      </div>

      {/* RitualWallet Escrow */}
      <div className="bg-white/40 rounded-xl p-3 space-y-1.5 border border-black/5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-black/60">RitualWallet Escrow</span>
          <div className="flex items-center gap-1">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                walletBalance > 0n ? "bg-[#2F795A]" : "bg-black/20"
              }`}
            />
            <span className="text-xs font-mono text-black">
              {walletBalanceFormatted.toFixed(4)}
            </span>
            <span className="text-[10px] text-black/40">RITUAL</span>
          </div>
        </div>
        <p className="text-[10px] text-black/30">
          Checked via RitualWallet.balanceOf(sessionKey)
        </p>
        <p className="text-[10px] font-mono text-black/30">
          RitualWallet Contract: {short(RITUAL_WALLET_ADDRESS as `0x${string}`)}
        </p>
        <div className="flex gap-2">
          <input
            type="number"
            value={walletAmount}
            onChange={(e) => setWalletAmount(e.target.value)}
            min="0"
            step="0.01"
            className="w-20 px-2 py-1.5 bg-white/80 border border-black/10 rounded-xl text-xs text-black
                       placeholder:text-black/30 focus:outline-none focus:border-[#2F795A]/40
                       [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            onClick={handleDeposit}
            disabled={isDepositing || !address}
            className="px-3 py-1.5 bg-[#2F795A] text-white rounded-xl text-xs font-medium
                       hover:bg-[#256F4E] transition-colors disabled:opacity-40 whitespace-nowrap"
          >
            {isDepositing ? "Depositing..." : "Deposit to RitualWallet"}
          </button>
        </div>
      </div>

      {/* Owner EOA and Smart Account addresses (info only) */}
      <div className="bg-white/40 rounded-xl p-3 border border-black/5 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-black/40">Owner EOA</span>
          <span className="text-[10px] font-mono text-black/50">{short(ownerAddress)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-black/40">Smart Account</span>
          <span className="text-[10px] font-mono text-black/50">{short(smartAccountAddress)}</span>
        </div>
      </div>

      {/* Mismatch warning */}
      {ownerWalletBalance > 0n && walletBalance === 0n && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-[11px] text-red-600">
            ⚠️ Owner EOA has {ownerWalletFormatted.toFixed(4)} RITUAL in RitualWallet escrow,
            but session key has 0. Make a new deposit to fund the current session key via depositFor().
          </p>
        </div>
      )}

      {walletBalance > 0n && (
        <div className="bg-[#2F795A]/10 rounded-xl p-2 text-center">
          <span className="text-[11px] font-medium text-[#2F795A]">
            ✅ Session key has {walletBalanceFormatted.toFixed(4)} RITUAL in RitualWallet escrow
          </span>
        </div>
      )}
    </div>
  );
}
