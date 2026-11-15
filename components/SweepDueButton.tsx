"use client";

// Permissionless dashboard action that settles every due term across active
// grants using `TuitioEscrow.sweep(grant_ids)`, chunked into batches of 20.
// Any connected Freighter wallet may submit — not only sponsors or institutions.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet, freighterSigner } from "./WalletProvider";
import { TxResult } from "./TxResult";
import { escrowClient } from "@/lib/contracts";
import { env } from "@/lib/env";
import {
  MAX_SWEEP_BATCH,
  chunkGrantIds,
  fetchDueGrantIds,
  summarizeSweepBatches,
  unwrapSweepCount,
  type SweepBatchOutcome,
  type SweepSummary,
} from "@/lib/sweep";

interface CompletedSweep extends SweepSummary {
  submittedIds: number[];
}

export function SweepDueButton({
  initialDueGrantIds = [],
}: {
  initialDueGrantIds?: number[];
}) {
  const router = useRouter();
  const { address, connect, connecting } = useWallet();
  const [dueIds, setDueIds] = useState<number[]>(initialDueGrantIds);
  const [progress, setProgress] = useState<string | null>(null);
  const [summary, setSummary] = useState<CompletedSweep | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshDue = useCallback(async () => {
    try {
      const fresh = await fetchDueGrantIds();
      setDueIds(fresh);
      return fresh;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      void refreshDue();
    }, 0);
    return () => clearTimeout(id);
  }, [refreshDue]);

  async function handleSweep() {
    if (!address || dueIds.length === 0) return;

    const targetIds = [...dueIds];
    const batches = chunkGrantIds(targetIds, MAX_SWEEP_BATCH);
    const outcomes: SweepBatchOutcome[] = [];

    setError(null);
    setSummary(null);
    setProgress(batches.length > 1 ? `Signing batch 1 of ${batches.length}…` : "Signing…");

    try {
      const client = await escrowClient(
        address,
        freighterSigner(env.networkPassphrase, address),
      );

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        if (batches.length > 1) {
          setProgress(`Settling batch ${i + 1} of ${batches.length}…`);
        }
        const tx = await client.sweep({ grant_ids: batch });
        const sent = await tx.signAndSend();
        const settled = unwrapSweepCount(sent.result);
        const txHash = sent.sendTransactionResponse?.hash;
        outcomes.push({ requested: batch.length, settled, txHash });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sweep transaction failed");
    } finally {
      setProgress(null);
      if (outcomes.length > 0) {
        const tallied = summarizeSweepBatches(outcomes);
        const submittedIds = batches.slice(0, outcomes.length).flat();
        setSummary({ ...tallied, submittedIds });
      }
    }
  }

  const busy = progress !== null;
  const count = dueIds.length;
  const batchesCount = Math.ceil(count / MAX_SWEEP_BATCH);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleSweep}
          disabled={!address || count === 0 || busy}
          className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-sky-500 disabled:opacity-40"
        >
          {busy ? progress : `Release all due (${count})`}
        </button>

        {count > 0 && !address && (
          <button
            type="button"
            onClick={connect}
            disabled={connecting}
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-50"
          >
            {connecting ? "Connecting…" : "Connect wallet to sweep"}
          </button>
        )}

        {count > MAX_SWEEP_BATCH && (
          <span className="text-xs text-neutral-400">
            Batched in {batchesCount} transactions of up to {MAX_SWEEP_BATCH}
          </span>
        )}
      </div>

      {summary && (
        <div className="space-y-2 rounded-md border border-neutral-800 bg-neutral-900/60 p-3 text-xs">
          <p className="text-neutral-200">
            Contract reported{" "}
            <span className="font-mono font-medium text-emerald-400">
              {summary.settled}
            </span>{" "}
            {summary.settled === 1 ? "term" : "terms"} settled and{" "}
            <span className="font-mono font-medium text-amber-300">
              {summary.skipped}
            </span>{" "}
            skipped (out of {summary.requested} submitted).
          </p>
          {summary.txHashes.map((hash, idx) => (
            <TxResult
              key={hash}
              hash={hash}
              confirm={
                idx === summary.txHashes.length - 1
                  ? async () => {
                      const fresh = await fetchDueGrantIds();
                      const submittedSet = new Set(summary.submittedIds);
                      const stillDue = fresh.filter((id) => submittedSet.has(id)).length;
                      return summary.settled === 0 || stillDue <= summary.skipped;
                    }
                  : undefined
              }
              onIndexed={
                idx === summary.txHashes.length - 1
                  ? () => {
                      void refreshDue();
                      router.refresh();
                    }
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
