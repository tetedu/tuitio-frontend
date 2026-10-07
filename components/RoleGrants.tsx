"use client";

// Shared client-side list of grants belonging to whoever is connected. The
// backend already filters by sponsor or institution, so this only has to
// decide which filter to use and what to say when there is nothing to show.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, type Grant, type Term } from "@/lib/api";
import { env } from "@/lib/env";
import { formatAmount, GRANT_STATUS_LABEL, TERM_STATUS_LABEL } from "@/lib/format";
import { DisputeWindow } from "./DisputeWindow";

export interface GrantWithTerms {
  grant: Grant;
  terms: Term[];
}

export function useRoleGrants(role: "sponsor" | "institution", address: string | null) {
  const [rows, setRows] = useState<GrantWithTerms[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!address) return;
    try {
      const grants = await api.grants(
        role === "sponsor" ? { sponsor: address } : { institution: address },
      );
      const withTerms = await Promise.all(
        grants.map(async (grant) => ({
          grant,
          terms: await api.terms(grant.grant_id).catch(() => [] as Term[]),
        })),
      );
      setRows(withTerms);
      setError(null);
    } catch {
      setError("Could not load grants from the API.");
    }
  }, [role, address]);

  // Scheduled rather than awaited inline: the first state update must not be
  // synchronous with the effect or React warns about cascading renders.
  useEffect(() => {
    if (!address) return;
    const id = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(id);
  }, [load, address]);

  return { rows, error, reload: load };
}

export function GrantCard({
  row,
  highlight,
}: {
  row: GrantWithTerms;
  /// Term state worth drawing attention to for this role.
  highlight?: (t: Term) => boolean;
}) {
  const { grant, terms } = row;
  const current = terms[grant.next_term];

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={`/grants/${grant.grant_id}`} className="font-medium hover:underline">
          Grant #{grant.grant_id}
        </Link>
        <div className="flex items-center gap-2">
          {current?.status === "attested" && (
            <DisputeWindow releaseAfter={current.release_after} />
          )}
          <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300">
            {GRANT_STATUS_LABEL[grant.status] ?? grant.status}
          </span>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-neutral-400 sm:grid-cols-4">
        <div>
          <dt>Per term</dt>
          <dd className="font-mono text-neutral-200">
            {formatAmount(grant.term_amount, env.tokenDecimals, env.tokenSymbol)}
          </dd>
        </div>
        <div>
          <dt>Settled</dt>
          <dd className="font-mono text-neutral-200">
            {grant.next_term}/{grant.terms_total}
          </dd>
        </div>
        <div>
          <dt>In escrow</dt>
          <dd className="font-mono text-neutral-200">
            {formatAmount(grant.locked_amount, env.tokenDecimals, env.tokenSymbol)}
          </dd>
        </div>
        <div>
          <dt>Next term</dt>
          <dd className="text-neutral-200">
            {current ? TERM_STATUS_LABEL[current.status] ?? current.status : "—"}
          </dd>
        </div>
      </dl>

      {highlight && terms.some(highlight) && (
        <ul className="mt-3 space-y-1 border-t border-neutral-800 pt-3 text-xs">
          {terms.filter(highlight).map((t) => (
            <li key={t.term_index} className="text-amber-300">
              Term {t.term_index} needs your attention
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
