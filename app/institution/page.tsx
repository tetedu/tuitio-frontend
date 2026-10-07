import { InstitutionDashboard } from "@/components/InstitutionDashboard";

export const metadata = {
  title: "Institution dashboard — Tuitio",
  description: "Grants naming your institution, and the terms awaiting your attestation.",
};

export default function InstitutionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Institution dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400">
          Grants funded for your students. Attest a term once the student has
          completed it; the funds release to your registered payout address
          after the sponsor&apos;s dispute window closes.
        </p>
      </div>
      <InstitutionDashboard />
    </div>
  );
}
