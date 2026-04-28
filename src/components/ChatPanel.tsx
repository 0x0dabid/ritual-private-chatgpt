"use client";

import { useState, useRef, useEffect } from "react";
import type { AgentStatus } from "@/types/asyncTx";
import type { ChatMessage } from "@/types/agent";
import type { Address, Hex } from "viem";
import { keccak256, toHex, encodeFunctionData } from "viem";
import { useChatStore } from "@/stores/chatStore";
import { useSessionKey } from "@/hooks/useSessionKey";
import { submitLLMThroughSmartAccount } from "@/hooks/useLLMCall";
import { useExecutorDiscovery } from "@/hooks/useExecutorDiscovery";
import { ExecutorDebugPanel } from "@/components/ExecutorDebugPanel";
import { CONSUMER_CONTRACT_ADDRESS } from "@/lib/addresses";
import { chatGptAgentAbi } from "@/lib/abi";

interface ChatPanelProps {
  agentStatus: AgentStatus;
  smartAccountAddress?: Address;
}

export function ChatPanel({ agentStatus, smartAccountAddress }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, addMessage, updateMessage } = useChatStore();
  const { sessionAccount } = useSessionKey();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const [lastTxHash, setLastTxHash] = useState<Hex | undefined>();
  const { executor, noServices, isLoading: loadingExecutors, isManualOverride, useKnownFallback, retry, debug } = useExecutorDiscovery();

  const executorLabel = executor?.registry ?? "";
  const isFallbackActive = isManualOverride || useKnownFallback;

  const whyBlocked: string[] = [];
  if (!(agentStatus === "AGENT_RUNNING" || agentStatus === "AGENT_CREATED")) whyBlocked.push("Missing app agent");
  if (!smartAccountAddress) whyBlocked.push("Missing smart account");
  if (!sessionAccount) whyBlocked.push("Missing session key");
  if (!executor && !isFallbackActive) whyBlocked.push("Missing LLM executor");
  if (isSending) whyBlocked.push("Currently sending");

  const canSend = whyBlocked.length === 0 && !!executor;

  const handleSend = async () => {
    if (!input.trim() || !canSend || !smartAccountAddress || !sessionAccount || !executor) return;

    const promptText = input.trim();
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: promptText,
      timestamp: Date.now(),
    };
    addMessage(userMsg);
    setInput("");

    const assistantId = `msg-${Date.now() + 1}`;
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: Date.now() + 1,
      status: "pending",
    };
    addMessage(assistantMsg);
    setIsSending(true);

    try {
      // Step 1: Encode prompt hash and submit to onchain agent contract
      const promptHash = keccak256(toHex(promptText));
      const jobId = keccak256(toHex(`${Date.now()}-${promptText}`));

      const submitData = encodeFunctionData({
        abi: chatGptAgentAbi,
        functionName: "submitPrompt",
        args: [jobId, promptHash],
      });

      // Step 2: Send LLM precompile call through SmartAccount.execute() via session key
      updateMessage(assistantId, { content: "Submitting to LLM precompile (0x0802) through smart account...", status: "pending" });

      const messages = [
        { role: "system", content: "You are a helpful AI assistant on Ritual Chain. Respond concisely and accurately." },
        { role: "user", content: promptText },
      ];

      const { txHash, response } = await submitLLMThroughSmartAccount(
        sessionAccount,
        smartAccountAddress,
        {
          executor: executor.teeAddress,
          messages,
          model: "zai-org/GLM-4.7-FP8",
          temperature: 0.7,
          maxTokens: 4096,
          ttl: 300n,
        },
      );

      setLastTxHash(txHash);

      // Step 3: Decode and display the AI response
      if (!response.hasError && response.content) {
        updateMessage(assistantId, {
          content: response.content,
          status: "delivered",
        });
      } else if (response.hasError) {
        updateMessage(assistantId, {
          content: `**LLM error:** ${response.errorMessage || "Unknown error"}\n\n[View transaction](https://explorer.ritualfoundation.org/tx/${txHash})`,
          status: "delivered",
        });
      } else {
        updateMessage(assistantId, {
          content: `Response received but empty. Usage: ${response.usage.prompt} prompt / ${response.usage.completion} completion tokens.\n\n[View transaction](https://explorer.ritualfoundation.org/tx/${txHash})`,
          status: "delivered",
        });
      }
    } catch (err: any) {
      updateMessage(assistantId, {
        content: `Error: ${err?.message || "Failed to send"}\n\nMake sure your SmartAccount has RITUAL and the session key is authorized.`,
        status: "failed",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm border border-black/5 flex flex-col h-[500px]">
      {/* Chat header */}
      <div className="px-5 py-3 border-b border-black/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-black">Chat</h3>
          {executor && isFallbackActive ? (
            <div title={`Fallback executor: ${executor.teeAddress}`} className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 rounded text-[10px] text-amber-700 border border-amber-200">
              <div className="w-1 h-1 rounded-full bg-amber-500"></div>
              {isManualOverride ? "Manual override active" : "Known executor active"}
            </div>
          ) : executor ? (
            <div title={`TEE: ${executor.teeAddress}`} className="flex items-center gap-1 px-1.5 py-0.5 bg-[#2F795A]/10 rounded text-[10px] text-[#2F795A]">
              <div className="w-1 h-1 rounded-full bg-[#2F795A]"></div>
              LLM executor ready
            </div>
          ) : loadingExecutors ? (
            <div className="text-[10px] text-black/40">Finding executor...</div>
          ) : noServices ? (
            <div className="text-[10px] text-amber-600">No LLM executor returned by TEEServiceRegistry</div>
          ) : null}
        </div>
        {isSending && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600">
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Submitting via session key...
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🤖</div>
            <p className="text-black/40 text-sm max-w-xs mx-auto">
              Simple text-only AI chat powered by Ritual Testnet agents.
            </p>

            {whyBlocked.length > 0 && (
              <div className="mt-3 inline-block text-left bg-white/40 rounded-xl px-4 py-2.5 border border-black/5">
                <p className="text-[10px] text-black/40 mb-1 font-medium">Send blocked by:</p>
                {whyBlocked.map((reason, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px] text-amber-600">
                    <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    {reason}
                  </div>
                ))}
                {noServices && !isFallbackActive && (
                  <p className="text-[10px] text-black/40 mt-2 leading-relaxed">
                    Ritual LLM executor is not discoverable right now. Smart account/session setup can still work,
                    but chat is disabled until an executor is available.
                  </p>
                )}
                {isManualOverride && (
                  <p className="text-[10px] text-amber-600 mt-2 font-medium">
                    Manual executor override active via NEXT_PUBLIC_MANUAL_LLM_EXECUTOR_ADDRESS.
                  </p>
                )}
              </div>
            )}

            {canSend && executor && (
              <div className="space-y-2 mt-3">
                <p className="text-black/30 text-xs">
                  Messages are submitted through your smart account via an authorized session key.
                </p>
                <div className="text-[10px] text-black/30 font-mono space-y-0.5 bg-white/40 rounded-lg p-2 border border-black/5 inline-block text-left">
                  <div>executor: {executor.teeAddress.slice(0, 10)}...{executor.teeAddress.slice(-6)}</div>
                  <div>workloadId: {executor.workloadId.slice(0, 10)}...</div>
                  <div>registry: {executor.registry}</div>
                  <div>capability ID: {executor.capability}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                msg.role === "user"
                  ? "bg-[#2F795A] text-white rounded-br-md"
                  : "bg-white/80 border border-black/5 text-black rounded-bl-md"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.status === "pending" && (
                <div className="flex gap-1 mt-1.5">
                  <div className="w-1.5 h-1.5 bg-black/20 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 bg-black/20 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 bg-black/20 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              )}
              <div className="text-[10px] text-black/30 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Privacy warning */}
      <div className="px-4 py-1.5 text-[10px] text-black/30 border-t border-black/5 bg-white/40 text-center">
        ⚠️ Private chat content should not be stored publicly onchain. Only prompt hashes and job references are recorded.
      </div>

      {/* Executor Debug Panel (collapsible) */}
      <details className="px-4 py-2 border-t border-black/5">
        <summary className="text-[10px] text-black/40 cursor-pointer hover:text-black font-medium">
          Executor debug — {executor && isFallbackActive ? "fallback active" : executor ? "executor found" : noServices ? "no executor" : loadingExecutors ? "checking..." : "unknown"}
        </summary>
        <div className="mt-2">
          <ExecutorDebugPanel debug={debug} onRetry={retry} />
        </div>
      </details>

      {/* Input */}
      <div className="px-4 py-3 border-t border-black/5">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={canSend ? "Type a text message..." : "Set up your agent first..."}
            disabled={!canSend}
            className="flex-1 px-4 py-2.5 bg-white/80 border border-black/10 rounded-xl text-sm text-black 
                       placeholder:text-black/30 focus:outline-none focus:border-[#2F795A]/40
                       disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!canSend || !input.trim()}
            className="px-4 py-2.5 bg-[#2F795A] text-white rounded-xl text-sm font-medium 
                       hover:bg-[#256F4E] transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F795A]/50
                       flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Send Message
          </button>
        </div>
      </div>
    </div>
  );
}
