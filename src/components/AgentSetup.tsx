"use client";

import React, { useState } from "react";
import type { AgentStatus } from "@/types/asyncTx";

interface AgentSetupProps {
  agentStatus: AgentStatus;
  onAgentAddress: (addr: `0x${string}`) => void;
  smartAccountAddress?: `0x${string}`;
}

export function AgentSetup({ agentStatus, onAgentAddress, smartAccountAddress }: AgentSetupProps) {
  const [name, setName] = useState("My Private ChatGPT");
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("gpt-4");
  const [systemPrompt, setSystemPrompt] = useState(
    "You are a helpful AI assistant on Ritual Chain. Respond concisely and accurately."
  );
  const [isCreating, setIsCreating] = useState(false);

  const statusLabels: Record<AgentStatus, { label: string; color: string }> = {
    NO_AGENT: { label: "No Agent Yet", color: "text-black/40" },
    AGENT_CREATING: { label: "Creating Agent...", color: "text-blue-600" },
    AGENT_CREATED: { label: "Agent Registered", color: "text-[#2F795A]" },
    AGENT_RUNNING: { label: "Agent Running", color: "text-[#2F795A]" },
    WAITING_RESPONSE: { label: "Waiting for Response", color: "text-amber-600" },
    RESPONSE_DELIVERED: { label: "Response Delivered", color: "text-[#2F795A]" },
    ERROR: { label: "Error", color: "text-red-600" },
  };

  const currentStatus = statusLabels[agentStatus];

  const handleCreateAgent = async () => {
    if (!smartAccountAddress) return;
    setIsCreating(true);
    // In production, this deploys a Persistent Agent through the factory (0xD4AA9D...)
    // and links it to the smart account via registerAgent(). For now, metadata
    // is stored in the ChatGPTAgent consumer contract as an "App Agent Registered" entry.
    const placeholderAddr = `0x${"2".repeat(40)}` as `0x${string}`;
    setTimeout(() => {
      onAgentAddress(placeholderAddr);
      setIsCreating(false);
    }, 1000);
  };

  const isActive = agentStatus === "AGENT_RUNNING" || agentStatus === "AGENT_CREATED";
  const canCreate = smartAccountAddress && !isActive;

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-black/5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-black">Agent Setup</h3>
        <div className={`flex items-center gap-1.5 text-xs ${currentStatus.color}`}>
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              isActive ? "bg-[#2F795A]" : agentStatus === "ERROR" ? "bg-red-500" : agentStatus === "WAITING_RESPONSE" ? "bg-amber-500" : "bg-black/20"
            }`}
          />
          <span>{currentStatus.label}</span>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-black/50 mb-1">Agent Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-white/80 border border-black/10 rounded-xl text-sm text-black 
                       placeholder:text-black/30 focus:outline-none focus:border-[#2F795A]/40"
            placeholder="My Agent"
            disabled={isActive}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-black/50 mb-1">Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full px-3 py-2 bg-white/80 border border-black/10 rounded-xl text-sm text-black 
                         focus:outline-none focus:border-[#2F795A]/40 appearance-none"
              disabled={isActive}
            >
              <option value="ritual">Ritual</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="gemini">Gemini</option>
              <option value="openrouter">OpenRouter</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-black/50 mb-1">Model</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 bg-white/80 border border-black/10 rounded-xl text-sm text-black 
                         placeholder:text-black/30 focus:outline-none focus:border-[#2F795A]/40"
              placeholder="gpt-4"
              disabled={isActive}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-black/50 mb-1">System Prompt</label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 bg-white/80 border border-black/10 rounded-xl text-sm text-black 
                       placeholder:text-black/30 focus:outline-none focus:border-[#2F795A]/40 resize-none"
            disabled={isActive}
          />
        </div>

        <button
          onClick={handleCreateAgent}
          disabled={!canCreate || isCreating}
          className="w-full py-2.5 bg-[#2F795A] text-white rounded-xl text-sm font-medium 
                     hover:bg-[#256F4E] transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F795A]/50"
        >
          {isCreating ? (
            <span className="flex items-center gap-2 justify-center">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Deploying...
            </span>
          ) : isActive ? (
            "App Agent Active"
          ) : (
            "Register App Agent"
          )}
        </button>
      </div>
    </div>
  );
}
