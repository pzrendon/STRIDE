import { describe, expect, it } from "vitest";
import { applyParameterChanges, exampleReentryFailures, runFailureScenario } from "@/lib/part450";
import { DEFAULT_SEA_TURTLE_CONFIG, runSeaTurtle } from "@/lib/sea-turtle";

const quickCfg = {
  ...DEFAULT_SEA_TURTLE_CONFIG,
  startAltKm: 50,
  startVelMps: 4200,
  entryAngleDeg: 6,
  chuteDeployAltM: 4000
};

describe("failure scenarios", () => {
  it("includes the starter failure types as data, not as a hard-wired switch", () => {
    const types = exampleReentryFailures().map((scenario) => scenario.failureType);
    expect(types).toContain("recovery_system_failure");
    expect(types).toContain("aero_coefficient_uncertainty");
    expect(types).toContain("guidance_failure");
  });

  it("applies chute-off and Cd scale without mutating the original config", () => {
    const originalCd = quickCfg.shieldCd;
    const patched = applyParameterChanges(quickCfg, { chuteEnabled: false, shieldCdScale: 1.2 });
    expect(quickCfg.chuteEnabled).toBe(true);
    expect(quickCfg.shieldCd).toBe(originalCd);
    expect(patched.chuteEnabled).toBe(false);
    expect(patched.shieldCd).toBeCloseTo(originalCd * 1.2);
  });

  it("chute-off hits harder than the nominal recovery case", () => {
    const nominal = runSeaTurtle(quickCfg);
    const chuteOff = runFailureScenario(
      {
        id: "t-chute",
        name: "test chute off",
        failureTimeSeconds: 0,
        failureType: "recovery_system_failure",
        affectedSubsystem: "recovery",
        parameterChanges: { chuteEnabled: false },
        probability: 0.02,
        notes: "test"
      },
      nominal
    );

    expect(nominal.summary.outcome).toBe("landed");
    expect(chuteOff.trajectory.summary.outcome).toBe("landed");
    expect(chuteOff.trajectory.summary.impactVelocityMs).toBeGreaterThan(nominal.summary.impactVelocityMs);
    expect(chuteOff.trajectory.summary.impactKineticEnergyJ).toBeGreaterThan(nominal.summary.impactKineticEnergyJ);
  });
});
