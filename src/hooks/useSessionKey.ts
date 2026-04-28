"use client";

import { useCallback, useEffect, useState } from 'react';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import type { Account, Address } from 'viem';

const SESSION_KEY_STORAGE = 'ritual-session-key';
const PREVIOUS_SESSION_KEY_STORAGE = 'ritual-previous-session-key';

export interface SessionState {
  address: Address | null;
  isAuthorized: boolean;
  isCreating: boolean;
}

export function useSessionKey() {
  const [sessionAddress, setSessionAddress] = useState<Address | null>(null);
  const [sessionAccount, setSessionAccount] = useState<Account | null>(null);
  const [previousSessionAddress, setPreviousSessionAddress] = useState<Address | null>(null);
  const [isNewSession, setIsNewSession] = useState(false);

  /** Load or create a session key from localStorage. */
  const getOrCreateSessionKey = useCallback((): {
    account: Account;
    address: Address;
    isFresh: boolean;
  } => {
    const prevStored = localStorage.getItem(PREVIOUS_SESSION_KEY_STORAGE);
    const stored = localStorage.getItem(SESSION_KEY_STORAGE);

    if (stored) {
      try {
        const account = privateKeyToAccount(stored as `0x${string}`);
        // Detect if previous session key exists and differs
        const prevAddr = prevStored && prevStored !== stored
          ? (() => {
              try {
                return privateKeyToAccount(prevStored as `0x${string}`).address;
              } catch { return null; }
            })()
          : null;
        return { account, address: account.address, isFresh: false, ...(prevAddr ? { previousAddress: prevAddr } : {}) } as any;
      } catch {
        // stored key is invalid — fall through to generation
      }
    }

    // Record the old key before generating a new one
    if (stored) {
      localStorage.setItem(PREVIOUS_SESSION_KEY_STORAGE, stored);
    }

    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    localStorage.setItem(SESSION_KEY_STORAGE, privateKey);
    return { account, address: account.address, isFresh: true };
  }, []);

  /** Read the session address without side effects. */
  const getSessionAddress = useCallback((): Address | null => {
    const stored = localStorage.getItem(SESSION_KEY_STORAGE);
    if (!stored) return null;
    try {
      const account = privateKeyToAccount(stored as `0x${string}`);
      return account.address;
    } catch {
      return null;
    }
  }, []);

  /** Remove the session key from storage and reset state. */
  const clearSession = useCallback(() => {
    const current = localStorage.getItem(SESSION_KEY_STORAGE);
    if (current) {
      localStorage.setItem(PREVIOUS_SESSION_KEY_STORAGE, current);
    }
    localStorage.removeItem(SESSION_KEY_STORAGE);
    setSessionAddress(null);
    setSessionAccount(null);
  }, []);

  // Hydrate state on mount
  useEffect(() => {
    const result = getOrCreateSessionKey();

    // Detect previous session key from localStorage
    const prevStored = localStorage.getItem(PREVIOUS_SESSION_KEY_STORAGE);
    if (prevStored && !result.isFresh) {
      try {
        const prevAccount = privateKeyToAccount(prevStored as `0x${string}`);
        if (prevAccount.address.toLowerCase() !== result.address.toLowerCase()) {
          setPreviousSessionAddress(prevAccount.address);
          setIsNewSession(true);
        }
      } catch { /* ignore invalid previous key */ }
    }

    // If a brand new key was generated, the previous key was already stored above
    if (result.isFresh) {
      const prevStoredAfter = localStorage.getItem(PREVIOUS_SESSION_KEY_STORAGE);
      if (prevStoredAfter) {
        try {
          const prevAccount = privateKeyToAccount(prevStoredAfter as `0x${string}`);
          if (prevAccount.address.toLowerCase() !== result.address.toLowerCase()) {
            setPreviousSessionAddress(prevAccount.address);
            setIsNewSession(true);
          }
        } catch { /* ignore */ }
      }
    }

    setSessionAccount(result.account as unknown as Account);
    setSessionAddress(result.address);
  }, [getOrCreateSessionKey]);

  return {
    sessionAccount,
    sessionAddress,
    previousSessionAddress,
    isNewSession,
    getOrCreateSessionKey,
    getSessionAddress,
    clearSession,
  } as const;
}

export type UseSessionKeyReturn = ReturnType<typeof useSessionKey>;
