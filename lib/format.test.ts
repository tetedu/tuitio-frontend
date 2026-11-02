import { describe, it, expect } from "vitest";
import {
  shortAddress,
  formatAmount,
  formatTimestamp,
  countdownTo,
  TERM_STATUS_LABEL,
  TERM_STATUS_STYLE,
  GRANT_STATUS_LABEL,
} from "./format";

// A real testnet address, so the truncation assertions reflect what the UI
// actually renders rather than a convenient short string.
const ADDRESS = "GCTZVSPMIYEA4X2Z6UP5IPIO2HBIZWHLV37OUDBV32YUCP64JNIPBCPO";

// Intl output carries locale-dependent group and decimal separators. Reducing
// a formatted amount to its digits keeps these assertions meaningful on any
// runner, while still catching a wrong value.
const digitsOf = (s: string) => s.replace(/\D/g, "");

describe("shortAddress", () => {
  it("keeps the leading and trailing characters around an ellipsis", () => {
    expect(shortAddress(ADDRESS)).toBe("GCTZ…BCPO");
  });

  it("honours a custom size", () => {
    expect(shortAddress(ADDRESS, 6)).toBe("GCTZVS…IPBCPO");
  });

  it("returns short input untouched rather than padding it", () => {
    expect(shortAddress("GABC")).toBe("GABC");
  });

  it("does not truncate at the boundary, where truncating would not shorten", () => {
    // size*2 + 3 is the break-even point: 4 + 4 + an ellipsis is no shorter
    // than an 11-character string, so the function must leave it alone.
    const boundary = "12345678901"; // exactly 11 = 4*2 + 3
    expect(shortAddress(boundary)).toBe(boundary);
    expect(shortAddress(boundary + "2")).toBe("1234…9012");
  });
});

describe("formatAmount", () => {
  it("converts the smallest unit to whole tokens and appends the symbol", () => {
    expect(formatAmount(50_000_000, 7, "XLM")).toBe("5 XLM");
  });

  it("renders zero without a fractional tail", () => {
    expect(formatAmount(0, 7, "XLM")).toBe("0 XLM");
  });

  it("keeps a single stroop visible instead of rounding it away", () => {
    // Rounding this to "0 XLM" would make a non-empty escrow look empty.
    expect(formatAmount(1, 7, "XLM")).toBe("0.0000001 XLM");
  });

  it("groups thousands and keeps the fraction", () => {
    expect(digitsOf(formatAmount(12_345, 1, "T"))).toBe("12345");
  });

  it("respects a different decimal scale", () => {
    expect(formatAmount(12_345, 2, "USDC")).toBe("123.45 USDC");
  });

  // Known limitation, pinned deliberately. Contract amounts are i128; they
  // reach this function as JavaScript numbers, which are IEEE-754 doubles and
  // exact only to Number.MAX_SAFE_INTEGER (9,007,199,254,740,991).
  //
  // 92233720368547758 stroops is 9,223,372,036.8547758 XLM. The nearest double
  // to the input is 92233720368547760, and formatting it loses a further
  // significant digit, so the UI shows 9,223,372,036.854776 — the wrong
  // number, with no indication anything was approximated.
  //
  // Fixing this means carrying amounts as strings or bigints end to end,
  // including the backend's JSON, so it is tracked separately rather than
  // patched here. Update this test when that lands; it should start failing.
  it("loses precision on i128 amounts above Number.MAX_SAFE_INTEGER", () => {
    const stroops = 92_233_720_368_547_758;
    expect(stroops).toBeGreaterThan(Number.MAX_SAFE_INTEGER);

    const rendered = digitsOf(formatAmount(stroops, 7, "XLM"));

    expect(rendered).toBe("9223372036854776");
    expect(rendered).not.toBe("92233720368547758"); // the exact value
  });

  it("is exact at Number.MAX_SAFE_INTEGER", () => {
    expect(digitsOf(formatAmount(Number.MAX_SAFE_INTEGER, 0, "X"))).toBe(
      String(Number.MAX_SAFE_INTEGER),
    );
  });
});

describe("formatTimestamp", () => {
  it("renders an em dash for an unset timestamp", () => {
    // Terms that have never been attested carry 0, and "1 Jan 1970" would
    // read as a real date.
    expect(formatTimestamp(0)).toBe("—");
  });

  it("renders a real timestamp as a date string", () => {
    const out = formatTimestamp(1_760_000_000);
    expect(out).not.toBe("—");
    // Locale and time zone vary by runner, so assert the year is present
    // rather than an exact format.
    expect(out).toContain("2025");
  });
});

describe("countdownTo", () => {
  const now = 1_700_000_000_000; // fixed, so these never depend on the clock
  const at = (offsetMs: number) => countdownTo((now + offsetMs) / 1000, now);

  it("returns null for an unset deadline", () => {
    expect(countdownTo(0, now)).toBeNull();
  });

  it("returns null once the deadline has passed", () => {
    expect(at(-1)).toBeNull();
  });

  it("returns null exactly at the deadline, so the UI switches immediately", () => {
    // The dispute window closing is what makes a term releasable; a countdown
    // still showing at the boundary would contradict the release button.
    expect(at(0)).toBeNull();
  });

  it("describes anything under a minute without a number", () => {
    expect(at(1_000)).toBe("under a minute");
    expect(at(59_000)).toBe("under a minute");
  });

  it("switches to minutes at exactly one minute", () => {
    expect(at(60_000)).toBe("1m");
  });

  it("shows minutes below an hour", () => {
    expect(at(45 * 60_000)).toBe("45m");
  });

  it("shows hours and minutes below a day", () => {
    expect(at((2 * 60 + 30) * 60_000)).toBe("2h 30m");
  });

  it("shows a whole hour without dropping the minute field", () => {
    expect(at(60 * 60_000)).toBe("1h 0m");
  });

  it("switches to days and hours at exactly one day", () => {
    expect(at(24 * 60 * 60_000)).toBe("1d 0h");
  });

  it("shows days and hours for a full dispute window", () => {
    // 7 days is the testnet dispute window, so this is the common case.
    expect(at(7 * 24 * 60 * 60_000)).toBe("7d 0h");
    expect(at((7 * 24 + 3) * 60 * 60_000)).toBe("7d 3h");
  });

  it("drops minutes once days are shown, rather than rendering three units", () => {
    expect(at((24 * 60 + 90) * 60_000)).toBe("1d 1h");
  });
});

describe("status label maps", () => {
  // A status with a label but no style renders unstyled, which in practice
  // means a disputed term that looks identical to a healthy one.
  it("styles every term status it labels", () => {
    expect(Object.keys(TERM_STATUS_STYLE).sort()).toEqual(Object.keys(TERM_STATUS_LABEL).sort());
  });

  it("covers every term status the contract can report", () => {
    expect(Object.keys(TERM_STATUS_LABEL).sort()).toEqual(
      ["attested", "disputed", "pending", "refunded", "released"].sort(),
    );
  });

  it("covers every grant status the contract can report", () => {
    expect(Object.keys(GRANT_STATUS_LABEL).sort()).toEqual(
      ["active", "cancelled", "completed"].sort(),
    );
  });
});
