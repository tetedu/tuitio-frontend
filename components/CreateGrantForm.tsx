"use client";

// Sponsor flow: fund a grant for one term of tuition. The full commitment
// (per-term amount x terms) transfers into escrow on submission.

import { useEffect, useState } from "react";
import { useWallet, freighterSigner } from "./WalletProvider";
import { escrowClient } from "@/lib/contracts";
import { api, type Institution } from "@/lib/api";
import { env } from "@/lib/env";
import { formatAmount } from "@/lib/format";

export function CreateGrantForm() {
  const { address, connecting } = useWallet();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [institution, setInstitution] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [termAmount, setTermAmount] = useState("50");
  const [termsTotal, setTermsTotal] = useState("3");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    api
      .institutions()
      .then((list) => {
        const live = list.filter((i) => i.status === "verified");
        setInstitutions(live);
        if (live.length > 0) setInstitution(live[0].address);
      })
      .catch(() => setError("Could not load institutions from the API"));
  }, []);

  const total =
    (Number(termAmount) || 0) * (Number(termsTotal) || 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!address || !institution) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const client = await escrowClient(address, freighterSigner(env.networkPassphrase, address));
      const tx = await client.create_grant({
        sponsor: address,
        beneficiary,
        institution,
        token_id: env.tokenContract,
        term_amount: BigInt(Math.round(Number(termAmount) * 10 ** env.tokenDecimals)),
        terms_total: Number(termsTotal),
      });
      const sent = await tx.signAndSend();
      const hash = sent.sendTransactionResponse?.hash;
      setSuccess(`Grant submitted${hash ? ` (${hash.slice(0, 12)}…)` : ""}.`);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Transaction failed. Do you have enough of the tuition token?",
      );
    } finally {
      setPending(false);
    }
  }

  if (!address) {
    return (
      <p className="text-sm text-neutral-400">
        Connect a Freighter wallet to fund a grant. The wallet must hold the
        tuition token ({env.tokenSymbol} via the asset contract).
      </p>
    );
  }

  const input =
    "w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs text-neutral-400">Institution (verified)</label>
        <select value={institution} onChange={(e) => setInstitution(e.target.value)} className={input} required>
          {institutions.length === 0 && <option value="">No verified institutions</option>}
          {institutions.map((i) => (
            <option key={i.address} value={i.address}>
              {i.name} ({i.country})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-neutral-400">Student address (beneficiary)</label>
        <input
          value={beneficiary}
          onChange={(e) => setBeneficiary(e.target.value)}
          placeholder="G…"
          className={`${input} font-mono`}
          required
        />
        <p className="mt-1 text-[11px] text-neutral-500">
          The student can never withdraw the funds — only the institution&apos;s
          registered payout address receives tuition.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs text-neutral-400">Amount per term ({env.tokenSymbol})</label>
          <input
            type="number"
            min="0"
            step="0.0000001"
            value={termAmount}
            onChange={(e) => setTermAmount(e.target.value)}
            className={input}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-400">Number of terms</label>
          <input
            type="number"
            min="1"
            max="12"
            value={termsTotal}
            onChange={(e) => setTermsTotal(e.target.value)}
            className={input}
            required
          />
        </div>
      </div>
      <div className="rounded-md bg-neutral-900/70 p-3 text-sm">
        Total commitment:{" "}
        <span className="font-mono">
          {total.toLocaleString(undefined, { maximumFractionDigits: 7 })} {env.tokenSymbol}
        </span>{" "}
        transfers into escrow now.
        <div className="text-[11px] text-neutral-500">
          Per term: {formatAmount(Math.round(Number(termAmount || 0) * 10 ** env.tokenDecimals), env.tokenDecimals, env.tokenSymbol)}
        </div>
      </div>
      <button
        type="submit"
        disabled={pending || connecting || institutions.length === 0}
        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
      >
        {pending ? "Confirm in Freighter…" : "Fund grant"}
      </button>
      {success && <p className="text-sm text-emerald-400">{success}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}
