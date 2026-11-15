function parseTokenDecimals(raw: string | undefined, fallback = 7): number {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return fallback;
  }
  if (!/^\d+$/.test(trimmed)) {
    throw new RangeError(
      `Invalid NEXT_PUBLIC_TOKEN_DECIMALS "${raw}": expected a non-negative integer`,
    );
  }
  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed > 38) {
    throw new RangeError(
      `Invalid NEXT_PUBLIC_TOKEN_DECIMALS "${raw}": value out of supported decimal range`,
    );
  }
  return parsed;
}

// Centralised runtime environment for client and server components.
// Empty strings (e.g. bare `KEY=` entries in .env or blank dashboard vars)
// fall through to defaults via `||` since none of these settings have a valid
// empty-string representation.
export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:8080",
  rpcUrl:
    process.env.NEXT_PUBLIC_RPC_URL?.trim() ||
    "https://soroban-testnet.stellar.org",
  networkPassphrase:
    process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE?.trim() ||
    "Test SDF Network ; September 2015",
  registryContract:
    process.env.NEXT_PUBLIC_REGISTRY_CONTRACT?.trim() ||
    "CCTZVSPMIYEA4X2Z6UP5IPIO2HBIZWHLV37OUDBV32YUCP64JNIPBCPO",
  escrowContract:
    process.env.NEXT_PUBLIC_ESCROW_CONTRACT?.trim() ||
    "CDPGTHO2O7LTURTJF7L7ZZZTZCXPNABAPGVRDMBYIJ737R6O3DOPWJ34",
  tokenContract:
    process.env.NEXT_PUBLIC_TOKEN_CONTRACT?.trim() ||
    "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  tokenSymbol: process.env.NEXT_PUBLIC_TOKEN_SYMBOL?.trim() || "XLM",
  tokenDecimals: parseTokenDecimals(process.env.NEXT_PUBLIC_TOKEN_DECIMALS),
  // Base URL for linking a transaction hash to a block explorer. Configurable
  // because explorers change their routes and a dead link is worse than none.
  explorerTxBase:
    process.env.NEXT_PUBLIC_EXPLORER_TX_BASE?.trim() ||
    "https://stellar.expert/explorer/testnet/tx",
} as const;

/// Block-explorer URL for a transaction hash.
export function explorerTxUrl(hash: string): string {
  return `${env.explorerTxBase}/${hash}`;
}
