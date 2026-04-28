"use client";

import React, { useState } from "react";
import { useAccount, useSendTransaction } from "wagmi";
import { parseEther, type Address } from "viem";
import { useAddressBalance } from "@/hooks/useAddressBalance";
import { useRitualWalletDeposit, useRitualWalletBalance } from "@/hooks/useRitualWallet";

interface FundingSectionProps {
  smartAccountAddress: `0x${string}` | undefined;
  ownerAddress: `0x${string}` | undefined;
}

export function FundingSection({ smartAccountAddress, ownerAddress }: FundingSectionProps) {
  const { address } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const [gasAmount, setGasAmount] = useState("0.02");
  const [walletAmount, setWalletAmount] = useState("0.02");
  const [sendingGas, setSendingGas] = useState(false);
  const [sendingDeposit, setSendingDeposit] = useState(false);

  const {
    balance: saBalance,
    balanceFormatted: saBalanceFormatted,
    hasBalance: saHasBalance,
    refresh: refreshSaBalance,
  } = useAddressBalance(smartAccountAddress ?? undefined);

  const { depositFor, isPending: isDepositing } = useRitualWalletDeposit();
  const {
    balance: walletBalance,
    balanceFormatted: walletBalanceFormatted,
    refetch: refetchWallet,
    lockUntilBlock,
  } = useRitualWalletBalance(smartAccountAddress ?? undefined);

  const { balanceFormatted: ownerWalletFormatted } = useRitualWalletBalance(ownerAddress ?? undefined);

  const [fundMsg, setFundMsg] = useState<string | null>(null);
  const [depositMsg, setDepositMsg] = useState<string | null>(null);

  const handleFundGas = async () => {
    if (!address || !smartAccountAddress) return;
    setSendingGas(true);
    setFundMsg(null);
    try {
      const txHash = await sendTransactionAsync({
        to: smartAccountAddress,
        value: parseEther(gasAmount),
      });
      setFundMsg(`Sent ${gasAmount} RITUAL. Tx: ${txHash.slice(0, 10)}...`);
      setTimeout(refreshSaBalance, 3000);
    } catch (err: any) {
      setFundMsg(`Failed: ${err?.message || "unknown error"}`);
    } finally {
      setSendingGas(false);
    }
  };

  const handleDeposit = async () => {
    if (!smartAccountAddress) return;
    setSendingDeposit(true);
    setDepositMsg(null);
    try {
      await depositFor(smartAccountAddress, walletAmount, 5000n);
      setDepositMsg("Deposit submitted. Balance updates in ~5s.");
      setTimeout(refetchWallet, 3000);
      setTimeout(refetchWallet, 6000);
    } catch (err: any) {
      setDepositMsg(`Deposit failed: ${err?.message?.slice(0, 80) || "unknown error"}`);
    } finally {
      setSendingDeposit(false);
    }
  };

  const short = (addr: `0x${string}` | null | undefined): string =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "—";

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-black/5 space-y-3">
      <h3 className="text-sm font-semibold text-black">Funding</h3>

      {/* === SMART ACCOUNT NATIVE BALANCE === */}
      <div className="bg-white/40 rounded-xl p-3 space-y-1.5 border border-black/5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-black/60">Smart Account Balance</span>
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${saHasBalance ? "bg-[#2F795A]" : "bg-red-400"}`} />
            <span className="text-xs font-mono text-black">{saBalanceFormatted.toFixed(4)}</span>
            <span className="text-[10px] text-black/40">RITUAL</span>
          </div>
        </div>
        <p className="text-[10px] text-black/30">
          Native RITUAL held by the Smart Account. Used to pay gas for LLM transactions.
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
            disabled={sendingGas || !address || !smartAccountAddress}
            className="px-3 py-1.5 bg-[#2F795A] text-white rounded-xl text-xs font-medium
                       hover:bg-[#256F4E] transition-colors disabled:opacity-40 whitespace-nowrap"
          >
            {sendingGas ? "Sending..." : "Send RITUAL to Smart Account"}
          </button>
        </div>
        {fundMsg && <p className="text-[10px] text-black/50">{fundMsg}</p>}
      </div>

      {/* === RITUALWALLET DEPOSIT === */}
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
          RITUAL deposited into the RitualWallet system contract, credited to your Smart Account.
          The TEE executor uses this balance to cover compute costs.
        </p>
        <p className="text-[10px] text-black/40">
          Deposit goes to: <span className="font-mono text-black/60">RitualWallet (system contract)</span>
        </p>
        <p className="text-[10px] text-black/40">
          Credited for: <span className="font-mono text-black/60">{short(smartAccountAddress)} (Smart Account)</span>
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
            disabled={isDepositing || sendingDeposit || !address}
            className="px-3 py-1.5 bg-[#2F795A] text-white rounded-xl text-xs font-medium
                       hover:bg-[#256F4E] transition-colors disabled:opacity-40 whitespace-nowrap"
          >
            {sendingDeposit ? "Depositing..." : "Deposit to RitualWallet"}
          </button>
        </div>
        {depositMsg && <p className="text-[10px] text-black/50">{depositMsg}</p>}
      </div>

      {/* === ADDRESSES === */}
      <div className="bg-white/40 rounded-xl p-3 border border-black/5 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-black/40">Your Wallet (EOA)</span>
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

      {walletBalance > 0n && (
        <div className="bg-[#2F795A]/10 rounded-xl p-2 text-center">
          <span className="text-[11px] font-medium text-[#2F795A]">
            ✅ Smart Account has {walletBalanceFormatted.toFixed(4)} RITUAL in RitualWallet escrow
          </span>
        </div>
      )}
    </div>
  );
}
