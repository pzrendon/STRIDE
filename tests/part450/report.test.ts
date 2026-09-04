import { describe, expect, it } from "vitest";
import { generateSafetyReport, PART450_DISCLAIMER, runMissionSafetyAssessment } from "@/lib/part450";
import { DEFAULT_SEA_TURTLE_CONFIG } from "@/lib/sea-turtle";
import { leoReusableReentryMission } from "@/lib/part450/exampleMission";
import { exampleReentryFailures } from "@/lib/part450/failures";

describe("safety report", () => {
  it("prints the disclaimer and the 13 section headings", () => {
    const mission = leoReusableReentryMission();
    mission.seaTurtle = {
      ...DEFAULT_SEA_TURTLE_CONFIG,
      ...mission.seaTurtle,
      startAltKm: 45,
      startVelMps: 3500,
      entryAngleDeg: 7,
      payloadMassKg: 80,
      shieldDiameterM: 1.2,
      chuteDiameterM: 4
    };

    const assessment = runMissionSafetyAssessment({
      mission,
      failures: exampleReentryFailures().slice(0, 2),
      now: new Date("2026-09-04T00:00:00.000Z")
    });
    const report = generateSafetyReport(assessment);

    expect(report).toContain(PART450_DISCLAIMER);
    expect(report).toContain("1. Mission Overview");
    expect(report).toContain("5. Hazard Analysis");
    expect(report).toContain("9. Public Risk Assessment");
    expect(report).toContain("12. Part 450 Compliance / Evidence Matrix");
    expect(report).toContain("13. Open Items / Required External Analyses");
    expect(report).toContain("REGULATORY VALUE REQUIRED");
    expect(report).toContain("2026-09-04");
    expect(report).not.toMatch(/FAA[- ]approved/i);
  });
});
