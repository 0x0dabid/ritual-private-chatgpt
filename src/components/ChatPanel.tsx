"use client";

import { useState, useRef, useEffect } from "react";
import type { AgentStatus } from "@/types/asyncTx";
import type { ChatMessage } from "@/types/agent";
import type { Address, Hex } from "viem";
import { keccak256, toHex } from "viem";
import { useChatStore } from "@/stores/chatStore";
import { useSessionKey } from "@/hooks/useSessionKey";
import { useSessionKeyBalance } from "@/hooks/useSessionKeyBalance";
import { submitDirectLLM, submitViaSmartAccount } from "@/hooks/useLLMCall";
import { useExecutorDiscovery } from "@/hooks/useExecutorDiscovery";

interface ChatPanelProps {
  agentStatus: AgentStatus;
  smartAccountAddress?: Address;
}

export function ChatPanel({ agentStatus, smartAccountAddress }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showErrorDetail, setShowErrorDetail] = useState(false);
  const [errorDetail, setErrorDetail] = useState("");
  const [llmMode, setLlmMode] = useState<"direct" | "smart-account">("direct");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, addMessage, updateMessage } = useChatStore();
  const { sessionAccount } = useSessionKey();
  const { hasBalance, refresh } = useSessionKeyBalance();
  const { executor } = useExecutorDiscovery();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const agentReady = agentStatus === "AGENT_RUNNING" || agentStatus === "AGENT_CREATED";
  const canSend = agentReady && !!smartAccountAddress && !!sessionAccount && !!executor && hasBalance && !isSending;

  const handleSend = async () => {
    if (!input.trim() || !canSend || !smartAccountAddress || !sessionAccount || !executor) return;

    const promptText = input.trim();
    addMessage({ id: `msg-${Date.now()}`, role: "user", content: promptText, timestamp: Date.now() });
    setInput("");

    const assistantId = `msg-${Date.now() + 1}`;
    addMessage({ id: assistantId, role: "assistant", content: "", timestamp: Date.now() + 1, status: "pending" });
    setIsSending(true);
    setErrorDetail("");

    try {
      const messages = [
        { role: "system", content: "You are a helpful AI assistant on Ritual Chain. Respond concisely and accurately." },
        { role: "user", content: promptText },
      ];

      let response;
      if (llmMode === "direct") {
        response = await submitDirectLLM(sessionAccount, {
          executor: executor.teeAddress, messages, model: "zai-org/GLM-4.7-FP8", temperature: 0.7, maxTokens: 4096, ttl: 300n,
        });
      } else {
        response = await submitViaSmartAccount(sessionAccount, smartAccountAddress, {
          executor: executor.teeAddress, messages, model: "zai-org/GLM-4.7-FP8", temperature: 0.7, maxTokens: 4096, ttl: 300n,
        });
      }

      if (!response.response.hasError && response.response.content) {
        updateMessage(assistantId, { content: response.response.content, status: "delivered" });
      } else if (response.response.hasError) {
        updateMessage(assistantId, { content: `LLM error: ${response.response.errorMessage || "Unknown error"}`, status: "delivered" });
      } else {
        updateMessage(assistantId, { content: "Empty response received.", status: "delivered" });
      }
    } catch (err: any) {
      const msg = err?.message || "Send failed";
      if (msg.includes("insufficient funds") || msg.includes("have 0") || msg.includes("gas")) {
        updateMessage(assistantId, { content: "Send failed: session key has no RITUAL for gas.", status: "failed" });
      } else {
        updateMessage(assistantId, { content: `Send failed: ${msg}`, status: "failed" });
      }
      setErrorDetail(msg);
    } finally {
      setIsSending(false);
    }
  };

  const needsGas = agentReady && !!smartAccountAddress && !!sessionAccount && !!executor && !hasBalance;
  const needsSetup = !agentReady || !smartAccountAddress || !sessionAccount || !executor;

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm border border-black/5 flex flex-col h-[550px]">
      {/* Header */}
      <div className="px-5 py-3 border-b border-black/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-black">Chat</h3>
          {executor && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-[#2F795A]/10 rounded text-[10px] text-[#2F795A]">
              <div className="w-1 h-1 rounded-full bg-[#2F795A]" />
              LLM ready
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {executor && (
            <label className="flex items-center gap-1 text-[10px] text-black/40 cursor-pointer">
              <span className={llmMode === "direct" ? "text-[#2F795A] font-medium" : ""}>Direct</span>
              <button
                onClick={() => setLlmMode(llmMode === "direct" ? "smart-account" : "direct")}
                className={`relative w-7 h-3.5 rounded-full transition-colors ${
                  llmMode === "direct" ? "bg-[#2F795A]" : "bg-black/20"
                }`}
              >
                <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform ${
                  llmMode === "direct" ? "translate-x-0.5" : "translate-x-3.5"
                }`} />
              </button>
              <span className={llmMode === "smart-account" ? "text-[#2F795A] font-medium" : ""}>SA</span>
            </label>
          )}
          {isSending && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Sending...
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🤖</div>
            <p className="text-black/40 text-sm">
              Simple text-only AI chat powered by Ritual Testnet agents.
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
              msg.role === "user"
                ? "bg-[#2F795A] text-white rounded-br-md"
                : "bg-white/80 border border-black/5 text-black rounded-bl-md"
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.status === "pending" && (
                <div className="flex gap-1 mt-1.5">
                  <div className="w-1.5 h-1.5 bg-black/20 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 bg-black/20 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 bg-black/20 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              )}
              <div className="text-[10px] text-black/30 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />

        {errorDetail && (
          <details className="text-xs" onClick={(e) => e.stopPropagation()}>
            <summary
              className="cursor-pointer text-black/40 hover:text-black/60"
              onMouseDown={() => setShowErrorDetail(!showErrorDetail)}
            >
              Show details
            </summary>
            <pre className="mt-1 p-2 bg-white/80 rounded text-[10px] font-mono overflow-x-auto border border-black/5">
              {errorDetail}
            </pre>
          </details>
        )}
      </div>

      <div className="px-4 py-1.5 text-[10px] text-black/30 border-t border-black/5 bg-white/40 text-center">
        Only prompt hashes are stored onchain. Full messages stay local.
      </div>

      {needsGas && (
        <div className="px-4 py-1.5 text-[10px] text-amber-600 bg-amber-50 border-t border-amber-100 text-center">
          Your session key needs native RITUAL for gas. Use the Funding section to send some.
        </div>
      )}

      <div className="px-4 py-3 border-t border-black/5">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && canSend && handleSend()}
            placeholder={needsSetup ? "Set up your agent first..." : needsGas ? "Fund gas first..." : "Type a message..."}
            disabled={!canSend && needsSetup}
            className="flex-1 px-4 py-2.5 bg-white/80 border border-black/10 rounded-xl text-sm text-black 
                       placeholder:text-black/30 focus:outline-none focus:border-[#2F795A]/40
                       disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="px-4 py-2.5 bg-[#2F795A] text-white rounded-xl text-sm font-medium 
                       hover:bg-[#256F4E] transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                       flex items-center gap-1.5"
          >
            {needsGas ? "Fund Gas First" : "Send Message"}
          </button>
        </div>
      </div>
    </div>
  );
}
