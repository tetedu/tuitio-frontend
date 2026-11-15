import { describe, it, expect, vi, afterEach } from "vitest";
import { env, explorerTxUrl } from "./env";

const ALL_STRING_KEYS: Array<{
  envVar: string;
  prop: keyof typeof env;
  defaultValue: string;
  sampleValue: string;
}> = [
  {
    envVar: "NEXT_PUBLIC_API_URL",
    prop: "apiUrl",
    defaultValue: "http://localhost:8080",
    sampleValue: "https://api.tuitio.example",
  },
  {
    envVar: "NEXT_PUBLIC_RPC_URL",
    prop: "rpcUrl",
    defaultValue: "https://soroban-testnet.stellar.org",
    sampleValue: "https://rpc.tuitio.example",
  },
  {
    envVar: "NEXT_PUBLIC_NETWORK_PASSPHRASE",
    prop: "networkPassphrase",
    defaultValue: "Test SDF Network ; September 2015",
    sampleValue: "Public Global Stellar Network ; September 2015",
  },
  {
    envVar: "NEXT_PUBLIC_REGISTRY_CONTRACT",
    prop: "registryContract",
    defaultValue: "CCTZVSPMIYEA4X2Z6UP5IPIO2HBIZWHLV37OUDBV32YUCP64JNIPBCPO",
    sampleValue: "CREGISTRYOVERRIDE",
  },
  {
    envVar: "NEXT_PUBLIC_ESCROW_CONTRACT",
    prop: "escrowContract",
    defaultValue: "CDPGTHO2O7LTURTJF7L7ZZZTZCXPNABAPGVRDMBYIJ737R6O3DOPWJ34",
    sampleValue: "CESCROWOVERRIDE",
  },
  {
    envVar: "NEXT_PUBLIC_TOKEN_CONTRACT",
    prop: "tokenContract",
    defaultValue: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
    sampleValue: "CTOKENOVERRIDE",
  },
  {
    envVar: "NEXT_PUBLIC_TOKEN_SYMBOL",
    prop: "tokenSymbol",
    defaultValue: "XLM",
    sampleValue: "USDC",
  },
  {
    envVar: "NEXT_PUBLIC_EXPLORER_TX_BASE",
    prop: "explorerTxBase",
    defaultValue: "https://stellar.expert/explorer/testnet/tx",
    sampleValue: "https://stellar.expert/explorer/public/tx",
  },
];

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("explorerTxUrl", () => {
  it("joins the configured explorer base to a transaction hash", () => {
    expect(explorerTxUrl("abc123")).toBe(`${env.explorerTxBase}/abc123`);
  });

  it("points at a testnet explorer by default", () => {
    expect(explorerTxUrl("abc123")).toBe(
      "https://stellar.expert/explorer/testnet/tx/abc123",
    );
  });
});

describe("defaults", () => {
  it("defaults to the deployed v0.2.0 testnet contracts when variables are unset", async () => {
    for (const { envVar } of ALL_STRING_KEYS) {
      vi.stubEnv(envVar, undefined);
    }
    vi.stubEnv("NEXT_PUBLIC_TOKEN_DECIMALS", undefined);
    vi.resetModules();

    const fresh = await import("./env");
    for (const { prop, defaultValue } of ALL_STRING_KEYS) {
      expect(fresh.env[prop]).toBe(defaultValue);
    }
    expect(fresh.env.tokenDecimals).toBe(7);
  });

  it("treats empty-string env variables as unset across every setting", async () => {
    for (const { envVar } of ALL_STRING_KEYS) {
      vi.stubEnv(envVar, "");
    }
    vi.stubEnv("NEXT_PUBLIC_TOKEN_DECIMALS", "");
    vi.resetModules();

    const fresh = await import("./env");
    for (const { prop, defaultValue } of ALL_STRING_KEYS) {
      expect(fresh.env[prop]).toBe(defaultValue);
    }
    expect(fresh.env.tokenDecimals).toBe(7);
  });

  it("defaults to the testnet network passphrase, not public", () => {
    expect(env.networkPassphrase).toBe("Test SDF Network ; September 2015");
  });

  it("defaults token decimals to 7, matching Stellar's stroop scale", () => {
    expect(env.tokenDecimals).toBe(7);
    expect(typeof env.tokenDecimals).toBe("number");
  });
});

describe("overrides", () => {
  it("reads configured non-empty values for every setting at module load", async () => {
    for (const { envVar, sampleValue } of ALL_STRING_KEYS) {
      vi.stubEnv(envVar, sampleValue);
    }
    vi.stubEnv("NEXT_PUBLIC_TOKEN_DECIMALS", "6");
    vi.resetModules();

    const fresh = await import("./env");
    for (const { prop, sampleValue } of ALL_STRING_KEYS) {
      expect(fresh.env[prop]).toBe(sampleValue);
    }
    expect(fresh.env.tokenDecimals).toBe(6);
  });

  it("accepts 0 decimals as a valid integer rather than falling back to 7", async () => {
    vi.stubEnv("NEXT_PUBLIC_TOKEN_DECIMALS", "0");
    vi.resetModules();

    const fresh = await import("./env");
    expect(fresh.env.tokenDecimals).toBe(0);
  });

  it("rejects non-numeric or negative tokenDecimals values at module load", async () => {
    vi.stubEnv("NEXT_PUBLIC_TOKEN_DECIMALS", "seven");
    vi.resetModules();
    await expect(import("./env")).rejects.toThrow(/Invalid NEXT_PUBLIC_TOKEN_DECIMALS/);

    vi.stubEnv("NEXT_PUBLIC_TOKEN_DECIMALS", "-2");
    vi.resetModules();
    await expect(import("./env")).rejects.toThrow(/Invalid NEXT_PUBLIC_TOKEN_DECIMALS/);

    vi.stubEnv("NEXT_PUBLIC_TOKEN_DECIMALS", "3.5");
    vi.resetModules();
    await expect(import("./env")).rejects.toThrow(/Invalid NEXT_PUBLIC_TOKEN_DECIMALS/);
  });
});
