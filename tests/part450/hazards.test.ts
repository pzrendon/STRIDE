import { describe, expect, it } from "vitest";
import { exampleReentryHazards, upsertHazard } from "@/lib/part450";

describe("hazard register", () => {
  it("ships the starter reentry hazards without freezing the schema around them", () => {
    const register = exampleReentryHazards();
    const ids = register.map((hazard) => hazard.id);

    expect(ids).toContain("HAZ-PROP-001");
    expect(ids).toContain("HAZ-REC-001");
    expect(ids).toContain("HAZ-REC-002");
    expect(register.every((hazard) => hazard.associatedRequirementIds.length > 0)).toBe(true);
  });

  it("lets you add and replace hazards by id", () => {
    const extra = {
      id: "HAZ-CUSTOM-99",
      description: "Custom tank overpressure",
      initiatingEvent: "Relief valve fails closed",
      cause: "Ground processing error",
      affectedPhase: "pre_flight",
      consequence: "Pre-flight abort",
      severity: "major" as const,
      likelihood: "low",
      mitigation: "Leak check",
      verificationEvidence: "Procedure TBD",
      residualRisk: "TBD",
      associatedRequirementIds: ["PART450-PLACEHOLDER-HAZARD-ANALYSIS"],
      status: "open" as const
    };

    const withNew = upsertHazard(exampleReentryHazards(), extra);
    expect(withNew.some((hazard) => hazard.id === "HAZ-CUSTOM-99")).toBe(true);

    const replaced = upsertHazard(withNew, { ...extra, status: "mitigated" });
    expect(replaced.find((hazard) => hazard.id === "HAZ-CUSTOM-99")?.status).toBe("mitigated");
    expect(replaced.filter((hazard) => hazard.id === "HAZ-CUSTOM-99")).toHaveLength(1);
  });
});
