"use client";

// Role-aware view for a registered institution: what it is owed, what it can
// attest right now, and what is waiting on the sponsor or the admin.

import { useEffect, useState } from "react";
import { useWallet, freighterSigner } from "./WalletProvider";
import { GrantCard, useRoleGrants } from "./RoleGrants";
import { TxResult } from "./TxResult";
import { escrowClient } from "@/lib/contracts";
import { api, type Institution } from "@/lib/api";
import { env } from "@/lib/env";
import { formatAmount } from "@/lib/format";

export function InstitutionDashboard() {
  const { address, connect, connecting } = useWallet();
  const { rows, error, reload } = useRoleGrants("institution", address);
  // null while unknown, false once we know the wallet is not registered.
  const [me, setMe] = useState<Institution | null>(null);
  const [registered, setRegistered] = useState<boolean | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    api
      .institution(address)
      .then((i) => {
        setMe(i);
        setRegistered(true);
      })
      .catch(() => {
        setMe(null);
        setRegistered(false);
      });
  }, [address]);

  if (!address) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
        <p className="text-sm text-neutral-400">
          Connect the wallet registered as your institution.
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

  if (registered === false) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-6 text-sm">
        <p className="text-amber-300">This wallet is not a registered institution.</p>
        <p className="mt-2 text-neutral-400">
          Registration is permissionless, but only a verified institution can be
          named in a grant. Register the address, then ask the registry admin to
          verify it.
        </p>
      </div>
    );
  }

  async function attest(grantId: number, termIndex: number) {
    if (!address) return;
    const key = `${grantId}:${termIndex}`;
    setPending(key);
    setActionError(null);
    setTxHash(null);
    try {
      const client = await escrowClient(
        address,
        freighterSigner(env.networkPassphrase, address),
      );
      const tx = await client.attest_term({ grant_id: grantId, term_index: termIndex });
      const sent = await tx.signAndSend();
      const hash = sent.sendTransactionResponse?.hash;
      if (hash) setTxHash(hash);
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Transaction failed or was declined.",
      );
    } finally {
      setPending(null);
    }
  }

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (rows === null) return <p className="text-sm text-neutral-400">Loading…</p>;

  const attestable = rows.filter(
    (r) => r.grant.status === "active" && r.terms[r.grant.next_term]?.status === "pending",
  );
  const owed = rows.reduce((sum, r) => sum + r.grant.locked_amount, 0);

  return (
    <div className="space-y-6">
      {me && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">{me.name}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                me.status === "verified"
                  ? "bg-emerald-500/15 text-emerald-300"
                  : me.status === "suspended"
                    ? "bg-red-500/15 text-red-300"
                    : "bg-amber-500/15 text-amber-300"
              }`}
            >
              {me.status}
            </span>
          </div>
          <p className="mt-2 text-xs text-neutral-400">
            Tuition is paid to{" "}
            <span className="font-mono text-neutral-300">{me.payout}</span>
          </p>
          {me.status !== "verified" && (
            <p className="mt-2 text-xs text-amber-300">
              Only a verified institution can be named in new grants.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Grants naming you" value={String(rows.length)} />
        <Stat label="Terms you can attest" value={String(attestable.length)} />
        <Stat
          label="Still in escrow for you"
          value={formatAmount(owed, env.tokenDecimals, env.tokenSymbol)}
        />
      </div>

      {attestable.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Awaiting your attestation</h2>
          {attestable.map((r) => {
            const term = r.terms[r.grant.next_term];
            const key = `${r.grant.grant_id}:${term.term_index}`;
            return (
              <div
                key={key}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4"
              >
                <div className="text-sm">
                  <div className="font-medium">
                    Grant #{r.grant.grant_id}, term {term.term_index}
                  </div>
                  <div className="text-xs text-neutral-400">
                    Releases{" "}
                    {formatAmount(
                      r.grant.term_amount,
                      env.tokenDecimals,
                      env.tokenSymbol,
                    )}{" "}
                    once the sponsor&apos;s window closes
                  </div>
                </div>
                <button
                  onClick={() => attest(r.grant.grant_id, term.term_index)}
                  disabled={pending !== null || me?.status !== "verified"}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-500 disabled:opacity-40"
                >
                  {pending === key ? "Confirm in Freighter…" : "Attest term"}
                </button>
              </div>
            );
          })}
        </section>
      )}

      {txHash && (
        <TxResult
          hash={txHash}
          confirm={async () => {
            const refreshed = await api.grants({ institution: address });
            // Any grant advancing or its term leaving "pending" means the
            // attestation has been indexed.
            return refreshed.some((g) => {
              const before = rows.find((r) => r.grant.grant_id === g.grant_id);
              return before && g.next_term !== before.grant.next_term;
            }) || (await anyTermAttested(address));
          }}
          onIndexed={reload}
        />
      )}
      {actionError && <p className="text-sm text-red-400">{actionError}</p>}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">All grants naming your institution</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-neutral-400">
            No sponsor has funded a grant for your institution yet.
          </p>
        ) : (
          rows.map((row) => <GrantCard key={row.grant.grant_id} row={row} />)
        )}
      </section>
    </div>
  );
}

/// True once any term of this institution's grants is attested, which is how
/// the indexer reflects a fresh attestation.
async function anyTermAttested(address: string): Promise<boolean> {
  const grants = await api.grants({ institution: address });
  for (const g of grants) {
    const terms = await api.terms(g.grant_id).catch(() => []);
    if (terms.some((t) => t.status === "attested")) return true;
  }
  return false;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
      <div className="font-mono text-sm">{value}</div>
      <div className="mt-1 text-xs text-neutral-400">{label}</div>
    </div>
  );
}
