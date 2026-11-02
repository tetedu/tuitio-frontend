"use client";

// Persistent warning shown when Freighter is pointed at a different network
// from the one this deployment targets.
//
// Without it the only feedback is a rejected signature whose error does not
// mention the network, which reads as "the app is broken" rather than "your
// wallet is on mainnet".

import { useWallet } from "./WalletProvider";
import { env } from "@/lib/env";
import { networkLabel } from "@/lib/network";

export function NetworkBanner() {
  const { address, walletNetwork, networkMismatch } = useWallet();

  // Nothing to say when no wallet is connected, or when the network matches.
  if (!address || !networkMismatch) return null;

  const expected = networkLabel(env.networkPassphrase);
  const actual = networkLabel(walletNetwork);

  return (
    <div role="alert" className="border-b border-amber-500/40 bg-amber-500/10">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-2 gap-y-1 px-6 py-3 text-sm text-amber-200">
        <span className="font-medium">Wrong network.</span>
        <span>
          Freighter is on <span className="font-medium">{actual}</span>, but Tuitio runs on{" "}
          <span className="font-medium">{expected}</span>.
        </span>
        <span className="text-amber-200/80">
          Switch network in the Freighter extension, then return to this tab. Signing is
          disabled until you do.
        </span>
      </div>
    </div>
  );
}
