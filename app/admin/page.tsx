import { AdminPanel } from "@/components/AdminPanel";

export const metadata = {
  title: "Dispute resolution — Tuitio",
  description: "Resolve disputed terms: pay the institution or refund the sponsor.",
};

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dispute resolution</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400">
          When a sponsor objects to an attested term, the funds freeze until
          the escrow admin decides. Either the term happened and the
          institution is paid, or it did not and the sponsor is refunded.
          Either way the term is final and the grant moves on.
        </p>
      </div>
      <AdminPanel />
    </div>
  );
}
