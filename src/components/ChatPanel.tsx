"use client";

import { useState, useRef, useEffect } from "react";
import type { AgentStatus } from "@/types/asyncTx";
import type { ChatMessage } from "@/types/agent";
import type { Address, Hex } from "viem";
import { useChatStore } from "@/stores/chatStore";
import { useSessionKey } from "@/hooks/useSessionKey";
import { useSessionKeyBalance } from "@/hooks/useSessionKeyBalance";
import { useRitualWalletBalance } from "@/hooks/useRitualWallet";
import { submitDirectLLM, submitViaSmartAccount } from "@/hooks/useLLMCall";
import { useExecutorDiscovery } from "@/hooks/useExecutorDiscovery";

interface ChatPanelProps {
  agentStatus: AgentStatus;
  smartAccountAddress?: Address;
  isSmartAccountDeployed: boolean;
}

export function ChatPanel({ agentStatus, smartAccountAddress, isSmartAccountDeployed }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showErrorDetail, setShowErrorDetail] = useState(false);
  const [errorDetail, setErrorDetail] = useState("");
  const [llmMode, setLlmMode] = useState<"direct" | "smart-account">("direct");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, addMessage, updateMessage } = useChatStore();
  const { sessionAccount } = useSessionKey();
  const { hasBalance: hasGas, refresh: refreshGas, balanceFormatted: gasFormatted } = useSessionKeyBalance();
  const { balance: walletBalance, balanceFormatted: walletFormatted } = useRitualWalletBalance(
    (llmMode === "smart-account" ? smartAccountAddress : null) ?? undefined,
  );
  const { executor } = useExecutorDiscovery();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // In Direct mode: session key sends directly to precompile 0x0802
  // No SmartAccount needed. Only needs gas (not RitualWallet escrow).
  // In SA mode: session key sends through SmartAccount.execute → 0x0802
  const isDirectMode = llmMode === "direct" || !isSmartAccountDeployed;
  const effectiveMode = isSmartAccountDeployed ? llmMode : "direct";

  // Conditions for sending
  const hasSession = !!sessionAccount;
  const hasExecutor = !!executor;
  const hasGasBalance = hasGas;

  // In direct mode: doesn't need SmartAccount or RitualWallet escrow
  // In SA mode: needs SmartAccount deployed + session authorized + has escrow
  const saModeAvailable = isSmartAccountDeployed;
  const saModeReady = saModeAvailable; // Would need isSessionAuthorized here

  const canSendDirect = hasSession && hasExecutor && hasGasBalance && !isSending;
  const canSendSA = hasSession && hasExecutor && hasGasBalance && !!smartAccountAddress && !isSending;
  const canSend = isDirectMode ? canSendDirect : canSendSA;

  // Block reasons
  const blockedBySession = !hasSession;
  const blockedByExecutor = !hasExecutor;
  const blockedByGas = !hasGasBalance;
  const blockedBySA = !isDirectMode && !smartAccountAddress;

  const getBlockReason = (): string | null => {
    if (blockedBySession) return "No session key. Refresh the page.";
    if (blockedByExecutor) return "Discovering executor...";
    if (blockedByGas) return "Session key needs native RITUAL for gas.";
    if (blockedBySA) return "SmartAccount not deployed. Switch to Direct mode or deploy first.";
    return null;
  };

  const handleSend = async () => {
    if (!input.trim() || !canSend || !sessionAccount || !executor) return;

    const promptText = input.trim();
    addMessage({ id: `msg-${Date.now()}`, role: "user", content: promptText, timestamp: Date.now() });
    setInput("");

    const assistantId = `msg-${Date.now() + 1}`;
    addMessage({ id: assistantId, role: "assistant", content: "", timestamp: Date.now() + 1, status: "pending" });
    setIsSending(true);
    setErrorDetail("");

    try {
      const msgs = [
        { role: "system", content: "You are a helpful AI assistant on Ritual Chain. Respond concisely and accurately." },
        { role: "user", content: promptText },
      ];

      let response;
      if (isDirectMode) {
        response = await submitDirectLLM(sessionAccount, {
          executor: executor.teeAddress, messages: msgs, model: "zai-org/GLM-4.7-FP8", temperature: 0.7, maxTokens: 4096, ttl: 300n,
        });
      } else if (smartAccountAddress) {
        response = await submitViaSmartAccount(sessionAccount, smartAccountAddress, {
          executor: executor.teeAddress, messages: msgs, model: "zai-org/GLM-4.7-FP8", temperature: 0.7, maxTokens: 4096, ttl: 300n,
        });
      } else {
        throw new Error("SmartAccount not available");
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

  const blockReason = getBlockReason();
  const placeholderText = blockReason || "Type a message...";

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm border border-black/5 flex flex-col h-[550px]">
      {/* Header */}
      <div className="px-5 py-3 border-b border-black/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-black">Chat</h3>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${executor ? "bg-[#2F795A]" : "bg-black/20"}`} />
            <span className="text-[10px] text-black/40">{executor ? "Connected" : "Connecting..."}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {executor && saModeAvailable && (
            <label className="flex items-center gap-1 text-[10px] text-black/40 cursor-pointer">
              <span className={effectiveMode === "direct" ? "text-[#2F795A] font-medium" : ""}>Direct</span>
              <button
                onClick={() => setLlmMode(effectiveMode === "direct" ? "smart-account" : "direct")}
                className={`relative w-7 h-3.5 rounded-full transition-colors ${
                  effectiveMode === "direct" ? "bg-[#2F795A]" : "bg-black/20"
                }`}
              >
                <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform ${
                  effectiveMode === "direct" ? "translate-x-0.5" : "translate-x-3.5"
                }`} />
              </button>
              <span className={effectiveMode === "smart-account" ? "text-[#2F795A] font-medium" : ""}>SA</span>
            </label>
          )}
          {!saModeAvailable && (
            <span className="text-[10px] text-black/30">Direct mode (no SA)</span>
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

      {/* Mode indicator */}
      <div className="px-5 py-1 bg-white/30 border-b border-black/5">
        <span className="text-[9px] text-black/30">
          {isDirectMode
            ? "Direct LLM: session key → precompile 0x0802 (no SmartAccount)"
            : `SmartAccount LLM: session key → SmartAccount → precompile 0x0802`}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🤖</div>
            <p className="text-black/40 text-sm">
              Simple text-only AI chat powered by Ritual Testnet agents.
            </p>
            {!blockReason && (
              <p className="text-[11px] text-black/30 mt-2">
                Session key sends transactions directly to LLM precompile 0x0802. No SmartAccount needed.
              </p>
            )}
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

      {/* Funding warning */}
      {blockedByGas && (
        <div className="px-4 py-1.5 text-[10px] text-amber-600 bg-amber-50 border-t border-amber-100 text-center">
          Session key has {gasFormatted.toFixed(4)} RITUAL. Fund with at least 0.01 RITUAL for gas.
        </div>
      )}

      {!blockedByGas && hasSession && effectiveMode === "direct" && (
        <div className="px-4 py-1.5 text-[10px] text-black/30 border-t border-black/5 bg-white/40 text-center">
          Direct LLM mode — transactions are EIP-1559 calls to 0x0802 from session key
        </div>
      )}

      {!blockedByGas && !isDirectMode && smartAccountAddress && (
        <div className="px-4 py-1.5 text-[10px] text-black/30 border-t border-black/5 bg-white/40 text-center">
          SmartAccount mode — session key → SmartAccount.execute() → 0x0802
        </div>
      )}

      <div className="px-4 py-3 border-t border-black/5">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && canSend && handleSend()}
            placeholder={placeholderText}
            disabled={!!blockReason && !blockedByGas}
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
            {blockedByGas ? "Fund Gas First" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
