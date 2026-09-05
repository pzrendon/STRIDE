import { describe, expect, it } from "vitest";
import {
  allenEggersPeakG,
  DEFAULT_SEA_TURTLE_CONFIG,
  runSeaTurtle,
  vehicleMassKg
} from "@/lib/sea-turtle";

describe("Sea Turtle propagator", () => {
  it("lands the small default capsule and reports an impact state", () => {
    const result = runSeaTurtle({
      ...DEFAULT_SEA_TURTLE_CONFIG,
      startAltKm: 80,
      startVelMps: 6500,
      entryAngleDeg: 4
    });

    expect(result.summary.outcome).toBe("landed");
    expect(result.samples[result.samples.length - 1]?.altitudeM).toBe(0);
    expect(result.summary.impactLatitudeDeg).toBeCloseTo(result.config.targetLat, 3);
    expect(result.summary.impactLongitudeDeg).toBeCloseTo(result.config.targetLon, 1);
    expect(result.summary.impactVelocityMs).toBeGreaterThan(0);
    expect(result.samples.length).toBeGreaterThan(10);
    expect(result.events.some((event) => event.id === "sim-start")).toBe(true);
  });

  it("matches the Allen–Eggers teaching check used in the JS tool", () => {
    expect(allenEggersPeakG(7650, 3.75)).toBeGreaterThan(1);
    expect(allenEggersPeakG(7650, 8)).toBeGreaterThan(allenEggersPeakG(7650, 3.75));
  });

  it("raises mass when the heat shield grows", () => {
    const small = vehicleMassKg({ ...DEFAULT_SEA_TURTLE_CONFIG, shieldDiameterM: 0.8 });
    const large = vehicleMassKg({ ...DEFAULT_SEA_TURTLE_CONFIG, shieldDiameterM: 1.8 });
    expect(large).toBeGreaterThan(small);
  });
});
