import { api } from "@/lib/api";
import { StatCard } from "@/components/StatCard";
import { GrantRow } from "@/components/GrantRow";
import { ActivityFeed } from "@/components/ActivityFeed";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  // The dashboard degrades gracefully if the indexer is still starting.
  const [stats, grants, activity] = await Promise.all([
    api.stats().catch(() => null),
    api.grants().catch(() => []),
    api.activity(15).catch(() => []),
  ]);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400">
          Every grant below is fully funded on-chain. Money leaves escrow only
          when a verified institution attests a completed term and the
          sponsor&apos;s dispute window closes without objection.
        </p>
      </section>

      {stats && (
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Verified institutions" value={stats.institutions_live} />
          <StatCard label="Grants" value={stats.grants_total} />
          <StatCard label="Terms released" value={stats.terms_released} />
          <StatCard label="Terms refunded" value={stats.terms_refunded} />
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Grants</h2>
        {grants.length === 0 ? (
          <p className="text-sm text-neutral-400">No grants indexed yet.</p>
        ) : (
          <div className="space-y-3">
            {grants.map((g) => (
              <GrantRow key={g.grant_id} grant={g} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Recent activity</h2>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-4">
          <ActivityFeed activity={activity} />
        </div>
      </section>
    </div>
  );
}
