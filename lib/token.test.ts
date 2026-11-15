import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { contract } from "@stellar/stellar-sdk";
import {
  SAC_METADATA_SPEC,
  clearTokenMetadataCache,
  fallbackTokenMetadata,
  formatTokenAmount,
  formatTokenTotals,
  normalizeTokenMetadata,
  resolveTokenMetadata,
  tokenInputStep,
  toSmallestUnit,
} from "./token";

const USDC_CONTRACT = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
const EURC_CONTRACT = "CCU3B3W7X6PBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDA";

beforeEach(() => {
  clearTokenMetadataCache();
});

afterEach(() => {
  clearTokenMetadataCache();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("SAC_METADATA_SPEC", () => {
  it("exposes the SEP-41 name, symbol, and decimals functions", () => {
    const names = SAC_METADATA_SPEC.funcs().map((fn) => fn.name.toString()).sort();
    expect(names).toEqual(["decimals", "name", "symbol"]);
  });
});

describe("normalizeTokenMetadata", () => {
  it("accepts standard SEP-41 metadata and trims surrounding whitespace", () => {
    expect(
      normalizeTokenMetadata({
        symbol: " USDC ",
        decimals: 6,
        name: " USD Coin ",
      }),
    ).toEqual({
      symbol: "USDC",
      decimals: 6,
      name: "USD Coin",
    });
  });

  it("maps Stellar's native SAC 'native' identifier to XLM", () => {
    expect(
      normalizeTokenMetadata({
        symbol: "native",
        decimals: 7,
        name: "native",
      }),
    ).toEqual({
      symbol: "XLM",
      decimals: 7,
      name: "Stellar Lumens",
    });
  });

  it("unwraps stellar-sdk Ok results for custom SEP-41 contracts", () => {
    expect(
      normalizeTokenMetadata({
        symbol: new contract.Ok("EURC"),
        decimals: new contract.Ok(6),
        name: new contract.Ok("Euro Coin"),
      }),
    ).toEqual({
      symbol: "EURC",
      decimals: 6,
      name: "Euro Coin",
    });
  });

  it("rejects empty symbols and out-of-range decimals", () => {
    expect(() =>
      normalizeTokenMetadata({ symbol: "   ", decimals: 6, name: "Bad" }),
    ).toThrow("symbol");
    expect(() =>
      normalizeTokenMetadata({ symbol: "USDC", decimals: -1, name: "Bad" }),
    ).toThrow("decimals");
    expect(() =>
      normalizeTokenMetadata({ symbol: "USDC", decimals: 6.5, name: "Bad" }),
    ).toThrow("decimals");
  });
});

describe("resolveTokenMetadata", () => {
  it("resolves metadata per contract and memoises concurrent and repeat calls", async () => {
    const reader = vi.fn().mockImplementation(async (id: string) =>
      id === USDC_CONTRACT
        ? { symbol: "USDC", decimals: 6, name: "USD Coin" }
        : { symbol: "EURC", decimals: 6, name: "Euro Coin" },
    );

    const [first, second, other] = await Promise.all([
      resolveTokenMetadata(USDC_CONTRACT, reader),
      resolveTokenMetadata(`  ${USDC_CONTRACT}  `, reader),
      resolveTokenMetadata(EURC_CONTRACT, reader),
    ]);

    expect(first).toEqual({ symbol: "USDC", decimals: 6, name: "USD Coin" });
    expect(second).toEqual(first);
    expect(other).toEqual({ symbol: "EURC", decimals: 6, name: "Euro Coin" });
    expect(reader).toHaveBeenCalledTimes(2);
  });

  it("falls back to env defaults and logs a console warning when reading fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const reader = vi.fn().mockRejectedValue(new Error("RPC 503"));

    const resolved = await resolveTokenMetadata(USDC_CONTRACT, reader);

    expect(resolved).toEqual(fallbackTokenMetadata());
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain(USDC_CONTRACT);
  });

  it("warns and returns fallback metadata for an empty contract address", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const reader = vi.fn();

    const resolved = await resolveTokenMetadata("   ", reader);

    expect(resolved).toEqual(fallbackTokenMetadata());
    expect(reader).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledOnce();
  });
});

describe("pure formatting helpers", () => {
  const usdc = { symbol: "USDC", decimals: 6 };
  const xlm = { symbol: "XLM", decimals: 7 };

  it("formats smallest-unit amounts using resolved decimals and symbol", () => {
    expect(formatTokenAmount(25_500_000, usdc)).toBe("25.5 USDC");
    expect(formatTokenAmount(50_000_000, xlm)).toBe("5 XLM");
  });

  it("converts whole-token inputs to smallest-unit bigints and step strings", () => {
    expect(toSmallestUnit("50", usdc)).toBe(BigInt(50_000_000));
    expect(toSmallestUnit("1.25", usdc)).toBe(BigInt(1_250_000));
    expect(toSmallestUnit("", usdc)).toBe(BigInt(0));
    expect(toSmallestUnit("-3", usdc)).toBe(BigInt(0));

    expect(tokenInputStep(usdc)).toBe("0.000001");
    expect(tokenInputStep(xlm)).toBe("0.0000001");
    expect(tokenInputStep({ decimals: 0 })).toBe("1");
  });

  it("groups multi-token portfolio totals per token instead of mixing decimal scales", () => {
    const map = new Map([
      [USDC_CONTRACT, usdc],
      [EURC_CONTRACT, { symbol: "EURC", decimals: 2 }],
    ]);

    expect(
      formatTokenTotals(
        [
          { token: USDC_CONTRACT, amount: 100_000_000 },
          { token: USDC_CONTRACT, amount: 50_000_000 },
          { token: EURC_CONTRACT, amount: 12_345 },
        ],
        map,
        xlm,
      ),
    ).toBe("150 USDC · 123.45 EURC");
  });

  it("uses fallback metadata when no items or no entry exists for a token", () => {
    expect(formatTokenTotals([], {}, xlm)).toBe("0 XLM");
    expect(
      formatTokenTotals([{ token: "CUNKNOWN", amount: 10_000_000 }], {}, xlm),
    ).toBe("1 XLM");
  });
});
