"use client";

import React, { useState } from "react";
import { useAccount, useSendTransaction } from "wagmi";
import { parseEther } from "viem";
import { useSessionKeyBalance } from "@/hooks/useSessionKeyBalance";
import { useRitualWalletDeposit, useRitualWalletBalance } from "@/hooks/useRitualWallet";

interface FundingSectionProps {
  sessionAddress: `0x${string}` | null;
}

export function FundingSection({ sessionAddress }: FundingSectionProps) {
  const { address } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const [gasAmount, setGasAmount] = useState("0.02");
  const [walletAmount, setWalletAmount] = useState("0.02");
  const [sending, setSending] = useState(false);
  const { balanceFormatted: gasBalanceFormatted, hasBalance, refresh: refreshGas } = useSessionKeyBalance();
  const { deposit, depositFor, isPending: isDepositing } = useRitualWalletDeposit();
  const { balance: walletBalance, balanceFormatted: walletBalanceFormatted, refetch: refetchWallet } = useRitualWalletBalance(sessionAddress ?? undefined);
  // Also check owner EOA balance (from old deposit() calls before depositFor was added)
  const { balance: ownerWalletBalance, balanceFormatted: ownerWalletFormatted } = useRitualWalletBalance(address ?? undefined);
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

  const sessionShort = sessionAddress
    ? `${sessionAddress.slice(0, 6)}...${sessionAddress.slice(-4)}`
    : "—";

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-black/5">
      <h3 className="text-sm font-semibold text-black mb-3">Funding</h3>

      {/* Session Key Gas */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-black/50">Session Key Gas</span>
          <span className="text-xs font-mono text-black">{sessionShort}</span>
        </div>
        <div className="flex items-center gap-1 mb-2">
          <div className={`w-1.5 h-1.5 rounded-full ${hasBalance ? "bg-[#2F795A]" : "bg-red-400"}`} />
          <span className="text-xs">
            <span className="font-mono">{gasBalanceFormatted.toFixed(4)}</span>
            <span className="text-black/50 ml-1">RITUAL</span>
          </span>
        </div>
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
        <p className="text-[10px] text-black/30 mt-1">
          This sends native RITUAL to your session key so it can pay gas.
        </p>
        {fundMsg && <p className="text-[10px] text-black/50 mt-1">{fundMsg}</p>}
      </div>

      {/* RitualWallet Deposit */}
      <div className="pt-3 border-t border-black/5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-black/50">RitualWallet Deposit</span>
          <span className="text-xs font-mono text-black">{sessionShort}</span>
        </div>
        <div className="flex items-center gap-1 mb-2">
          <div className={`w-1.5 h-1.5 rounded-full ${walletBalance > 0n ? "bg-[#2F795A]" : "bg-black/20"}`} />
          <span className="text-xs">
            <span className="font-mono">{walletBalanceFormatted.toFixed(4)}</span>
            <span className="text-black/50 ml-1">RITUAL</span>
          </span>
        </div>
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
        <p className="text-[10px] text-black/30 mt-1">
          Used for executor fees, not gas. Deposit is for the session key address via depositFor().
        </p>
        <div className="mt-2 text-[9px] font-mono space-y-0.5">
          <div className={sessionAddress && walletBalance === 0n && ownerWalletBalance > 0n ? "text-red-500" : "text-black/30"}>
            Current Session Key: {sessionShort}
          </div>
          <div className={sessionAddress && walletBalance > 0n ? "text-[#2F795A]" : "text-red-500"}>
            Last Deposit Beneficiary: {walletBalance > 0n ? sessionShort : "0x... (no deposit found for session key)"}
          </div>
          <div className="text-black/30">
            RitualWallet balance checked for: {sessionShort}
          </div>
          {ownerWalletBalance > 0n && walletBalance === 0n && (
            <div className="text-red-500">
              ⚠️ Owner EOA has {ownerWalletFormatted.toFixed(4)} RITUAL in RitualWallet, but session key has 0.
              Make a new deposit to fund the current session key.
            </div>
          )}
          {walletBalance > 0n && (
            <div className="text-[#2F795A]">
              ✅ Session key has {walletBalanceFormatted.toFixed(4)} RITUAL in RitualWallet
            </div>
          )}
          <div className="text-black/30">raw session key wei: {walletBalance.toString()}</div>
        </div>
      </div>
    </div>
  );
}
