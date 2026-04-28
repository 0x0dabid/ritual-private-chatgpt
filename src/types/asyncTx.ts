export type AsyncTxStatus =
  | "SUBMITTING"
  | "PENDING_COMMITMENT"
  | "COMMITTED"
  | "EXECUTOR_PROCESSING"
  | "RESULT_READY"
  | "PENDING_SETTLEMENT"
  | "SETTLED"
  | "FAILED"
  | "EXPIRED";

export type ErrorCategory = "wallet" | "contract" | "async" | "network";

export interface AsyncTxSubmitting {
  status: "SUBMITTING";
}

export interface AsyncTxPendingCommitment {
  status: "PENDING_COMMITMENT";
  txHash: `0x${string}`;
  submittedAt: number;
  ttlBlocks: number;
}

export interface AsyncTxCommitted {
  status: "COMMITTED";
  txHash: `0x${string}`;
  jobId: `0x${string}`;
  executor: `0x${string}`;
  committedBlock: number;
}

export interface AsyncTxExecutorProcessing {
  status: "EXECUTOR_PROCESSING";
  txHash: `0x${string}`;
  jobId: `0x${string}`;
  executor: `0x${string}`;
  startBlock: number;
  estimatedBlocks: number;
}

export interface AsyncTxResultReady {
  status: "RESULT_READY";
  txHash: `0x${string}`;
  jobId: `0x${string}`;
  settledBlock: number;
}

export interface AsyncTxPendingSettlement {
  status: "PENDING_SETTLEMENT";
  txHash: `0x${string}`;
  jobId: `0x${string}`;
  deliveryTxHash?: `0x${string}`;
}

export interface AsyncTxSettled {
  status: "SETTLED";
  txHash: `0x${string}`;
  jobId: `0x${string}`;
  result: string;
  settlementTxHash?: `0x${string}`;
  settledBlock?: number;
}

export interface AsyncTxFailed {
  status: "FAILED";
  txHash?: `0x${string}`;
  jobId?: `0x${string}`;
  error: string;
  errorCategory: ErrorCategory;
  failedAt: AsyncTxStatus;
}

export interface AsyncTxExpired {
  status: "EXPIRED";
  txHash: `0x${string}`;
  submittedAt: number;
  expiredAt: number;
  ttlBlocks: number;
}

export type AsyncTxState =
  | AsyncTxSubmitting
  | AsyncTxPendingCommitment
  | AsyncTxCommitted
  | AsyncTxExecutorProcessing
  | AsyncTxResultReady
  | AsyncTxPendingSettlement
  | AsyncTxSettled
  | AsyncTxFailed
  | AsyncTxExpired;

export type AgentStatus =
  | "NO_AGENT"
  | "AGENT_CREATING"
  | "AGENT_CREATED"
  | "AGENT_RUNNING"
  | "WAITING_RESPONSE"
  | "RESPONSE_DELIVERED"
  | "ERROR";

export function canTransition(from: AsyncTxStatus, to: AsyncTxStatus): boolean {
  const valid: Record<AsyncTxStatus, AsyncTxStatus[]> = {
    SUBMITTING: ["PENDING_COMMITMENT", "FAILED"],
    PENDING_COMMITMENT: ["COMMITTED", "EXPIRED", "FAILED"],
    COMMITTED: ["EXECUTOR_PROCESSING", "FAILED"],
    EXECUTOR_PROCESSING: ["RESULT_READY", "FAILED"],
    RESULT_READY: ["PENDING_SETTLEMENT", "SETTLED", "FAILED"],
    PENDING_SETTLEMENT: ["SETTLED", "FAILED"],
    SETTLED: [],
    FAILED: [],
    EXPIRED: [],
  };
  return valid[from]?.includes(to) ?? false;
}

export function isTerminalState(status: AsyncTxStatus): boolean {
  return status === "SETTLED" || status === "FAILED" || status === "EXPIRED";
}
