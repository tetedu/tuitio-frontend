import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { env } from "@/lib/env";
import { formatAmount, formatTimestamp, GRANT_STATUS_LABEL, shortAddress } from "@/lib/format";
import { TermsTimeline } from "@/components/TermsTimeline";
import { GrantActions } from "@/components/GrantActions";

export const dynamic = "force-dynamic";

export default async function GrantDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const grantId = Number(id);
  if (!Number.isInteger(grantId) || grantId < 0) notFound();

  const grant = await api.grant(grantId).catch(() => null);
  if (!grant) notFound();
  const terms = await api.terms(grantId).catch(() => []);
  const institution = await api.institution(grant.institution).catch(() => null);

  const total = grant.term_amount * grant.terms_total;
  const released = grant.term_amount * grant.next_term;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Grant #{grant.grant_id}</h1>
        <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-300">
          {GRANT_STATUS_LABEL[grant.status] ?? grant.status}
        </span>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
          <div className="font-mono text-lg">
            {formatAmount(total, env.tokenDecimals, env.tokenSymbol)}
          </div>
          <div className="mt-1 text-xs text-neutral-400">Total committed</div>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
          <div className="font-mono text-lg">
            {formatAmount(released, env.tokenDecimals, env.tokenSymbol)}
          </div>
          <div className="mt-1 text-xs text-neutral-400">Settled so far</div>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
          <div className="font-mono text-lg">
            {formatAmount(grant.locked_amount, env.tokenDecimals, env.tokenSymbol)}
          </div>
          <div className="mt-1 text-xs text-neutral-400">Still in escrow</div>
        </div>
      </section>

      <section className="grid gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-neutral-400">Sponsor</span>
          <span className="font-mono">{shortAddress(grant.sponsor, 8)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-400">Student</span>
          <span className="font-mono">{shortAddress(grant.beneficiary, 8)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-400">Institution</span>
          <span>{institution ? `${institution.name} (${institution.country})` : shortAddress(grant.institution, 8)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-400">Created</span>
          <span className="font-mono">{formatTimestamp(grant.created_at)}</span>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Terms</h2>
        <TermsTimeline terms={terms} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Actions</h2>
        <GrantActions grant={grant} terms={terms} />
      </section>
    </div>
  );
}
