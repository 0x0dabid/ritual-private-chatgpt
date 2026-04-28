"use client";

import React, { useState } from "react";
import type { AppSettings } from "@/types/agent";
import { useRitualWallet } from "@/hooks/useRitualWallet";

interface SettingsProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

export function Settings({ settings, onSettingsChange }: SettingsProps) {
  const { deposit, isPending } = useRitualWallet();
  const [depositAmount, setDepositAmount] = useState("0.5");

  const handleChange = (field: keyof AppSettings, value: string) => {
    onSettingsChange({ ...settings, [field]: value });
  };

  const handleDeposit = async () => {
    try {
      const amount = parseFloat(depositAmount);
      if (isNaN(amount) || amount <= 0) return;
      await deposit(depositAmount, 5000n);
    } catch (err) {
      console.error("Deposit failed:", err);
    }
  };

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-black/5">
      <h3 className="text-sm font-semibold text-black mb-4">Settings</h3>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-black/50 mb-1">Model Provider</label>
          <select
            value={settings.provider}
            onChange={(e) => handleChange("provider", e.target.value)}
            className="w-full px-3 py-2 bg-white/80 border border-black/10 rounded-xl text-sm text-black 
                       focus:outline-none focus:border-[#2F795A]/40 appearance-none"
          >
            <option value="ritual">Ritual</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="gemini">Gemini</option>
            <option value="openrouter">OpenRouter</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-black/50 mb-1">Model Name</label>
          <input
            type="text"
            value={settings.model}
            onChange={(e) => handleChange("model", e.target.value)}
            className="w-full px-3 py-2 bg-white/80 border border-black/10 rounded-xl text-sm text-black 
                       placeholder:text-black/30 focus:outline-none focus:border-[#2F795A]/40"
            placeholder="gpt-4"
          />
        </div>

        <div>
          <label className="block text-xs text-black/50 mb-1">System Prompt</label>
          <textarea
            value={settings.systemPrompt}
            onChange={(e) => handleChange("systemPrompt", e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-white/80 border border-black/10 rounded-xl text-sm text-black 
                       placeholder:text-black/30 focus:outline-none focus:border-[#2F795A]/40 resize-none"
          />
        </div>

        <div className="pt-3 border-t border-black/5">
          <h4 className="text-xs font-medium text-black mb-2">RitualWallet Deposit</h4>
          <p className="text-[10px] text-black/40 mb-3 leading-relaxed">
            Async operations require a RITUAL deposit in RitualWallet
            (0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948).
            No minimum amount. Locked for 5000 blocks.
          </p>
          <div className="flex gap-2">
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              min="0"
              step="0.1"
              placeholder="0.5"
              className="flex-1 px-3 py-2 bg-white/80 border border-black/10 rounded-xl text-sm text-black 
                         placeholder:text-black/30 focus:outline-none focus:border-[#2F795A]/40
                         [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              onClick={handleDeposit}
              disabled={isPending || !depositAmount || parseFloat(depositAmount) <= 0}
              className="px-4 py-2 bg-[#2F795A] text-white rounded-xl text-sm font-medium whitespace-nowrap
                         hover:bg-[#256F4E] transition-colors disabled:opacity-40
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F795A]/50"
            >
              {isPending ? "Depositing..." : "Deposit RITUAL"}
            </button>
          </div>
        </div>

        <div className="pt-2">
          <p className="text-[10px] text-black/40 leading-relaxed">
            ⚠️ API keys cannot be stored in plain text in the frontend. 
            For secure key handling, configure encrypted secrets through ECIES 
            encryption to the TEE executor&apos;s public key.
          </p>
        </div>
      </div>
    </div>
  );
}
