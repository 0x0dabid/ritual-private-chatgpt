export interface AgentInfo {
  name: string;
  provider: string;
  model: string;
  systemPrompt: string;
  active: boolean;
  address: `0x${string}`;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  jobId?: `0x${string}`;
  timestamp: number;
  status?: "pending" | "delivered" | "failed";
}

export interface AppSettings {
  provider: string;
  model: string;
  systemPrompt: string;
}
