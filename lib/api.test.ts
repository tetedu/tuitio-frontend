import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api } from "./api";

/** Installs a fetch stub that resolves with `body` and returns the spy. */
function mockFetch(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const spy = vi.fn().mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  });
  vi.stubGlobal("fetch", spy);
  return spy;
}

/** The path requested, with the base URL stripped. */
function requestedPath(spy: ReturnType<typeof vi.fn>): string {
  return String(spy.mock.calls[0][0]);
}

beforeEach(() => {
  // These tests exercise the server-side branch, which reads the backend URL
  // from the environment. Pin it so assertions do not depend on a developer's
  // local .env.
  vi.stubEnv("API_URL", "http://backend.test");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("request handling", () => {
  it("returns the decoded body on success", async () => {
    const stats = { institutions_total: 3, grants_active: 2 };
    mockFetch(stats);
    await expect(api.stats()).resolves.toEqual(stats);
  });

  it("asks for a fresh response rather than a cached one", async () => {
    // These endpoints back a UI that polls after every transaction, so a
    // cached response would show a user their own write as not having landed.
    const spy = mockFetch([]);
    await api.institutions();
    expect(spy.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
  });

  it("throws on a non-2xx response, naming the path and status", async () => {
    mockFetch(null, { ok: false, status: 503 });
    await expect(api.stats()).rejects.toThrow("API /api/stats: 503");
  });

  it("throws on a 404 rather than resolving undefined", async () => {
    // A missing grant must not reach a component as an empty object.
    mockFetch(null, { ok: false, status: 404 });
    await expect(api.grant(7)).rejects.toThrow("API /api/grants/7: 404");
  });

  it("propagates a network failure", async () => {
    const spy = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", spy);
    await expect(api.stats()).rejects.toThrow("fetch failed");
  });

  it("propagates a malformed body", async () => {
    // A 200 carrying HTML — what a proxy error page looks like — must fail
    // loudly rather than yield a half-built object.
    const spy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token <");
      },
    });
    vi.stubGlobal("fetch", spy);
    await expect(api.stats()).rejects.toThrow("Unexpected token <");
  });
});

describe("base URL selection", () => {
  it("uses the configured backend URL on the server", async () => {
    const spy = mockFetch({});
    await api.stats();
    expect(requestedPath(spy)).toBe("http://backend.test/api/stats");
  });

  it("falls back to the public URL when API_URL is absent", async () => {
    vi.stubEnv("API_URL", undefined);
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://public.test");
    const spy = mockFetch({});
    await api.stats();
    expect(requestedPath(spy)).toBe("http://public.test/api/stats");
  });

  it("falls back to localhost when neither URL is configured", async () => {
    vi.stubEnv("API_URL", undefined);
    vi.stubEnv("NEXT_PUBLIC_API_URL", undefined);
    const spy = mockFetch({});
    await api.stats();
    expect(requestedPath(spy)).toBe("http://127.0.0.1:8080/api/stats");
  });

  // Known defect, pinned deliberately. baseUrl() chains with ??, which only
  // falls through on null and undefined — an empty string is a value. A
  // deploy platform that declares API_URL without giving it a value therefore
  // produces "", and the server-side branch builds a relative URL. There is
  // no origin to resolve it against outside a browser, so every server
  // component's fetch fails at once.
  //
  // Changing ?? to || in baseUrl() fixes it. Tracked separately rather than
  // changed here, since this PR is meant to add tests, not behaviour. Update
  // this test when that lands; it should start failing.
  it("treats an empty API_URL as a value, yielding an unusable relative URL", async () => {
    vi.stubEnv("API_URL", "");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://public.test");
    const spy = mockFetch({});
    await api.stats();
    expect(requestedPath(spy)).toBe("/api/stats");
  });

  it("uses a same-origin relative path in the browser", async () => {
    // In the browser the request goes through the app/api/[...path] proxy, so
    // it must stay relative regardless of what the server-side env says.
    vi.stubGlobal("window", {});
    const spy = mockFetch({});
    await api.stats();
    expect(requestedPath(spy)).toBe("/api/stats");
  });
});

describe("path and query construction", () => {
  it("omits the query string entirely when no filters are given", async () => {
    const spy = mockFetch([]);
    await api.grants();
    expect(requestedPath(spy)).toBe("http://backend.test/api/grants");
  });

  it("sends only the filters that have values", async () => {
    const spy = mockFetch([]);
    await api.grants({ sponsor: "GSPONSOR", institution: "", status: "active" });
    const url = new URL(requestedPath(spy));
    expect(url.pathname).toBe("/api/grants");
    expect(url.searchParams.get("sponsor")).toBe("GSPONSOR");
    expect(url.searchParams.get("status")).toBe("active");
    // An empty filter must be dropped, not sent as institution= — the API
    // treats an empty value as "no filter", but only if it is absent.
    expect(url.searchParams.has("institution")).toBe(false);
  });

  it("drops a filter object whose every value is empty", async () => {
    const spy = mockFetch([]);
    await api.grants({ sponsor: "", institution: "", status: "" });
    expect(requestedPath(spy)).toBe("http://backend.test/api/grants");
  });

  it("builds the nested terms path", async () => {
    const spy = mockFetch([]);
    await api.terms(42);
    expect(requestedPath(spy)).toBe("http://backend.test/api/grants/42/terms");
  });

  it("defaults the activity limit and allows overriding it", async () => {
    let spy = mockFetch([]);
    await api.activity();
    expect(requestedPath(spy)).toContain("/api/activity?limit=20");

    vi.unstubAllGlobals();
    spy = mockFetch([]);
    await api.activity(5);
    expect(requestedPath(spy)).toContain("/api/activity?limit=5");
  });

  it("interpolates an institution address into the path", async () => {
    const spy = mockFetch({});
    await api.institution("GSCHOOL");
    expect(requestedPath(spy)).toBe("http://backend.test/api/institutions/GSCHOOL");
  });
});
