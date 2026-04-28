"use client";

import React, { useState } from "react";
import type { ExecutorDebugState } from "@/hooks/useExecutorDiscovery";
import { createPublicClient, http } from "viem";
import { ritualChain } from "@/lib/chain";

interface ExecutorDebugPanelProps {
  debug: ExecutorDebugState;
  onRetry: () => void;
}

export function ExecutorDebugPanel({ debug, onRetry }: ExecutorDebugPanelProps) {
  const [queryResult, setQueryResult] = useState<string | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);

  const handleTestQuery = async () => {
    setQueryLoading(true);
    setQueryResult(null);
    try {
      const client = createPublicClient({
        chain: ritualChain,
        transport: http(debug.rpcUrl),
      });

      const abi = [
        {
          type: "function" as const,
          name: "getServicesByCapability",
          inputs: [
            { name: "capability", type: "uint8" },
            { name: "checkValidity", type: "bool" },
          ],
          outputs: [{ type: "bytes" }],
          stateMutability: "view" as const,
        },
      ];

      const result1 = await client.readContract({
        address: debug.registryAddress as `0x${string}`,
        abi,
        functionName: "getServicesByCapability",
        args: [debug.capabilityId, true],
      });
      const result2 = await client.readContract({
        address: debug.registryAddress as `0x${string}`,
        abi,
        functionName: "getServicesByCapability",
        args: [debug.capabilityId, false],
      });

      setQueryResult(JSON.stringify({ "with validity (1,true)": result1, "without validity (1,false)": result2 }, null, 2));
    } catch (err: any) {
      setQueryResult(`Error: ${err?.message || "Unknown error"}`);
    } finally {
      setQueryLoading(false);
    }
  };

  const row = (label: string, value: string | number | boolean | null | undefined) => (
    <div className="flex justify-between text-[10px] leading-5">
      <span className="text-black/50 mr-2">{label}</span>
      <span className="font-mono text-black text-right max-w-[60%] truncate">{String(value ?? "—")}</span>
    </div>
  );

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-black/5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-black">Executor Debug</h3>
        <div className="flex gap-1.5">
          <button
            onClick={onRetry}
            className="px-2 py-1 bg-[#2F795A] text-white rounded-lg text-[10px] font-medium hover:bg-[#256F4E] transition-colors"
          >
            Retry discovery
          </button>
          <button
            onClick={handleTestQuery}
            disabled={queryLoading}
            className="px-2 py-1 bg-gray-700 text-white rounded-lg text-[10px] font-medium hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            {queryLoading ? "Querying..." : "Test Registry Query"}
          </button>
        </div>
      </div>

      <div className="space-y-0.5">
        {row("RPC URL", debug.rpcUrl)}
        {row("Chain ID", debug.chainId)}
        {row("Registry address", debug.registryAddress)}
        {row("Capability ID", debug.capabilityId)}
        <div className="border-t border-black/5 my-1" />
        {row("getServices(1, true) status", debug.queryWithValidity.status)}
        {row("getServices(1, true) raw count", debug.queryWithValidity.rawCount)}
        <div className="border-t border-black/5 my-1" />
        {row("getServices(1, false) status", debug.queryWithoutValidity.status)}
        {row("getServices(1, false) raw count", debug.queryWithoutValidity.rawCount)}
        <div className="border-t border-black/5 my-1" />
        {debug.manualOverrideActive && (
          <div className="text-[10px] font-semibold text-amber-600 bg-amber-50 rounded px-1 py-0.5 mb-1">
            Manual executor override active
          </div>
        )}
        {row("Selected executor", debug.selectedExecutor?.teeAddress ?? "none")}
        {row("isValid", debug.selectedIsValid)}
        {row("workloadId", debug.workloadId)}
        {row("publicKey", debug.publicKeyStatus)}
        {debug.error && row("Error", debug.error)}
        {row("Last checked", debug.lastChecked)}
      </div>

      {queryResult && (
        <div className="mt-2">
          <details>
            <summary className="text-[10px] text-black/50 cursor-pointer hover:text-black">
              Raw query result
            </summary>
            <pre className="mt-1 p-2 bg-white/80 rounded-lg text-[9px] font-mono overflow-x-auto max-h-40 overflow-y-auto border border-black/5">
              {queryResult}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
