"use client";

// Role-gated contract actions for a grant. Each button appears only for the
// wallet that is allowed to call it: the institution attests, the sponsor
// disputes or cancels, release is permissionless once the window closes, and
// dispute resolution is admin-only.

import { useState } from "react";
import { useWallet, freighterSigner } from "./WalletProvider";
import { escrowClient } from "@/lib/contracts";
import { env } from "@/lib/env";
import type { Grant, Term } from "@/lib/api";

type Pending = string | null;

export function GrantActions({ grant, terms }: { grant: Grant; terms: Term[] }) {
  const { address } = useWallet();
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);

  if (grant.status !== "active") {
    return (
      <p className="text-sm text-neutral-400">
        This grant is {grant.status}; no further actions are possible.
      </p>
    );
  }

  const currentTerm = terms[grant.next_term];
  if (!currentTerm) return null;

  async function invoke(
    name: string,
    method: "attest_term" | "release_term" | "dispute_term" | "resolve_dispute" | "cancel_grant",
    args: Record<string, unknown>,
  ) {
    if (!address) return;
    setPending(name);
    setError(null);
    setTxHash(null);
    try {
      const client = await escrowClient(address, freighterSigner(env.networkPassphrase, address));
      const tx = await (client as unknown as Record<string, (a: Record<string, unknown>) => Promise<{ signAndSend: () => Promise<{ sendTransactionResponse?: { hash?: string } }> }>>)[method](args);
      const sent = await tx.signAndSend();
      const hash = sent.sendTransactionResponse?.hash;
      if (hash) setTxHash(hash);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setPending(null);
    }
  }

  const isSponsor = address === grant.sponsor;
  const isInstitution = address === grant.institution;
  const isAdmin = false; // admin actions run via the CLI in this MVP

  const canAttest = isInstitution && currentTerm.status === "pending";
  const canDispute = isSponsor && currentTerm.status === "attested";
  // Checking the wall clock is intentionally impure: the button must reflect
  // whether the dispute window has closed at render time.
  // eslint-disable-next-line react-hooks/purity
  const nowSec = Date.now() / 1000;
  const canRelease = currentTerm.status === "attested" && nowSec >= currentTerm.release_after;
  const canCancel = isSponsor && currentTerm.status === "pending";

  const button =
    "rounded-md px-3 py-1.5 text-xs font-medium transition disabled:opacity-40";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {canAttest && (
          <button
            className={`${button} bg-emerald-600 text-white hover:bg-emerald-500`}
            disabled={pending !== null}
            onClick={() => invoke("attest", "attest_term", { grant_id: grant.grant_id, term_index: currentTerm.term_index })}
          >
            {pending === "attest" ? "Signing…" : `Attest term ${currentTerm.term_index}`}
          </button>
        )}
        {canDispute && (
          <button
            className={`${button} bg-red-600 text-white hover:bg-red-500`}
            disabled={pending !== null}
            onClick={() => invoke("dispute", "dispute_term", { grant_id: grant.grant_id, term_index: currentTerm.term_index })}
          >
            {pending === "dispute" ? "Signing…" : "Dispute this term"}
          </button>
        )}
        {canRelease && (
          <button
            className={`${button} bg-sky-600 text-white hover:bg-sky-500`}
            disabled={pending !== null}
            onClick={() => invoke("release", "release_term", { grant_id: grant.grant_id, term_index: currentTerm.term_index })}
          >
            {pending === "release" ? "Sending…" : `Release term ${currentTerm.term_index}`}
          </button>
        )}
        {canCancel && (
          <button
            className={`${button} border border-neutral-700 text-neutral-300 hover:bg-neutral-800`}
            disabled={pending !== null}
            onClick={() => invoke("cancel", "cancel_grant", { grant_id: grant.grant_id })}
          >
            {pending === "cancel" ? "Signing…" : "Cancel and refund"}
          </button>
        )}
        {isAdmin && currentTerm.status === "disputed" && <span className="text-xs text-neutral-500">Dispute resolution is admin-only.</span>}
      </div>

      {!address && (
        <p className="text-xs text-neutral-500">
          Connect the sponsor or institution wallet to act on this grant.
        </p>
      )}
      {currentTerm.status === "disputed" && (
        <p className="text-xs text-neutral-500">
          This term is disputed. Resolution is performed by the protocol admin.
        </p>
      )}
      {txHash && (
        <p className="text-xs text-emerald-400">
          Sent. The indexer picks it up within a few seconds — refresh to see the new state.
        </p>
      )}
      {needsRefresh && !txHash && null}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
