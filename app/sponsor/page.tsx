import { CreateGrantForm } from "@/components/CreateGrantForm";

export const dynamic = "force-dynamic";

export default function SponsorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Fund a grant</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400">
          Commit a student&apos;s tuition terms into escrow. The full amount
          transfers now; each term releases to the institution only after it
          attests completion and your dispute window closes. If the student
          drops out, you cancel and the unspent terms come back to you.
        </p>
      </div>
      <div className="max-w-xl rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
        <CreateGrantForm />
      </div>
    </div>
  );
}
