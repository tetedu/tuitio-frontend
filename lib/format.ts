// Formatting helpers shared across pages and components.

export function shortAddress(address: string, size = 4): string {
  if (address.length <= size * 2 + 3) return address;
  return `${address.slice(0, size)}…${address.slice(-size)}`;
}

// Contract amounts are integers in the token's smallest unit.
export function formatAmount(amount: number, decimals: number, symbol: string): string {
  const value = amount / 10 ** decimals;
  return `${value.toLocaleString(undefined, { maximumFractionDigits: decimals })} ${symbol}`;
}

export function formatTimestamp(seconds: number): string {
  if (!seconds) return "—";
  return new Date(seconds * 1000).toLocaleString();
}

export const GRANT_STATUS_LABEL: Record<string, string> = {
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const TERM_STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting attestation",
  attested: "Attested — dispute window open",
  disputed: "Disputed — awaiting resolution",
  released: "Released to institution",
  refunded: "Refunded to sponsor",
};

export const TERM_STATUS_STYLE: Record<string, string> = {
  pending: "bg-neutral-800 text-neutral-300",
  attested: "bg-amber-500/15 text-amber-300",
  disputed: "bg-red-500/15 text-red-300",
  released: "bg-emerald-500/15 text-emerald-300",
  refunded: "bg-sky-500/15 text-sky-300",
};
