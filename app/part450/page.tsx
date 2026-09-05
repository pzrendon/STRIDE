import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { SafetyDashboard } from "@/components/part450/SafetyDashboard";

export const metadata: Metadata = {
  title: "Part 450 Mission Safety | STRIDE",
  description:
    "Engineering workbook connecting Sea Turtle reentry trajectories to Part 450-style hazards, risk bookkeeping, and evidence traceability. Not an FAA license application."
};

export default function Part450Page() {
  return (
    <main className="app-shell">
      <SiteNav current="part450" />
      <SafetyDashboard />
    </main>
  );
}
