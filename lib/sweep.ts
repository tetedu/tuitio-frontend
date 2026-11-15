// Pure helpers and API discovery for permissionless batch term settlement
// (`TuitioEscrow.sweep`). Kept free of React so batching, eligibility, and
// contract result accounting can be unit-tested directly.

import { api, type Grant, type Term } from "./api";

/// Matches `MAX_SWEEP` in `contracts/tuition-escrow/src/lib.rs`.
export const MAX_SWEEP_BATCH = 20;

export interface GrantTermsEntry {
  grant: Grant;
  terms: readonly Term[];
}

export interface SweepBatchOutcome {
  requested: number;
  settled: number;
  txHash?: string;
}

export interface SweepSummary {
  requested: number;
  settled: number;
  skipped: number;
  txHashes: string[];
}

/// True when a grant is active and its next unsettled term is attested with a
/// dispute window that has already closed (`release_after <= nowSec`).
export function isGrantDue(
  grant: Grant,
  terms: readonly Term[],
  nowSec: number,
): boolean {
  if (grant.status !== "active") return false;
  if (grant.next_term < 0 || grant.next_term >= grant.terms_total) return false;

  const currentTerm = terms.find((t) => t.term_index === grant.next_term);
  if (!currentTerm || currentTerm.status !== "attested") return false;

  return currentTerm.release_after > 0 && nowSec >= currentTerm.release_after;
}

/// Returns unique grant IDs whose current term can be released right now,
/// preserving the order in which grants were supplied.
export function dueGrantIds(
  entries: readonly GrantTermsEntry[],
  nowSec: number,
): number[] {
  const seen = new Set<number>();
  const due: number[] = [];

  for (const { grant, terms } of entries) {
    if (seen.has(grant.grant_id)) continue;
    if (isGrantDue(grant, terms, nowSec)) {
      seen.add(grant.grant_id);
      due.push(grant.grant_id);
    }
  }

  return due;
}

/// Loads active grants and their terms from the backend API and computes which
/// grants are currently eligible for `sweep`.
export async function fetchDueGrantIds(
  nowSec: number = Date.now() / 1000,
  client: Pick<typeof api, "grants" | "terms"> = api,
): Promise<number[]> {
  const activeGrants = await client.grants({ status: "active" });
  const entries = await Promise.all(
    activeGrants.map(async (grant) => ({
      grant,
      terms: await client.terms(grant.grant_id).catch(() => [] as Term[]),
    })),
  );
  return dueGrantIds(entries, nowSec);
}

/// Splits grant IDs into chunks of at most `batchSize` (20 by default) so each
/// `sweep` transaction stays within the contract's `MAX_SWEEP` cap.
export function chunkGrantIds<T>(
  grantIds: readonly T[],
  batchSize: number = MAX_SWEEP_BATCH,
): T[][] {
  if (!Number.isInteger(batchSize) || batchSize <= 0) {
    throw new RangeError("batchSize must be a positive integer");
  }

  const chunks: T[][] = [];
  for (let i = 0; i < grantIds.length; i += batchSize) {
    chunks.push(grantIds.slice(i, i + batchSize));
  }
  return chunks;
}

interface UnwrappableResult {
  unwrap: () => unknown;
}

function isUnwrappable(value: unknown): value is UnwrappableResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "unwrap" in value &&
    typeof (value as UnwrappableResult).unwrap === "function"
  );
}

/// Extracts the `u32` settled-term count returned by `sweep`, handling both
/// `stellar-sdk` `Result<number>` (`Ok` / `Err`) wrappers and plain numbers.
export function unwrapSweepCount(raw: unknown): number {
  const unwrapped = isUnwrappable(raw) ? raw.unwrap() : raw;
  const count = typeof unwrapped === "bigint" ? Number(unwrapped) : unwrapped;

  if (typeof count !== "number" || !Number.isInteger(count) || count < 0) {
    throw new Error("Unexpected sweep return value from contract");
  }

  return count;
}

/// Aggregates settled versus skipped counts across one or more `sweep` batches.
export function summarizeSweepBatches(
  batches: readonly SweepBatchOutcome[],
): SweepSummary {
  let requested = 0;
  let settled = 0;
  let skipped = 0;
  const txHashes: string[] = [];

  for (const batch of batches) {
    if (
      !Number.isInteger(batch.requested) ||
      batch.requested < 0 ||
      !Number.isInteger(batch.settled) ||
      batch.settled < 0 ||
      batch.settled > batch.requested
    ) {
      throw new RangeError("Invalid sweep batch counts");
    }
    requested += batch.requested;
    settled += batch.settled;
    skipped += batch.requested - batch.settled;
    if (batch.txHash) txHashes.push(batch.txHash);
  }

  return { requested, settled, skipped, txHashes };
}
