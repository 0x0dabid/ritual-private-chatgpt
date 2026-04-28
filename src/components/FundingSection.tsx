"use client";

import React, { useState } from "react";
import { useAccount, useSendTransaction } from "wagmi";
import { parseEther, type Address } from "viem";
import { useSessionKeyBalance } from "@/hooks/useSessionKeyBalance";
import { useRitualWalletDeposit, useRitualWalletBalance } from "@/hooks/useRitualWallet";

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
    lockUntilBlock,
  } = useRitualWalletBalance(sessionAddress ?? undefined);
  // Owner's RitualWallet balance (separate from session key)
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
      <h3 className="text-sm font-semibold text-black">Funding</h3>

      {isNewSession && previousSessionAddress && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-[11px] font-semibold text-red-600 mb-1">⚠️ New session key detected</p>
          <p className="text-[10px] text-red-500">
            Previous gas/deposits belong to your old session key.
            Previous session key: <span className="font-mono">{short(previousSessionAddress)}</span>
          </p>
        </div>
      )}

      {/* === SESSION KEY === */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-black/50 font-medium">Session Key</span>
        <span className="text-xs font-mono text-black">{short(sessionAddress)}</span>
      </div>
      <p className="text-[9px] text-black/30 -mt-2">
        Cryptographic key for signing transactions. Stored in localStorage. Does not change on refresh.
      </p>

      {/* === NATIVE GAS (session key's own balance) === */}
      <div className="bg-white/40 rounded-xl p-3 space-y-1.5 border border-black/5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-black/60">Native RITUAL (session key wallet)</span>
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${hasBalance ? "bg-[#2F795A]" : "bg-red-400"}`} />
            <span className="text-xs font-mono text-black">{gasBalanceFormatted.toFixed(4)}</span>
            <span className="text-[10px] text-black/40">RITUAL</span>
          </div>
        </div>
        <p className="text-[10px] text-black/30">
          This is RITUAL held directly by the session key address. Used to pay gas for LLM transactions.
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
            {sending ? "Sending..." : "Send RITUAL to Session Key"}
          </button>
        </div>
        {fundMsg && <p className="text-[10px] text-black/50">{fundMsg}</p>}
      </div>

      {/* === RITUALWALLET ESCROW (session key's deposited balance in the system contract) === */}
      <div className="bg-white/40 rounded-xl p-3 space-y-1.5 border border-black/5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-black/60">RitualWallet Deposit</span>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${walletBalance > 0n ? "bg-[#2F795A]" : "bg-black/20"}`} />
            <span className="text-xs font-mono text-black">{walletBalanceFormatted.toFixed(4)}</span>
            <span className="text-[10px] text-black/40">RITUAL</span>
            {lockUntilBlock > 0 && <span className="text-[9px] text-black/30">locked to block {lockUntilBlock}</span>}
            <button onClick={() => refetchWallet()} className="text-[9px] text-[#2F795A] hover:text-[#256F4E] underline">refresh</button>
          </div>
        </div>
        <p className="text-[10px] text-black/30">
          RITUAL deposited into the RitualWallet system contract, credited to your session key.
          The TEE executor uses this balance to cover compute costs.
        </p>
        <p className="text-[10px] text-black/40">
          Deposit goes to: <span className="font-mono text-black/60">RitualWallet (system contract 0x532F...3948)</span>
        </p>
        <p className="text-[10px] text-black/40">
          Credited for: <span className="font-mono text-black/60">{short(sessionAddress)} (session key)</span>
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

      {/* === ADDRESSES (info only) === */}
      <div className="bg-white/40 rounded-xl p-3 border border-black/5 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-black/40">Owner EOA (your wallet)</span>
          <span className="text-[10px] font-mono text-black/50">{short(ownerAddress)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-black/40">Smart Account (contract)</span>
          <span className="text-[10px] font-mono text-black/50">{short(smartAccountAddress)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-black/40">RitualWallet (system contract)</span>
          <span className="text-[10px] font-mono text-black/50">0x532F...3948</span>
        </div>
      </div>

      {/* Mismatch warning */}
      {ownerWalletBalance > 0n && walletBalance === 0n && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-[11px] text-red-600">
            ⚠️ Your wallet has {ownerWalletFormatted.toFixed(4)} RITUAL in the RitualWallet
            (from old deposit() calls), but the current session key has 0.
            Make a new deposit via &quot;Deposit to RitualWallet&quot; above.
            The deposit will go to the RitualWallet contract, credited to the current session key.
          </p>
        </div>
      )}

      {walletBalance > 0n && (
        <div className="bg-[#2F795A]/10 rounded-xl p-2 text-center">
          <span className="text-[11px] font-medium text-[#2F795A]">
            ✅ Session key has {walletBalanceFormatted.toFixed(4)} RITUAL deposited in RitualWallet
          </span>
        </div>
      )}
    </div>
  );
}
