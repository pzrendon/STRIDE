import { describe, expect, it } from "vitest";
import {
  buildComplianceMatrix,
  COMPLIANCE_STATUSES,
  exampleReentryHazards,
  loadPart450Catalog,
  parseComplianceMatrix,
  serializeComplianceMatrix
} from "@/lib/part450";

describe("compliance matrix", () => {
  it("round-trips JSON and keeps the known status vocabulary", () => {
    const catalog = loadPart450Catalog();
    const entries = buildComplianceMatrix({
      catalog,
      operationType: "reentry",
      hazards: exampleReentryHazards()
    });

    expect(entries.length).toBe(catalog.requirements.length);
    for (const entry of entries) {
      expect(COMPLIANCE_STATUSES).toContain(entry.status);
      expect(entry.regulationReference).toContain("PLACEHOLDER");
    }

    const json = serializeComplianceMatrix(entries);
    const back = parseComplianceMatrix(json);
    expect(back).toEqual(entries);
    expect(json).toContain("stride.part450.compliance.v1");
  });

  it("rejects a bad status on parse", () => {
    expect(() =>
      parseComplianceMatrix(JSON.stringify({ entries: [{ id: "x", requirementId: "y", status: "LOOKS_GOOD" }] }))
    ).toThrow(/unknown compliance status/);
  });

  it("marks FSS rows as needing external evidence", () => {
    const entries = buildComplianceMatrix({
      catalog: loadPart450Catalog(),
      operationType: "reentry",
      hazards: exampleReentryHazards()
    });
    const fss = entries.find((entry) => entry.requirementId === "PART450-PLACEHOLDER-FLIGHT-SAFETY-SYSTEM");
    expect(fss?.status).toBe("REQUIRES_EXTERNAL_EVIDENCE");
    expect(fss?.associatedHazardIds).toContain("HAZ-FSS-001");
  });
});
