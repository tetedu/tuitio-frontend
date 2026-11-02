import { describe, it, expect } from "vitest";
import { networkLabel, isNetworkMismatch, NETWORK_LABELS } from "./network";

const TESTNET = "Test SDF Network ; September 2015";
const MAINNET = "Public Global Stellar Network ; September 2015";
const FUTURENET = "Test SDF Future Network ; October 2022";

describe("networkLabel", () => {
  it("names the networks a user is likely to be on", () => {
    expect(networkLabel(TESTNET)).toBe("Testnet");
    expect(networkLabel(MAINNET)).toBe("Mainnet");
    expect(networkLabel(FUTURENET)).toBe("Futurenet");
  });

  it("falls back to the passphrase for a custom network", () => {
    // More useful than "Unknown" for someone running a standalone node: it
    // tells them which passphrase their wallet is actually reporting.
    expect(networkLabel("Standalone Network ; February 2017")).toBe(
      "Standalone Network ; February 2017",
    );
  });

  it("describes an absent network as unknown", () => {
    expect(networkLabel(null)).toBe("unknown");
    expect(networkLabel(undefined)).toBe("unknown");
    expect(networkLabel("")).toBe("unknown");
  });

  it("distinguishes testnet from futurenet, which share a prefix", () => {
    // Both begin "Test SDF", so a prefix comparison would conflate them.
    expect(networkLabel(TESTNET)).not.toBe(networkLabel(FUTURENET));
  });
});

describe("isNetworkMismatch", () => {
  it("is false when the wallet is on the expected network", () => {
    expect(isNetworkMismatch(TESTNET, TESTNET)).toBe(false);
  });

  it("is true when the wallet is on a different network", () => {
    expect(isNetworkMismatch(MAINNET, TESTNET)).toBe(true);
    expect(isNetworkMismatch(FUTURENET, TESTNET)).toBe(true);
  });

  it("treats an unknown wallet network as not a mismatch", () => {
    // On first render, or when Freighter is absent or declines to answer, we
    // have no answer rather than a wrong one. Blocking writes here would
    // disable the app for a slow wallet, and signing still fails safe.
    expect(isNetworkMismatch(null, TESTNET)).toBe(false);
    expect(isNetworkMismatch(undefined, TESTNET)).toBe(false);
    expect(isNetworkMismatch("", TESTNET)).toBe(false);
  });

  it("compares exactly, not loosely", () => {
    // Whitespace and case differences are different networks, not the same
    // one typed differently.
    expect(isNetworkMismatch("test sdf network ; september 2015", TESTNET)).toBe(true);
    expect(isNetworkMismatch(TESTNET.trim() + " ", TESTNET)).toBe(true);
  });

  it("covers every labelled network as a possible mismatch source", () => {
    for (const passphrase of Object.keys(NETWORK_LABELS)) {
      expect(isNetworkMismatch(passphrase, MAINNET)).toBe(passphrase !== MAINNET);
    }
  });
});
