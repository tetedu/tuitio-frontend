"use client";

import { useWallet } from "./WalletProvider";
import { shortAddress } from "@/lib/format";

export function WalletButton() {
  const { address, connecting, error, connect } = useWallet();

  if (address) {
    return (
      <span className="rounded-md bg-emerald-500/15 px-3 py-1.5 font-mono text-xs text-emerald-300">
        {shortAddress(address, 6)}
      </span>
    );
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={connect}
        disabled={connecting}
        className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50"
      >
        {connecting ? "Connecting…" : "Connect Freighter"}
      </button>
      {error && <span className="text-[10px] text-red-400">{error}</span>}
    </div>
  );
}
