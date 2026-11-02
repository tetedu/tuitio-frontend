import { describe, it, expect, vi, afterEach } from "vitest";
import { env, explorerTxUrl } from "./env";

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
  it("defaults to the deployed v0.2.0 testnet contracts", () => {
    // These are the addresses in SUBMISSION.md. If a redeploy changes them,
    // this test is the reminder that the frontend default moved too.
    expect(env.registryContract).toBe("CCTZVSPMIYEA4X2Z6UP5IPIO2HBIZWHLV37OUDBV32YUCP64JNIPBCPO");
    expect(env.escrowContract).toBe("CDPGTHO2O7LTURTJF7L7ZZZTZCXPNABAPGVRDMBYIJ737R6O3DOPWJ34");
  });

  it("defaults to the testnet network passphrase, not public", () => {
    // Signing against the wrong passphrase produces a transaction the network
    // rejects, with an error that does not mention the passphrase.
    expect(env.networkPassphrase).toBe("Test SDF Network ; September 2015");
  });

  it("defaults token decimals to 7, matching Stellar's stroop scale", () => {
    expect(env.tokenDecimals).toBe(7);
    expect(typeof env.tokenDecimals).toBe("number");
  });
});

describe("overrides", () => {
  it("reads configuration from the environment at module load", async () => {
    vi.stubEnv("NEXT_PUBLIC_ESCROW_CONTRACT", "COVERRIDE");
    vi.stubEnv("NEXT_PUBLIC_TOKEN_SYMBOL", "USDC");
    vi.stubEnv("NEXT_PUBLIC_TOKEN_DECIMALS", "6");
    vi.resetModules();

    const fresh = await import("./env");

    expect(fresh.env.escrowContract).toBe("COVERRIDE");
    expect(fresh.env.tokenSymbol).toBe("USDC");
    expect(fresh.env.tokenDecimals).toBe(6);
  });

  // Known sharp edge, pinned deliberately. tokenDecimals goes through
  // Number() with no validation, so a typo produces NaN rather than a
  // startup failure. Every amount then renders as "NaN XLM", because
  // 10 ** NaN is NaN. Worth validating at load, but that is a behaviour
  // change rather than a test.
  it("yields NaN for a non-numeric decimals value instead of rejecting it", async () => {
    vi.stubEnv("NEXT_PUBLIC_TOKEN_DECIMALS", "seven");
    vi.resetModules();

    const fresh = await import("./env");

    expect(Number.isNaN(fresh.env.tokenDecimals)).toBe(true);
  });
});
