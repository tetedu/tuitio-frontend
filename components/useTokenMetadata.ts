"use client";

// Client hooks that subscribe to `resolveTokenMetadata`, rendering fallback env
// metadata immediately on first paint and upgrading once on-chain discovery
// resolves (or immediately from the in-memory Map on subsequent renders).

import { useEffect, useState } from "react";
import {
  fallbackTokenMetadata,
  resolveTokenMetadata,
  type TokenMetadata,
} from "@/lib/token";

export function useTokenMetadata(contractId: string): TokenMetadata {
  const [metadata, setMetadata] = useState<TokenMetadata>(fallbackTokenMetadata);

  useEffect(() => {
    let cancelled = false;
    void resolveTokenMetadata(contractId).then((resolved) => {
      if (!cancelled) setMetadata(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [contractId]);

  return metadata;
}

export function useTokenMetadataMap(
  contractIds: readonly string[],
): ReadonlyMap<string, TokenMetadata> {
  const [byToken, setByToken] = useState<ReadonlyMap<string, TokenMetadata>>(
    () => new Map(),
  );
  const key = Array.from(new Set(contractIds.filter(Boolean))).sort().join(",");

  useEffect(() => {
    const unique = key ? key.split(",") : [];
    if (unique.length === 0) return;
    let cancelled = false;

    void Promise.all(
      unique.map(async (id) => [id, await resolveTokenMetadata(id)] as const),
    ).then((entries) => {
      if (!cancelled) setByToken(new Map(entries));
    });

    return () => {
      cancelled = true;
    };
  }, [key]);

  return byToken;
}
