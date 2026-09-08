// Centralised runtime environment for client and server components.
export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080",
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL ?? "https://soroban-testnet.stellar.org",
  networkPassphrase:
    process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ??
    "Test SDF Network ; September 2015",
  registryContract:
    process.env.NEXT_PUBLIC_REGISTRY_CONTRACT ??
    "CD2INHSYNIQTVWM222CNSS7MN4MJSOBZOXVEWY3SOAK6MHICCZIEVQWV",
  escrowContract:
    process.env.NEXT_PUBLIC_ESCROW_CONTRACT ??
    "CDV7FA3QJPBR7LORHCZCZG6UCRL7DMXVMZYRDLMW7EXUNBMN7SEXINXW",
  tokenContract:
    process.env.NEXT_PUBLIC_TOKEN_CONTRACT ??
    "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  tokenSymbol: process.env.NEXT_PUBLIC_TOKEN_SYMBOL ?? "XLM",
  tokenDecimals: Number(process.env.NEXT_PUBLIC_TOKEN_DECIMALS ?? 7),
} as const;
