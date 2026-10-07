import { SponsorPortfolio } from "@/components/SponsorPortfolio";

export const metadata = {
  title: "My grants — Tuitio",
  description: "Grants you fund, and the dispute window on each attested term.",
};

export default function PortfolioPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My grants</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400">
          Everything you have funded. When an institution attests a term you
          have a limited window to object before the money releases — the time
          left is shown on each grant.
        </p>
      </div>
      <SponsorPortfolio />
    </div>
  );
}
