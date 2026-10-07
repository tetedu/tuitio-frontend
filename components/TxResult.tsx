"use client";

// Shows what happened to a submitted transaction: the hash linked to a block
// explorer, and whether the indexer has caught up yet. Writes go straight to
// the chain, so the read model trails by a polling cycle — saying so is better
// than leaving the user wondering why the page looks unchanged.

import { useEffect, useState } from "react";
import { explorerTxUrl } from "@/lib/env";

type Phase = "submitted" | "indexed" | "timeout";

export function TxResult({
  hash,
  confirm,
  onIndexed,
}: {
  hash: string;
  /// Resolves true once the indexed read model reflects the transaction.
  confirm?: () => Promise<boolean>;
  onIndexed?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("submitted");

  useEffect(() => {
    if (!confirm) return;
    let cancelled = false;
    const deadline = Date.now() + 45_000;

    const tick = async () => {
      if (cancelled) return;
      try {
        if (await confirm()) {
          if (cancelled) return;
          setPhase("indexed");
          onIndexed?.();
          return;
        }
      } catch {
        // Keep polling; a transient API error is not a failed transaction.
      }
      if (cancelled) return;
      if (Date.now() > deadline) {
        setPhase("timeout");
        return;
      }
      setTimeout(tick, 3000);
    };
    const id = setTimeout(tick, 2000);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [hash, confirm, onIndexed]);

  const message = {
    submitted: "Submitted to the network, waiting for the indexer…",
    indexed: "Confirmed and indexed.",
    timeout:
      "Submitted. The indexer has not caught up yet — the transaction is on chain regardless.",
  }[phase];

  const tone = {
    submitted: "text-amber-300",
    indexed: "text-emerald-400",
    timeout: "text-neutral-400",
  }[phase];

  return (
    <div className="space-y-1 text-xs">
      <p className={tone}>{message}</p>
      <a
        href={explorerTxUrl(hash)}
        target="_blank"
        rel="noreferrer"
        className="font-mono text-sky-400 underline decoration-dotted hover:text-sky-300"
      >
        {hash.slice(0, 16)}… view on explorer
      </a>
    </div>
  );
}
