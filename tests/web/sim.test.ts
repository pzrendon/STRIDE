// Tests for the shipped Sea Turtle engine (web/js/sim.js). These import the
// exact ES module GitHub Pages serves, so there is no separate TS port to keep
// in sync — this file is the safety net for the physics users actually run.
import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  allenEggersPeakG,
  runMasterSim,
  runTrackedEntry,
  runStudy
} from "../../web/js/sim.js";

describe("Sea Turtle no-lift entry (web/js/sim.js)", () => {
  it("lands a capsule and reports a physical impact state", () => {
    const result = runMasterSim(
      { ...DEFAULT_CONFIG, startAltKm: 80, startVelMps: 6500, entryAngleDeg: 4 },
      1.2,
      5.0,
      4,
      { track: true }
    );

    expect(result.outcome).toBe("landed");
    expect(result.samples.at(-1)?.h).toBe(0);
    expect(result.impactVelocityMs).toBeGreaterThan(0);
    expect(result.impactKineticEnergyJ).toBeGreaterThan(0);
    expect(result.rangeKm).toBeGreaterThan(0);
    expect(result.samples.length).toBeGreaterThan(10);
    expect(result.events.some((event) => event.id === "sim-start")).toBe(true);
  });

  it("is deterministic for identical inputs", () => {
    const cfg = { ...DEFAULT_CONFIG, startAltKm: 90, startVelMps: 7000, entryAngleDeg: 3.5 };
    const a = runMasterSim(cfg, 1.2, 5.0, 3.5);
    const b = runMasterSim(cfg, 1.2, 5.0, 3.5);
    expect(a.impactLatitudeDeg).toBe(b.impactLatitudeDeg);
    expect(a.impactLongitudeDeg).toBe(b.impactLongitudeDeg);
    expect(a.g).toBe(b.g);
    expect(a.rangeKm).toBe(b.rangeKm);
  });

  it("steepens peak-G with entry angle (Allen–Eggers teaching check)", () => {
    expect(allenEggersPeakG(7650, 3.75)).toBeGreaterThan(1);
    expect(allenEggersPeakG(7650, 8)).toBeGreaterThan(allenEggersPeakG(7650, 3.75));
  });

  it("targets the recovery longitude when tracking a full ground track", () => {
    const cfg = { ...DEFAULT_CONFIG, payloadMassKg: 2800, startAltKm: 120, entryAngleDeg: 3.75 };
    const nominal = runTrackedEntry(cfg, { shieldDiameterM: 3.6, chuteDiameterM: 14 });

    expect(nominal.outcome).toBe("landed");
    expect(nominal.samples.length).toBeGreaterThan(10);
    // Every tracked sample carries a lat/lon so the workbook can draw a track.
    for (const sample of nominal.samples) {
      expect(Number.isFinite(sample.lat)).toBe(true);
      expect(Number.isFinite(sample.lon)).toBe(true);
    }
    // Iterative deorbit targeting should land within a couple of degrees of aim.
    expect(Math.abs(nominal.impactLongitudeDeg - cfg.targetLon)).toBeLessThan(2);
  });

  it("labels every parametric sweep row with a survivability status", () => {
    const study = runStudy({ ...DEFAULT_CONFIG, testShieldDiams: [0.8, 1.2], testChuteDiams: [3.0] });
    expect(study.rows.length).toBe(2);
    for (const row of study.rows) {
      expect(["PASS", "FAIL", "SKIP"]).toContain(row.status);
    }
  });
});
