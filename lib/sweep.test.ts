import { describe, it, expect, vi } from "vitest";
import { contract } from "@stellar/stellar-sdk";
import type { Grant, Term } from "./api";
import {
  MAX_SWEEP_BATCH,
  isGrantDue,
  dueGrantIds,
  fetchDueGrantIds,
  chunkGrantIds,
  unwrapSweepCount,
  summarizeSweepBatches,
} from "./sweep";

const NOW_SEC = 1_760_000_000;

function makeGrant(overrides: Partial<Grant> = {}): Grant {
  return {
    grant_id: 1,
    sponsor: "GSPONSOR",
    beneficiary: "GSTUDENT",
    institution: "GSCHOOL",
    token: "CTOKEN",
    term_amount: 10_000_000,
    terms_total: 4,
    next_term: 0,
    status: "active",
    created_at: NOW_SEC - 86_400 * 10,
    locked_amount: 40_000_000,
    ...overrides,
  };
}

function makeTerm(overrides: Partial<Term> = {}): Term {
  return {
    grant_id: 1,
    term_index: 0,
    status: "attested",
    attested_at: NOW_SEC - 86_400 * 8,
    release_after: NOW_SEC - 3_600,
    ...overrides,
  };
}

describe("isGrantDue and dueGrantIds", () => {
  it("marks an active grant due when next_term is attested and release_after has passed", () => {
    const grant = makeGrant({ grant_id: 7, next_term: 1 });
    const terms = [
      makeTerm({ grant_id: 7, term_index: 0, status: "released" }),
      makeTerm({ grant_id: 7, term_index: 1, status: "attested", release_after: NOW_SEC - 1 }),
    ];

    expect(isGrantDue(grant, terms, NOW_SEC)).toBe(true);
    expect(dueGrantIds([{ grant, terms }], NOW_SEC)).toEqual([7]);
  });

  it("treats the exact release_after timestamp as due, matching the contract boundary", () => {
    const grant = makeGrant({ grant_id: 3 });
    const terms = [makeTerm({ grant_id: 3, release_after: NOW_SEC })];

    expect(isGrantDue(grant, terms, NOW_SEC)).toBe(true);
  });

  it("skips attested terms whose dispute window is still open", () => {
    const grant = makeGrant({ grant_id: 4 });
    const terms = [makeTerm({ grant_id: 4, release_after: NOW_SEC + 60 })];

    expect(isGrantDue(grant, terms, NOW_SEC)).toBe(false);
  });

  it("skips non-active grants and non-attested term statuses", () => {
    const dueTerm = [makeTerm({ release_after: NOW_SEC - 100 })];

    expect(isGrantDue(makeGrant({ status: "completed" }), dueTerm, NOW_SEC)).toBe(false);
    expect(isGrantDue(makeGrant({ status: "cancelled" }), dueTerm, NOW_SEC)).toBe(false);

    for (const status of ["pending", "disputed", "released", "refunded"]) {
      expect(
        isGrantDue(makeGrant(), [makeTerm({ status, release_after: NOW_SEC - 100 })], NOW_SEC),
      ).toBe(false);
    }
  });

  it("guards against unset release_after timestamps and out-of-range next_term", () => {
    expect(isGrantDue(makeGrant(), [makeTerm({ release_after: 0 })], NOW_SEC)).toBe(false);
    expect(
      isGrantDue(makeGrant({ next_term: 4, terms_total: 4 }), [makeTerm({ term_index: 4 })], NOW_SEC),
    ).toBe(false);
  });

  it("matches next_term by term_index even when API terms arrive out of order and deduplicates IDs", () => {
    const grant = makeGrant({ grant_id: 11, next_term: 2, terms_total: 3 });
    const terms = [
      makeTerm({ grant_id: 11, term_index: 2, status: "attested", release_after: NOW_SEC - 10 }),
      makeTerm({ grant_id: 11, term_index: 0, status: "released" }),
    ];

    expect(
      dueGrantIds(
        [
          { grant, terms },
          { grant, terms },
        ],
        NOW_SEC,
      ),
    ).toEqual([11]);
  });
});

describe("fetchDueGrantIds", () => {
  it("queries active grants and tolerates a failing per-grant terms lookup", async () => {
    const client = {
      grants: vi.fn().mockResolvedValue([
        makeGrant({ grant_id: 1 }),
        makeGrant({ grant_id: 2 }),
        makeGrant({ grant_id: 3 }),
      ]),
      terms: vi.fn().mockImplementation(async (id: number) => {
        if (id === 1) return [makeTerm({ grant_id: 1, release_after: NOW_SEC - 5 })];
        if (id === 2) throw new Error("API /api/grants/2/terms: 502");
        return [makeTerm({ grant_id: 3, release_after: NOW_SEC + 500 })];
      }),
    };

    await expect(fetchDueGrantIds(NOW_SEC, client)).resolves.toEqual([1]);
    expect(client.grants).toHaveBeenCalledWith({ status: "active" });
  });
});

describe("chunkGrantIds", () => {
  it("caps batches at 20 grants to match the contract MAX_SWEEP limit", () => {
    expect(MAX_SWEEP_BATCH).toBe(20);
    expect(chunkGrantIds([])).toEqual([]);

    const twenty = Array.from({ length: 20 }, (_, i) => i + 1);
    expect(chunkGrantIds(twenty)).toEqual([twenty]);

    const fortyFive = Array.from({ length: 45 }, (_, i) => i + 1);
    const chunks = chunkGrantIds(fortyFive);
    expect(chunks.map((c) => c.length)).toEqual([20, 20, 5]);
    expect(chunks.flat()).toEqual(fortyFive);
  });

  it("rejects non-positive or non-integer batch sizes", () => {
    expect(() => chunkGrantIds([1, 2], 0)).toThrow(RangeError);
    expect(() => chunkGrantIds([1, 2], -5)).toThrow(RangeError);
    expect(() => chunkGrantIds([1, 2], 2.5)).toThrow(RangeError);
  });
});

describe("unwrapSweepCount", () => {
  it("unwraps stellar-sdk Ok<number> results as well as plain numbers and bigints", () => {
    expect(unwrapSweepCount(new contract.Ok(4))).toBe(4);
    expect(unwrapSweepCount(0)).toBe(0);
    expect(unwrapSweepCount(BigInt(12))).toBe(12);
  });

  it("propagates contract Err results and rejects malformed values", () => {
    const err = new contract.Err({ message: "BatchTooLarge" });
    expect(() => unwrapSweepCount(err)).toThrow("BatchTooLarge");
    expect(() => unwrapSweepCount(-1)).toThrow("Unexpected sweep return value");
    expect(() => unwrapSweepCount(undefined)).toThrow("Unexpected sweep return value");
  });
});

describe("summarizeSweepBatches", () => {
  it("computes settled versus skipped terms across multiple batches", () => {
    const summary = summarizeSweepBatches([
      { requested: 20, settled: 18, txHash: "hash1" },
      { requested: 5, settled: 4, txHash: "hash2" },
    ]);

    expect(summary).toEqual({
      requested: 25,
      settled: 22,
      skipped: 3,
      txHashes: ["hash1", "hash2"],
    });
  });

  it("rejects impossible batch counts where settled exceeds requested", () => {
    expect(() => summarizeSweepBatches([{ requested: 3, settled: 4 }])).toThrow(RangeError);
    expect(() => summarizeSweepBatches([{ requested: -1, settled: 0 }])).toThrow(RangeError);
  });
});
