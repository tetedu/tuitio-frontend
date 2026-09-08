// Typed client for the tuitio-backend REST API. Used by server components;
// the backend URL is public because every endpoint is read-only.

import { env } from "./env";

export interface Institution {
  address: string;
  payout: string;
  name: string;
  country: string;
  status: string;
  registered_at: number;
}

export interface Grant {
  grant_id: number;
  sponsor: string;
  beneficiary: string;
  institution: string;
  token: string;
  term_amount: number;
  terms_total: number;
  next_term: number;
  status: string;
  created_at: number;
  locked_amount: number;
}

export interface Term {
  grant_id: number;
  term_index: number;
  status: string;
  attested_at: number;
  release_after: number;
}

export interface Activity {
  ledger: number;
  tx_hash: string;
  contract: string;
  event: string;
  payload: Record<string, unknown>;
  seen_at: string;
}

export interface Stats {
  institutions_total: number;
  institutions_live: number;
  grants_total: number;
  grants_active: number;
  terms_released: number;
  terms_disputed: number;
  terms_refunded: number;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${env.apiUrl}${path}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`API ${path}: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  stats: () => get<Stats>("/api/stats"),
  institutions: () => get<Institution[]>("/api/institutions"),
  institution: (address: string) => get<Institution>(`/api/institutions/${address}`),
  grants: (filters: { sponsor?: string; institution?: string; status?: string } = {}) => {
    const q = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => v) as [string, string][],
    );
    const suffix = q.size > 0 ? `?${q}` : "";
    return get<Grant[]>(`/api/grants${suffix}`);
  },
  grant: (id: number) => get<Grant>(`/api/grants/${id}`),
  terms: (id: number) => get<Term[]>(`/api/grants/${id}/terms`),
  activity: (limit = 20) => get<Activity[]>(`/api/activity?limit=${limit}`),
};
