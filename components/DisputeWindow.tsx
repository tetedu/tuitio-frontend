"use client";

// Live countdown to the moment an attested term becomes releasable. The
// sponsor's only check on a false attestation is objecting before this
// expires, so the time left is the most important thing on the page.

import { useEffect, useState } from "react";
import { countdownTo } from "@/lib/format";

export function DisputeWindow({ releaseAfter }: { releaseAfter: number }) {
  const [now, setNow] = useState<number | null>(null);

  // Start the clock after mount so the server and client render the same
  // markup. The first tick is scheduled rather than set synchronously, which
  // would cascade a render.
  useEffect(() => {
    const update = () => setNow(Date.now());
    const first = setTimeout(update, 0);
    const id = setInterval(update, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  if (!releaseAfter) return null;
  if (now === null) {
    return <span className="text-xs text-neutral-500">dispute window…</span>;
  }

  const left = countdownTo(releaseAfter, now);
  if (!left) {
    return (
      <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-xs text-sky-300">
        window closed — releasable
      </span>
    );
  }
  return (
    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300">
      {left} left to dispute
    </span>
  );
}
