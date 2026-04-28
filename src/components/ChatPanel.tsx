"use client";

import { useState, useRef, useEffect } from "react";
import type { AgentStatus } from "@/types/asyncTx";
import type { Address, Hex, Abi } from "viem";
import { useWriteContract } from "wagmi";
import { useChatStore } from "@/stores/chatStore";
import { useAddressBalance } from "@/hooks/useAddressBalance";
import { useRitualWalletBalance } from "@/hooks/useRitualWallet";
import { encodeLLMRequest, decodeLLMOutput } from "@/hooks/useLLMCall";
import { useExecutorDiscovery } from "@/hooks/useExecutorDiscovery";
import { createPublicClient, http } from "viem";
import { ritualChain } from "@/lib/chain";
import { LLM_PRECOMPILE } from "@/lib/addresses";

const RPC_URL = process.env.NEXT_PUBLIC_RITUAL_RPC_URL ?? "https://rpc.ritualfoundation.org";

const publicClient = createPublicClient({
  chain: ritualChain,
  transport: http(RPC_URL),
});

const smartAccountExecAbi = [
  {
    type: "function" as const,
    name: "execute",
    inputs: [
      { name: "target", type: "address" },
      { name: "data", type: "bytes" },
    ],
    outputs: [
      { name: "success", type: "bool" },
      { name: "result", type: "bytes" },
    ],
    stateMutability: "nonpayable" as const,
  },
];

interface ChatPanelProps {
  agentStatus: AgentStatus;
  smartAccountAddress: Address | undefined;
  isSmartAccountDeployed: boolean;
}

export function ChatPanel({ agentStatus, smartAccountAddress, isSmartAccountDeployed }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorDetail, setErrorDetail] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, addMessage, updateMessage } = useChatStore();
  const { writeContractAsync } = useWriteContract();
  const { balanceFormatted: saGas } = useAddressBalance(smartAccountAddress ?? undefined);
  const { balance: walletBalance } = useRitualWalletBalance(smartAccountAddress ?? undefined);
  const { executor } = useExecutorDiscovery();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const hasGas = (saGas ?? 0) > 0.001;
  const hasEscrow = walletBalance > 0n;
  const ready = isSmartAccountDeployed && !!smartAccountAddress && !!executor && hasGas && hasEscrow && !isSending;

  const handleSend = async () => {
    if (!input.trim() || !ready || !smartAccountAddress || !executor) return;

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

      const llmData = encodeLLMRequest({
        executor: executor.teeAddress,
        messages: msgs,
        model: "zai-org/GLM-4.7-FP8",
        temperature: 0.7,
        maxTokens: 4096,
        ttl: 300n,
      });

      const txHash = await writeContractAsync({
        address: smartAccountAddress,
        abi: smartAccountExecAbi,
        functionName: "execute",
        args: [LLM_PRECOMPILE, llmData],
        gas: 3_000_000n,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      // Try to decode spcCalls from the receipt
      const spcCalls = (receipt as any).spcCalls;
      if (spcCalls && spcCalls.length > 0) {
        const response = decodeLLMOutput(spcCalls[0].output);
        if (!response.hasError && response.content) {
          updateMessage(assistantId, { content: response.content, status: "delivered" });
        } else {
          updateMessage(assistantId, { content: `LLM error: ${response.errorMessage || "Unknown error"}`, status: "delivered" });
        }
      } else {
        updateMessage(assistantId, { content: "Transaction confirmed, but no LLM output received. This is normal if the TEE executor didn't return spcCalls.", status: "delivered" });
      }
    } catch (err: any) {
      const msg = err?.message || "Send failed";
      if (msg.includes("insufficient funds") || msg.includes("gas")) {
        updateMessage(assistantId, { content: "Send failed: Smart Account needs more RITUAL for gas.", status: "failed" });
      } else if (msg.includes("User rejected") || msg.includes("user rejected")) {
        updateMessage(assistantId, { content: "Transaction cancelled.", status: "failed" });
      } else {
        updateMessage(assistantId, { content: `Send failed: ${msg.slice(0, 120)}`, status: "failed" });
      }
      setErrorDetail(msg);
    } finally {
      setIsSending(false);
    }
  };

  const blockReason = !isSmartAccountDeployed ? "Deploy Smart Account first"
    : !executor ? "Discovering executor..."
    : !hasGas ? "Smart Account needs RITUAL for gas. Use Funding section."
    : !hasEscrow ? "Smart Account needs RitualWallet deposit. Use Funding section."
    : null;

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm border border-black/5 flex flex-col h-[550px]">
      {/* Header */}
      <div className="px-5 py-3 border-b border-black/5 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-black">Chat</h3>
        <div className="flex items-center gap-2">
          {isSmartAccountDeployed && <span className="text-[10px] text-[#2F795A]">Smart Account active</span>}
          {executor && <div className="flex items-center gap-1 px-1.5 py-0.5 bg-[#2F795A]/10 rounded text-[10px] text-[#2F795A]">
            <div className="w-1 h-1 rounded-full bg-[#2F795A]" />LLM ready
          </div>}
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
          Your Wallet signs → SmartAccount.execute() → LLM precompile 0x0802
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🤖</div>
            <p className="text-black/40 text-sm">
              Ritual Private ChatGPT — onchain AI chat powered by Ritual Testnet.
            </p>
            {blockReason && <p className="text-[11px] text-amber-600 mt-2">{blockReason}</p>}
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
          <details className="text-xs">
            <summary className="cursor-pointer text-black/40 hover:text-black/60">Show details</summary>
            <pre className="mt-1 p-2 bg-white/80 rounded text-[10px] font-mono overflow-x-auto border border-black/5">{errorDetail}</pre>
          </details>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-black/5">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ready && handleSend()}
            placeholder={blockReason || "Type a message..."}
            disabled={!isSmartAccountDeployed}
            className="flex-1 px-4 py-2.5 bg-white/80 border border-black/10 rounded-xl text-sm text-black
                       placeholder:text-black/30 focus:outline-none focus:border-[#2F795A]/40
                       disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!ready}
            className="px-4 py-2.5 bg-[#2F795A] text-white rounded-xl text-sm font-medium
                       hover:bg-[#256F4E] transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                       flex items-center gap-1.5"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
