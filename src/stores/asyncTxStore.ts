import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AsyncTxState, AsyncTxStatus, isTerminalState } from "@/types/asyncTx";

export interface TrackedTransaction {
  id: string;
  label?: string;
  state: AsyncTxState;
  createdAt: number;
  updatedAt: number;
}

interface AsyncTxStore {
  transactions: Record<string, TrackedTransaction>;
  addTransaction: (id: string, label?: string) => void;
  updateState: (id: string, newState: AsyncTxState) => void;
  getTransaction: (id: string) => TrackedTransaction | undefined;
  getActiveTransactions: () => TrackedTransaction[];
  clearSettled: () => void;
  removeTransaction: (id: string) => void;
}

export const useAsyncTxStore = create<AsyncTxStore>()(
  persist(
    (set, get) => ({
      transactions: {},

      addTransaction: (id, label) =>
        set((s) => ({
          transactions: {
            ...s.transactions,
            [id]: {
              id,
              label,
              state: { status: "SUBMITTING" } as AsyncTxState,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          },
        })),

      updateState: (id, newState) =>
        set((s) => {
          const existing = s.transactions[id];
          if (!existing) return s;
          return {
            transactions: {
              ...s.transactions,
              [id]: { ...existing, state: newState, updatedAt: Date.now() },
            },
          };
        }),

      getTransaction: (id) => get().transactions[id],

      getActiveTransactions: () =>
        Object.values(get().transactions).filter(
          (tx) =>
            tx.state.status !== "SETTLED" &&
            tx.state.status !== "FAILED" &&
            tx.state.status !== "EXPIRED"
        ),

      clearSettled: () =>
        set((s) => ({
          transactions: Object.fromEntries(
            Object.entries(s.transactions).filter(
              ([, tx]) =>
                tx.state.status !== "SETTLED" &&
                tx.state.status !== "FAILED" &&
                tx.state.status !== "EXPIRED"
            )
          ),
        })),

      removeTransaction: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.transactions;
          return { transactions: rest };
        }),
    }),
    { name: "ritual-async-tx" }
  )
);
