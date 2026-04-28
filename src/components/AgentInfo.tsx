"use client";

import React from "react";
import type { AgentStatus } from "@/types/asyncTx";
import type { Address } from "viem";

interface AgentInfoProps {
  agentAddress?: `0x${string}`;
  agentStatus: AgentStatus;
  smartAccountAddress?: Address;
  ownerAddress?: Address;
  sessionAddress?: Address | null;
  isSessionActive?: boolean;
  lastTxHash?: `0x${string}`;
  lastJobId?: `0x${string}`;
}

export function AgentInfo({
  agentAddress,
  agentStatus,
  smartAccountAddress,
  ownerAddress,
  sessionAddress,
  isSessionActive,
  lastTxHash,
  lastJobId,
}: AgentInfoProps) {
  const explorerUrl =
    process.env.NEXT_PUBLIC_RITUAL_EXPLORER || "https://explorer.ritualfoundation.org";

  const statusColor = (() => {
    switch (agentStatus) {
      case "AGENT_RUNNING":
      case "AGENT_CREATED":
      case "RESPONSE_DELIVERED":
        return "bg-[#2F795A]";
      case "ERROR":
        return "bg-red-500";
      case "WAITING_RESPONSE":
        return "bg-amber-500";
      default:
        return "bg-black/20";
    }
  })();

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-black/5">
      <h3 className="text-sm font-semibold text-black mb-3">Account &amp; Agent</h3>

      <div className="space-y-2.5 text-xs">
        <InfoRow label="Agent Type" value="Persistent Agent" />
        <InfoRow label="Precompile" value="0x0000...0820" mono />

        {/* Account section */}
        <div className="pt-2 border-t border-black/5">
          <h4 className="text-[10px] font-medium text-black/40 mb-1.5 uppercase tracking-wider">
            Account
          </h4>
          <InfoRow label="Label" value="Smart Account" />
          {ownerAddress && (
            <InfoRow
              label="Owner EOA"
              value={`${ownerAddress.slice(0, 6)}...${ownerAddress.slice(-4)}`}
              mono
              isLink
              href={`${explorerUrl}/address/${ownerAddress}`}
            />
          )}
          {smartAccountAddress && (
            <InfoRow
              label="Smart Account"
              value={`${smartAccountAddress.slice(0, 6)}...${smartAccountAddress.slice(-4)}`}
              mono
              isLink
              href={`${explorerUrl}/address/${smartAccountAddress}`}
            />
          )}
        </div>

        {/* Session section */}
        <div className="pt-2 border-t border-black/5">
          <h4 className="text-[10px] font-medium text-black/40 mb-1.5 uppercase tracking-wider">
            Session
          </h4>
          <div className="flex items-center justify-between">
            <span className="text-black/50">Status</span>
            <div className="flex items-center gap-1.5">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  isSessionActive ? "bg-[#2F795A]" : "bg-black/20"
                }`}
              />
              <span className="text-black">
                {isSessionActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
          {sessionAddress && (
            <InfoRow
              label="Session Key"
              value={`${sessionAddress.slice(0, 6)}...${sessionAddress.slice(-4)}`}
              mono
            />
          )}
        </div>

        {/* Agent section */}
        <div className="pt-2 border-t border-black/5">
          <h4 className="text-[10px] font-medium text-black/40 mb-1.5 uppercase tracking-wider">
            Agent
          </h4>
          <div className="flex items-center justify-between">
            <span className="text-black/50">Status</span>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
              <span className="text-black">{agentStatus.replace(/_/g, " ").toLowerCase()}</span>
            </div>
          </div>
          {agentAddress && agentAddress !== `0x${"2".repeat(40)}` && (
            <InfoRow
              label="Agent Address"
              value={`${agentAddress.slice(0, 6)}...${agentAddress.slice(-4)}`}
              mono
              isLink
              href={`${explorerUrl}/address/${agentAddress}`}
            />
          )}
          {lastTxHash && (
            <InfoRow
              label="Latest TX"
              value={`${lastTxHash.slice(0, 10)}...`}
              mono
              isLink
              href={`${explorerUrl}/tx/${lastTxHash}`}
            />
          )}
          {lastJobId && (
            <InfoRow label="Latest Job" value={`${lastJobId.slice(0, 10)}...`} mono />
          )}
        </div>

        <div className="pt-2 border-t border-black/5">
          <p className="text-[10px] text-black/40 leading-relaxed">
            This agent runs on Ritual Chain using the Persistent Agent infrastructure.
            Chat messages are submitted through your smart account via an authorized session key.
            Full conversation history is stored locally. Only prompt hashes and job references
            are recorded onchain.
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
  isLink,
  href,
}: {
  label: string;
  value: string;
  mono?: boolean;
  isLink?: boolean;
  href?: string;
}) {
  const textClass = mono ? "font-mono text-[11px]" : "";

  return (
    <div className="flex items-center justify-between">
      <span className="text-black/50">{label}</span>
      {isLink && href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`${textClass} text-[#2F795A] hover:underline max-w-[180px] truncate`}
        >
          {value}
        </a>
      ) : (
        <span className={`${textClass} text-black max-w-[180px] truncate`}>{value}</span>
      )}
    </div>
  );
}
