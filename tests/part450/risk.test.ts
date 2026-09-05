import { describe, expect, it } from "vitest";
import { expectedCasualtiesTerm, loadPart450Catalog, REGULATORY_VALUE_REQUIRED, assessPublicRisk } from "@/lib/part450";
import type { FailureRun } from "@/lib/part450";
import { DEFAULT_SEA_TURTLE_CONFIG, runSeaTurtle } from "@/lib/sea-turtle";
import { emptyGeographicDataset, syntheticFloridaRecoveryGeography } from "@/lib/part450/geography";

describe("public risk equations", () => {
  it("uses the Ec product identity", () => {
    expect(
      expectedCasualtiesTerm({
        probabilityOfFailure: 0.1,
        probabilityOfImpact: 0.5,
        probabilityOfCasualty: 0.2,
        nExposed: 10
      })
    ).toBeCloseTo(0.1 * 0.5 * 0.2 * 10);
  });

  it("does not invent a pass/fail against a missing FAA threshold", () => {
    const catalog = loadPart450Catalog();
    const nominal = runSeaTurtle({
      ...DEFAULT_SEA_TURTLE_CONFIG,
      startAltKm: 40,
      startVelMps: 3000,
      entryAngleDeg: 8
    });
    const failureRuns: FailureRun[] = [
      {
        scenario: {
          id: "one",
          name: "one",
          failureTimeSeconds: 0,
          failureType: "test",
          affectedSubsystem: "test",
          parameterChanges: {},
          probability: 0.1,
          notes: "unit test"
        },
        trajectory: nominal
      }
    ];

    const risk = assessPublicRisk({
      catalog,
      failureRuns,
      geography: syntheticFloridaRecoveryGeography()
    });

    expect(risk.equation).toContain("P_failure");
    expect(risk.comparisons.some((row) => row.thresholdDisplay === REGULATORY_VALUE_REQUIRED)).toBe(true);
    expect(risk.comparisons.every((row) => row.assessed === false)).toBe(true);
    expect(risk.aircraftRisk).toBe("NOT_IMPLEMENTED");
  });

  it("returns null individual risk when nobody is on the map", () => {
    const catalog = loadPart450Catalog();
    const nominal = runSeaTurtle({
      ...DEFAULT_SEA_TURTLE_CONFIG,
      startAltKm: 40,
      startVelMps: 3000,
      entryAngleDeg: 8
    });
    const risk = assessPublicRisk({
      catalog,
      failureRuns: [
        {
          scenario: {
            id: "one",
            name: "one",
            failureTimeSeconds: 0,
            failureType: "test",
            affectedSubsystem: "test",
            parameterChanges: {},
            probability: 1,
            notes: "unit test"
          },
          trajectory: nominal
        }
      ],
      geography: emptyGeographicDataset()
    });
    expect(risk.individualRisk).toBeNull();
  });
});
