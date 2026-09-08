import type { Activity } from "@/lib/api";
import { shortAddress } from "@/lib/format";

const EVENT_LABEL: Record<string, string> = {
  institution_registered: "Institution registered",
  institution_verified: "Institution verified",
  institution_suspended: "Institution suspended",
  payout_updated: "Payout address rotated",
  grant_created: "Grant funded",
  term_attested: "Term attested",
  term_released: "Term released",
  term_disputed: "Term disputed",
  dispute_resolved: "Dispute resolved",
  term_refunded: "Term refunded",
  grant_cancelled: "Grant cancelled",
  grant_completed: "Grant completed",
};

function describe(a: Activity): string {
  const p = a.payload as Record<string, string | number>;
  switch (a.event) {
    case "grant_created":
      return `Grant #${p.grant_id} funded for ${p.total_funded}`;
    case "term_attested":
    case "term_released":
    case "term_disputed":
    case "dispute_resolved":
    case "term_refunded":
      return `Grant #${p.grant_id}, term ${p.term_index}`;
    case "institution_registered":
      return String(p.name ?? "");
    case "institution_verified":
    case "institution_suspended":
      return shortAddress(String(p.institution ?? ""), 6);
    default:
      return "";
  }
}

export function ActivityFeed({ activity }: { activity: Activity[] }) {
  if (activity.length === 0) {
    return <p className="text-sm text-neutral-400">No activity indexed yet.</p>;
  }
  return (
    <ul className="divide-y divide-neutral-800">
      {activity.map((a, i) => (
        <li key={`${a.ledger}-${a.tx_hash}-${i}`} className="py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm">{EVENT_LABEL[a.event] ?? a.event}</span>
            <span className="font-mono text-xs text-neutral-500">ledger {a.ledger}</span>
          </div>
          <div className="text-xs text-neutral-400">{describe(a)}</div>
        </li>
      ))}
    </ul>
  );
}
