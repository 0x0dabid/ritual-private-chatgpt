import { ChatMessage } from "@/types/agent";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ChatStore {
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      messages: [],

      addMessage: (msg) =>
        set((s) => ({ messages: [...s.messages, msg] })),

      updateMessage: (id, updates) =>
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        })),

      clearMessages: () => set({ messages: [] }),
    }),
    { name: "ritual-chat-history" }
  )
);
