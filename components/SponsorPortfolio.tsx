"use client";

import { useWallet } from "./WalletProvider";
import { GrantCard, useRoleGrants } from "./RoleGrants";
import { env } from "@/lib/env";
import { formatAmount } from "@/lib/format";

export function SponsorPortfolio() {
  const { address, connect, connecting } = useWallet();
  const { rows, error } = useRoleGrants("sponsor", address);

  if (!address) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
        <p className="text-sm text-neutral-400">
          Connect your wallet to see the grants you fund.
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

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (rows === null) return <p className="text-sm text-neutral-400">Loading…</p>;

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
        <p className="text-sm text-neutral-400">
          This wallet has not funded any grants yet.
        </p>
        <a
          href="/sponsor"
          className="mt-3 inline-block rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
        >
          Fund your first grant
        </a>
      </div>
    );
  }

  const committed = rows.reduce(
    (sum, r) => sum + r.grant.term_amount * r.grant.terms_total,
    0,
  );
  const escrowed = rows.reduce((sum, r) => sum + r.grant.locked_amount, 0);
  // A term the institution has claimed but that has not yet released is the
  // only thing a sponsor can still act on.
  const openClaims = rows.filter(
    (r) => r.terms[r.grant.next_term]?.status === "attested",
  ).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Grants" value={String(rows.length)} />
        <Stat
          label="Total committed"
          value={formatAmount(committed, env.tokenDecimals, env.tokenSymbol)}
        />
        <Stat
          label="Still in escrow"
          value={formatAmount(escrowed, env.tokenDecimals, env.tokenSymbol)}
        />
        <Stat label="Open claims" value={String(openClaims)} />
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <GrantCard
            key={row.grant.grant_id}
            row={row}
            highlight={(t) => t.status === "attested" || t.status === "disputed"}
          />
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
      <div className="font-mono text-sm">{value}</div>
      <div className="mt-1 text-xs text-neutral-400">{label}</div>
    </div>
  );
}
