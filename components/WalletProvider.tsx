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
import { env } from "@/lib/env";
import { isNetworkMismatch } from "@/lib/network";

interface WalletState {
  address: string | null;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  /// Network passphrase Freighter reports, or null if not yet known.
  walletNetwork: string | null;
  /// True only when the wallet's network is known and differs from this
  /// deployment's. Write actions must stay disabled while it is true: the
  /// signature would be rejected, with an error that never names the network.
  networkMismatch: boolean;
}

const WalletContext = createContext<WalletState>({
  address: null,
  connecting: false,
  error: null,
  connect: async () => {},
  walletNetwork: null,
  networkMismatch: false,
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletNetwork, setWalletNetwork] = useState<string | null>(null);

  // Reads the wallet's current network. Freighter has no change event, so the
  // value is re-read on connect and whenever the tab regains focus — which is
  // when a user comes back from switching networks in the extension.
  const refreshNetwork = useCallback(async () => {
    try {
      const details = await freighterApi.getNetworkDetails();
      // Freighter reports failures in an `error` field rather than throwing,
      // and leaves the remaining fields unpopulated when it does.
      if (details.error || !details.networkPassphrase) {
        setWalletNetwork(null);
        return;
      }
      setWalletNetwork(details.networkPassphrase);
    } catch {
      // Freighter absent or declining to answer. Leave the network unknown
      // rather than guessing; isNetworkMismatch treats that as "no mismatch".
      setWalletNetwork(null);
    }
  }, []);

  // Restore an already-authorized wallet on mount.
  useEffect(() => {
    (async () => {
      try {
        const connected = await freighterApi.isConnected();
        if (connected.isConnected) {
          const { address } = await freighterApi.getAddress();
          if (address) {
            setAddress(address);
            await refreshNetwork();
          }
        }
      } catch {
        // Freighter not installed; the connect button surfaces it.
      }
    })();
  }, [refreshNetwork]);

  // Re-check on focus. Switching networks happens in the extension, so the
  // tab is in the background exactly when the value goes stale.
  useEffect(() => {
    if (!address) return;
    const recheck = () => {
      if (document.visibilityState === "visible") void refreshNetwork();
    };
    window.addEventListener("focus", recheck);
    document.addEventListener("visibilitychange", recheck);
    return () => {
      window.removeEventListener("focus", recheck);
      document.removeEventListener("visibilitychange", recheck);
    };
  }, [address, refreshNetwork]);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const { address } = await freighterApi.requestAccess();
      if (!address) throw new Error("no address returned");
      setAddress(address);
      await refreshNetwork();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not connect. Is Freighter installed?",
      );
    } finally {
      setConnecting(false);
    }
  }, [refreshNetwork]);

  return (
    <WalletContext.Provider
      value={{
        address,
        connecting,
        error,
        connect,
        walletNetwork,
        networkMismatch: isNetworkMismatch(walletNetwork, env.networkPassphrase),
      }}
    >
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
