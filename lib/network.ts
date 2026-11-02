// Stellar network identification, shared by the wallet provider and the
// mismatch banner.
//
// A transaction is signed for one specific network, named by its passphrase.
// Signing against the wrong one produces a transaction the network rejects,
// and the resulting error does not mention the network — so the mismatch has
// to be caught before the user signs anything.

/** Passphrases of the networks a user might plausibly have selected. */
export const NETWORK_LABELS: Record<string, string> = {
  "Test SDF Network ; September 2015": "Testnet",
  "Public Global Stellar Network ; September 2015": "Mainnet",
  "Test SDF Future Network ; October 2022": "Futurenet",
};

/**
 * Human-readable name for a network passphrase. Falls back to the passphrase
 * itself for a custom or standalone network, which is more useful than
 * "Unknown" when someone is running their own quickstart node.
 */
export function networkLabel(passphrase: string | null | undefined): string {
  if (!passphrase) return "unknown";
  return NETWORK_LABELS[passphrase] ?? passphrase;
}

/**
 * Whether the wallet's network differs from the one this deployment targets.
 *
 * Returns false when the wallet network is not known yet — on first render,
 * or when Freighter is absent or declined to answer. An unknown network is
 * not a mismatch: blocking writes on "we have not checked yet" would disable
 * the app for anyone whose wallet is slow to respond, and the signature
 * itself still fails safe.
 */
export function isNetworkMismatch(
  walletPassphrase: string | null | undefined,
  expectedPassphrase: string,
): boolean {
  if (!walletPassphrase) return false;
  return walletPassphrase !== expectedPassphrase;
}
