import { useCallback, useEffect, useState } from 'react';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import type { Account, Address } from 'viem';

const SESSION_KEY_STORAGE = 'ritual-session-key';

export interface SessionState {
  address: Address | null;
  isAuthorized: boolean;
  isCreating: boolean;
}

export function useSessionKey() {
  const [sessionAddress, setSessionAddress] = useState<Address | null>(null);
  const [sessionAccount, setSessionAccount] = useState<Account | null>(null);

  /** Load or create a session key from sessionStorage. */
  const getOrCreateSessionKey = useCallback((): {
    account: Account;
    address: Address;
  } => {
    const stored = sessionStorage.getItem(SESSION_KEY_STORAGE);
    if (stored) {
      try {
        const account = privateKeyToAccount(stored as `0x${string}`);
        return { account, address: account.address };
      } catch {
        // stored key is invalid — fall through to generation
      }
    }

    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    sessionStorage.setItem(SESSION_KEY_STORAGE, privateKey);
    return { account, address: account.address };
  }, []);

  /** Read the session address without side effects. */
  const getSessionAddress = useCallback((): Address | null => {
    const stored = sessionStorage.getItem(SESSION_KEY_STORAGE);
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
    sessionStorage.removeItem(SESSION_KEY_STORAGE);
    setSessionAddress(null);
    setSessionAccount(null);
  }, []);

  // Hydrate state on mount
  useEffect(() => {
    const { account, address } = getOrCreateSessionKey();
    setSessionAccount(account);
    setSessionAddress(address);
  }, [getOrCreateSessionKey]);

  return {
    sessionAccount,
    sessionAddress,
    getOrCreateSessionKey,
    getSessionAddress,
    clearSession,
  } as const;
}

export type UseSessionKeyReturn = ReturnType<typeof useSessionKey>;
