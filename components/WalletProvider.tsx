"use client";

// React context holding the connected Freighter address. All contract writes
// flow through here.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import * as freighterApi from "@stellar/freighter-api";

interface WalletState {
  address: string | null;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
}

const WalletContext = createContext<WalletState>({
  address: null,
  connecting: false,
  error: null,
  connect: async () => {},
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore an already-authorized wallet on mount.
  useEffect(() => {
    (async () => {
      try {
        const connected = await freighterApi.isConnected();
        if (connected.isConnected) {
          const { address } = await freighterApi.getAddress();
          if (address) setAddress(address);
        }
      } catch {
        // Freighter not installed; the connect button surfaces it.
      }
    })();
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const { address } = await freighterApi.requestAccess();
      if (!address) throw new Error("no address returned");
      setAddress(address);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not connect. Is Freighter installed?",
      );
    } finally {
      setConnecting(false);
    }
  }, []);

  return (
    <WalletContext.Provider value={{ address, connecting, error, connect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}

// The raw Freighter signer, shaped for the stellar-sdk contract Client.
export function freighterSigner(networkPassphrase: string, address: string | null) {
  return async (xdr: string) => {
    const result = await freighterApi.signTransaction(xdr, {
      networkPassphrase,
      address: address ?? undefined,
    });
    if (result.error || !result.signedTxXdr) {
      throw new Error("Freighter declined to sign the transaction");
    }
    return result;
  };
}
