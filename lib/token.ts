// Token metadata discovery against the Stellar Asset Contract (SAC / SEP-41)
// spec, with per-contract in-memory caching and pure formatting helpers kept
// decoupled from network reads and React rendering.

import { cache } from "react";
import { contract, xdr } from "@stellar/stellar-sdk";
import { env } from "./env";
import { formatAmount } from "./format";

export interface TokenMetadata {
  symbol: string;
  decimals: number;
  name: string;
}

export type TokenMetadataReader = (contractId: string) => Promise<TokenMetadata>;

interface SacTokenClient {
  name: () => Promise<contract.AssembledTransaction<unknown>>;
  symbol: () => Promise<contract.AssembledTransaction<unknown>>;
  decimals: () => Promise<contract.AssembledTransaction<unknown>>;
}

/// Minimal SEP-41 / SAC interface spec (`name`, `symbol`, `decimals`). Building
/// the client directly from this spec works for both built-in Stellar Asset
/// Contracts (which have no Wasm bytecode on-chain) and custom SEP-41 tokens.
export const SAC_METADATA_SPEC = new contract.Spec([
  xdr.ScSpecEntry.scSpecEntryFunctionV0(
    new xdr.ScSpecFunctionV0({
      doc: "",
      name: "name",
      inputs: [],
      outputs: [xdr.ScSpecTypeDef.scSpecTypeString()],
    }),
  ),
  xdr.ScSpecEntry.scSpecEntryFunctionV0(
    new xdr.ScSpecFunctionV0({
      doc: "",
      name: "symbol",
      inputs: [],
      outputs: [xdr.ScSpecTypeDef.scSpecTypeString()],
    }),
  ),
  xdr.ScSpecEntry.scSpecEntryFunctionV0(
    new xdr.ScSpecFunctionV0({
      doc: "",
      name: "decimals",
      inputs: [],
      outputs: [xdr.ScSpecTypeDef.scSpecTypeU32()],
    }),
  ),
]);

const metadataCache = new Map<string, Promise<TokenMetadata>>();

/// Environment-configured token metadata used strictly as a fallback before
/// discovery resolves or when an RPC read fails.
export function fallbackTokenMetadata(): TokenMetadata {
  const symbol = env.tokenSymbol || "XLM";
  const decimals =
    Number.isInteger(env.tokenDecimals) && env.tokenDecimals >= 0
      ? env.tokenDecimals
      : 7;
  return { symbol, decimals, name: symbol };
}

function unwrapResult(value: unknown): unknown {
  if (
    typeof value === "object" &&
    value !== null &&
    "unwrap" in value &&
    typeof (value as { unwrap: unknown }).unwrap === "function"
  ) {
    return (value as { unwrap: () => unknown }).unwrap();
  }
  return value;
}

/// Normalises raw contract return values into a validated `TokenMetadata`
/// record, throwing when any field is missing or out of range.
export function normalizeTokenMetadata(raw: {
  symbol: unknown;
  decimals: unknown;
  name: unknown;
}): TokenMetadata {
  const rawSymbol = unwrapResult(raw.symbol);
  const rawDecimals = unwrapResult(raw.decimals);
  const rawName = unwrapResult(raw.name);

  if (typeof rawSymbol !== "string" || rawSymbol.trim().length === 0) {
    throw new Error("Token contract returned an empty or invalid symbol");
  }

  const numericDecimals =
    typeof rawDecimals === "bigint" ? Number(rawDecimals) : rawDecimals;
  if (
    typeof numericDecimals !== "number" ||
    !Number.isInteger(numericDecimals) ||
    numericDecimals < 0 ||
    numericDecimals > 38
  ) {
    throw new Error("Token contract returned invalid decimals");
  }

  // Stellar's built-in Asset Contract reports "native" for Lumens (CAP-46-06);
  // display the standard ticker while preserving issued asset codes as-is.
  const trimmedSymbol = rawSymbol.trim();
  const symbol = trimmedSymbol === "native" ? "XLM" : trimmedSymbol;
  const trimmedName = typeof rawName === "string" ? rawName.trim() : "";
  const name =
    trimmedName.length === 0
      ? symbol
      : trimmedName === "native"
        ? "Stellar Lumens"
        : trimmedName;

  return { symbol, decimals: numericDecimals, name };
}

/// Simulates `symbol()`, `decimals()`, and `name()` against a token contract
/// via the `stellar-sdk` `contract.Client` and the SAC spec.
export async function readSacTokenMetadata(
  contractId: string,
): Promise<TokenMetadata> {
  const client = new contract.Client(SAC_METADATA_SPEC, {
    contractId,
    rpcUrl: env.rpcUrl,
    networkPassphrase: env.networkPassphrase,
  }) as contract.Client & SacTokenClient;

  const [symbolTx, decimalsTx, nameTx] = await Promise.all([
    client.symbol(),
    client.decimals(),
    client.name(),
  ]);

  return normalizeTokenMetadata({
    symbol: symbolTx.result,
    decimals: decimalsTx.result,
    name: nameTx.result,
  });
}

/// Resolves `{ symbol, decimals, name }` for `contractId`, memoised in memory
/// per contract address. Falls back to `env` defaults with a console warning
/// when the contract cannot be read.
export async function resolveTokenMetadata(
  contractId: string,
  reader: TokenMetadataReader = readSacTokenMetadata,
): Promise<TokenMetadata> {
  const key = contractId.trim();
  if (!key) {
    const fb = fallbackTokenMetadata();
    console.warn(
      "[tuitio] Empty token contract address; using fallback token metadata.",
    );
    return fb;
  }

  const cached = metadataCache.get(key);
  if (cached) return cached;

  const pending = (async (): Promise<TokenMetadata> => {
    try {
      return await reader(key);
    } catch (error) {
      console.warn(
        `[tuitio] Failed to discover token metadata for ${key}; falling back to env defaults.`,
        error,
      );
      return fallbackTokenMetadata();
    }
  })();

  metadataCache.set(key, pending);
  return pending;
}

/// React `cache`-wrapped accessor for Server Components rendering multiple
/// grants that share a token contract within the same request.
export const getTokenMetadata = cache((contractId: string) =>
  resolveTokenMetadata(contractId),
);

/// Clears the in-memory token metadata cache (intended for unit tests).
export function clearTokenMetadataCache(): void {
  metadataCache.clear();
}

// ----- Pure formatting layer (decoupled from network reads & React) ----------

/// Formats a smallest-unit integer amount using resolved token metadata.
export function formatTokenAmount(
  amount: number,
  metadata: Pick<TokenMetadata, "decimals" | "symbol">,
): string {
  return formatAmount(amount, metadata.decimals, metadata.symbol);
}

/// Converts a human-readable token input (e.g. `"50"` or `12.5`) into the
/// token's smallest unit as a `bigint` suitable for contract calls.
export function toSmallestUnit(
  wholeTokens: string | number,
  metadata: Pick<TokenMetadata, "decimals">,
): bigint {
  const parsed = typeof wholeTokens === "number" ? wholeTokens : Number(wholeTokens);
  if (!Number.isFinite(parsed) || parsed <= 0) return BigInt(0);
  return BigInt(Math.round(parsed * 10 ** metadata.decimals));
}

/// Decimal `<input type="number" step=...>` string matching a token's precision.
export function tokenInputStep(metadata: Pick<TokenMetadata, "decimals">): string {
  if (metadata.decimals <= 0) return "1";
  const capped = Math.min(metadata.decimals, 18);
  return `0.${"0".repeat(capped - 1)}1`;
}

/// Sums smallest-unit amounts per token contract and formats each bucket with
/// its own `{ decimals, symbol }`, avoiding cross-token precision bugs when a
/// portfolio spans multiple assets.
export function formatTokenTotals(
  items: ReadonlyArray<{ token: string; amount: number }>,
  metadataByToken: ReadonlyMap<string, Pick<TokenMetadata, "decimals" | "symbol">> | Record<string, Pick<TokenMetadata, "decimals" | "symbol">>,
  fallback: Pick<TokenMetadata, "decimals" | "symbol"> = fallbackTokenMetadata(),
): string {
  if (items.length === 0) {
    return formatTokenAmount(0, fallback);
  }

  const lookup = (token: string): Pick<TokenMetadata, "decimals" | "symbol"> => {
    if ("get" in metadataByToken && typeof metadataByToken.get === "function") {
      return metadataByToken.get(token) ?? fallback;
    }
    return (metadataByToken as Record<string, Pick<TokenMetadata, "decimals" | "symbol">>)[token] ?? fallback;
  };

  const totals = new Map<string, number>();
  for (const item of items) {
    totals.set(item.token, (totals.get(item.token) ?? 0) + item.amount);
  }

  const entries = Array.from(totals.entries());
  const nonZero = entries.filter(([, total]) => total !== 0);
  const visible = nonZero.length > 0 ? nonZero : [entries[0]];

  return visible
    .map(([token, total]) => formatTokenAmount(total, lookup(token)))
    .join(" · ");
}
