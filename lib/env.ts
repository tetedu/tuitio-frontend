// Centralised runtime environment for client and server components.
export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080",
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL ?? "https://soroban-testnet.stellar.org",
  networkPassphrase:
    process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ??
    "Test SDF Network ; September 2015",
  registryContract:
    process.env.NEXT_PUBLIC_REGISTRY_CONTRACT ??
    "CCTZVSPMIYEA4X2Z6UP5IPIO2HBIZWHLV37OUDBV32YUCP64JNIPBCPO",
  escrowContract:
    process.env.NEXT_PUBLIC_ESCROW_CONTRACT ??
    "CDPGTHO2O7LTURTJF7L7ZZZTZCXPNABAPGVRDMBYIJ737R6O3DOPWJ34",
  tokenContract:
    process.env.NEXT_PUBLIC_TOKEN_CONTRACT ??
    "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  tokenSymbol: process.env.NEXT_PUBLIC_TOKEN_SYMBOL ?? "XLM",
  tokenDecimals: Number(process.env.NEXT_PUBLIC_TOKEN_DECIMALS ?? 7),
  // Base URL for linking a transaction hash to a block explorer. Configurable
  // because explorers change their routes and a dead link is worse than none.
  explorerTxBase:
    process.env.NEXT_PUBLIC_EXPLORER_TX_BASE ??
    "https://stellar.expert/explorer/testnet/tx",
} as const;

/// Block-explorer URL for a transaction hash.
export function explorerTxUrl(hash: string): string {
  return `${env.explorerTxBase}/${hash}`;
}
