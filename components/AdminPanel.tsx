"use client";

// Dispute resolution for whoever the escrow contract names as admin.
//
// Until now this was the one protocol action with no interface at all: a
// disputed term could only be resolved from the command line, which meant the
// frozen funds of a real dispute depended on someone with a terminal. The
// admin address is read from the contract itself rather than configured here,
// so the UI cannot disagree with what the contract will actually accept.

import { useCallback, useEffect, useState } from "react";
import { useWallet, freighterSigner } from "./WalletProvider";
import { TxResult } from "./TxResult";
import { escrowClient } from "@/lib/contracts";
import { api, type Grant, type Term } from "@/lib/api";
import { env } from "@/lib/env";
import { formatAmount, formatTimestamp, shortAddress } from "@/lib/format";

interface Disputed {
  grant: Grant;
  term: Term;
}

export function AdminPanel() {
  const { address, connect, connecting } = useWallet();
  const [admin, setAdmin] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [disputed, setDisputed] = useState<Disputed[] | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // The contract is the authority on who may resolve a dispute.
  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    (async () => {
      try {
        const client = await escrowClient(
          address,
          freighterSigner(env.networkPassphrase, address),
        );
        const tx = await client.get_config();
        if (!cancelled) setAdmin(tx.result.admin);
      } catch {
        if (!cancelled) setAdminError("Could not read the escrow configuration.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address]);

  const loadDisputed = useCallback(async () => {
    try {
      const grants = await api.grants({ status: "active" });
      const rows: Disputed[] = [];
      for (const grant of grants) {
        const terms = await api.terms(grant.grant_id).catch(() => [] as Term[]);
        for (const term of terms) {
          if (term.status === "disputed") rows.push({ grant, term });
        }
      }
      setDisputed(rows);
    } catch {
      setDisputed([]);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      void loadDisputed();
    }, 0);
    return () => clearTimeout(id);
  }, [loadDisputed]);

  async function resolve(grantId: number, termIndex: number, release: boolean) {
    if (!address) return;
    const key = `${grantId}:${termIndex}:${release}`;
    setPending(key);
    setActionError(null);
    setTxHash(null);
    try {
      const client = await escrowClient(
        address,
        freighterSigner(env.networkPassphrase, address),
      );
      const tx = await client.resolve_dispute({
        grant_id: grantId,
        term_index: termIndex,
        release,
      });
      const sent = await tx.signAndSend();
      const hash = sent.sendTransactionResponse?.hash;
      if (hash) setTxHash(hash);
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Transaction failed or was declined.",
      );
    } finally {
      setPending(null);
      setConfirming(null);
    }
  }

  if (!address) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
        <p className="text-sm text-neutral-400">
          Connect the escrow admin wallet to resolve disputes.
        </p>
        <button
          onClick={connect}
          disabled={connecting}
          className="mt-3 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50"
        >
          {connecting ? "Connecting…" : "Connect Freighter"}
        </button>
      </div>
    );
  }

  if (adminError) return <p className="text-sm text-red-400">{adminError}</p>;
  if (admin === null) return <p className="text-sm text-neutral-400">Checking permissions…</p>;

  if (admin !== address) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6 text-sm">
        <p className="text-neutral-300">This wallet cannot resolve disputes.</p>
        <p className="mt-2 text-xs text-neutral-500">
          The escrow names{" "}
          <span className="font-mono">{shortAddress(admin, 8)}</span> as its
          admin. Dispute resolution is deliberately a separate role from
          registry verification, so no single key both admits an institution
          and settles claims against it.
        </p>
      </div>
    );
  }

  if (disputed === null) return <p className="text-sm text-neutral-400">Loading disputes…</p>;

  if (disputed.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
        <p className="text-sm text-neutral-400">No disputed terms. Nothing to decide.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {disputed.map(({ grant, term }) => {
        const releaseKey = `${grant.grant_id}:${term.term_index}:true`;
        const refundKey = `${grant.grant_id}:${term.term_index}:false`;
        const busy = pending !== null;
        return (
          <div
            key={`${grant.grant_id}-${term.term_index}`}
            className="rounded-lg border border-red-500/30 bg-red-500/5 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">
                Grant #{grant.grant_id}, term {term.term_index}
              </span>
              <span className="font-mono text-sm">
                {formatAmount(grant.term_amount, env.tokenDecimals, env.tokenSymbol)}
              </span>
            </div>

            <dl className="mt-3 grid grid-cols-1 gap-1 text-xs text-neutral-400 sm:grid-cols-2">
              <div>
                <dt className="inline">Sponsor: </dt>
                <dd className="inline font-mono text-neutral-300">
                  {shortAddress(grant.sponsor, 6)}
                </dd>
              </div>
              <div>
                <dt className="inline">Institution: </dt>
                <dd className="inline font-mono text-neutral-300">
                  {shortAddress(grant.institution, 6)}
                </dd>
              </div>
              <div>
                <dt className="inline">Attested: </dt>
                <dd className="inline text-neutral-300">
                  {formatTimestamp(term.attested_at)}
                </dd>
              </div>
            </dl>

            {confirming === releaseKey || confirming === refundKey ? (
              <div className="mt-4 rounded-md bg-neutral-900 p-3 text-xs">
                <p className="text-neutral-200">
                  {confirming === releaseKey
                    ? `Pay ${formatAmount(grant.term_amount, env.tokenDecimals, env.tokenSymbol)} to the institution? This is final.`
                    : `Refund ${formatAmount(grant.term_amount, env.tokenDecimals, env.tokenSymbol)} to the sponsor? This is final.`}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() =>
                      resolve(
                        grant.grant_id,
                        term.term_index,
                        confirming === releaseKey,
                      )
                    }
                    disabled={busy}
                    className="rounded-md bg-white px-3 py-1.5 font-medium text-black disabled:opacity-40"
                  >
                    {busy ? "Confirm in Freighter…" : "Yes, do it"}
                  </button>
                  <button
                    onClick={() => setConfirming(null)}
                    disabled={busy}
                    className="rounded-md border border-neutral-700 px-3 py-1.5 text-neutral-300 disabled:opacity-40"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setConfirming(releaseKey)}
                  disabled={busy}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-500 disabled:opacity-40"
                >
                  Pay the institution
                </button>
                <button
                  onClick={() => setConfirming(refundKey)}
                  disabled={busy}
                  className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-sky-500 disabled:opacity-40"
                >
                  Refund the sponsor
                </button>
              </div>
            )}
          </div>
        );
      })}

      {txHash && (
        <TxResult
          hash={txHash}
          confirm={async () => {
            const grants = await api.grants({ status: "active" });
            for (const g of grants) {
              const terms = await api.terms(g.grant_id).catch(() => []);
              if (terms.some((t) => t.status === "disputed")) return false;
            }
            return true;
          }}
          onIndexed={loadDisputed}
        />
      )}
      {actionError && <p className="text-sm text-red-400">{actionError}</p>}
    </div>
  );
}
