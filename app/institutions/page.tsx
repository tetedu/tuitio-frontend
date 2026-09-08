import { api } from "@/lib/api";
import { shortAddress } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  verified: "bg-emerald-500/15 text-emerald-300",
  pending: "bg-amber-500/15 text-amber-300",
  suspended: "bg-red-500/15 text-red-300",
};

export default async function Institutions() {
  const institutions = await api.institutions().catch(() => []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Institutions</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400">
          Registration is permissionless, but only the registry admin&apos;s
          verification makes an institution eligible to receive grants.
        </p>
      </div>
      {institutions.length === 0 ? (
        <p className="text-sm text-neutral-400">No institutions registered yet.</p>
      ) : (
        <div className="space-y-3">
          {institutions.map((i) => (
            <div
              key={i.address}
              className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{i.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[i.status] ?? "bg-neutral-800"}`}>
                  {i.status}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-1 gap-2 text-xs text-neutral-400 sm:grid-cols-3">
                <div>
                  <dt>Address</dt>
                  <dd className="font-mono text-neutral-200">{shortAddress(i.address, 8)}</dd>
                </div>
                <div>
                  <dt>Payout</dt>
                  <dd className="font-mono text-neutral-200">{shortAddress(i.payout, 8)}</dd>
                </div>
                <div>
                  <dt>Country</dt>
                  <dd className="font-mono text-neutral-200">{i.country}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
