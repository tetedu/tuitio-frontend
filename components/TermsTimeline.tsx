import type { Term } from "@/lib/api";
import { TERM_STATUS_LABEL, TERM_STATUS_STYLE, formatTimestamp } from "@/lib/format";

export function TermsTimeline({ terms }: { terms: Term[] }) {
  return (
    <ol className="space-y-3">
      {terms.map((term) => (
        <li
          key={term.term_index}
          className="flex flex-col gap-1 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <span className="font-medium">Term {term.term_index}</span>
            <span
              className={`ml-3 rounded-full px-2 py-0.5 text-xs ${TERM_STATUS_STYLE[term.status] ?? "bg-neutral-800 text-neutral-300"}`}
            >
              {TERM_STATUS_LABEL[term.status] ?? term.status}
            </span>
          </div>
          <div className="text-xs text-neutral-400">
            {term.attested_at > 0 && <div>Attested {formatTimestamp(term.attested_at)}</div>}
            {term.release_after > 0 && (
              <div>Window closes {formatTimestamp(term.release_after)}</div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
