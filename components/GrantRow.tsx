import Link from "next/link";
import type { Grant } from "@/lib/api";
import { GRANT_STATUS_LABEL, shortAddress } from "@/lib/format";
import { formatTokenAmount, getTokenMetadata } from "@/lib/token";

export async function GrantRow({ grant }: { grant: Grant }) {
  const token = await getTokenMetadata(grant.token);

  return (
    <Link
      href={`/grants/${grant.grant_id}`}
      className="block rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 transition hover:border-neutral-600"
    >
      <div className="flex items-center justify-between">
        <span className="font-medium">Grant #{grant.grant_id}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            grant.status === "active"
              ? "bg-emerald-500/15 text-emerald-300"
              : grant.status === "completed"
                ? "bg-sky-500/15 text-sky-300"
                : "bg-neutral-700 text-neutral-300"
          }`}
        >
          {GRANT_STATUS_LABEL[grant.status] ?? grant.status}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm text-neutral-400 sm:grid-cols-4">
        <div>
          <dt className="text-xs">Per term</dt>
          <dd className="font-mono text-neutral-200">
            {formatTokenAmount(grant.term_amount, token)}
          </dd>
        </div>
        <div>
          <dt className="text-xs">Terms</dt>
          <dd className="font-mono text-neutral-200">
            {grant.next_term}/{grant.terms_total} settled
          </dd>
        </div>
        <div>
          <dt className="text-xs">Sponsor</dt>
          <dd className="font-mono text-neutral-200">{shortAddress(grant.sponsor)}</dd>
        </div>
        <div>
          <dt className="text-xs">In escrow</dt>
          <dd className="font-mono text-neutral-200">
            {formatTokenAmount(grant.locked_amount, token)}
          </dd>
        </div>
      </dl>
    </Link>
  );
}
