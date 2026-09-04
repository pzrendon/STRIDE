import { describe, expect, it } from "vitest";
import { evaluateConstraints, pointInPolygon } from "@/lib/part450";
import type { SafetyConstraint } from "@/lib/part450";
import { DEFAULT_SEA_TURTLE_CONFIG, runSeaTurtle } from "@/lib/sea-turtle";

describe("geographic constraints", () => {
  it("detects a point inside a keep-out polygon", () => {
    const square = [
      { name: "a", latitudeDeg: 0, longitudeDeg: 0 },
      { name: "b", latitudeDeg: 0, longitudeDeg: 2 },
      { name: "c", latitudeDeg: 2, longitudeDeg: 2 },
      { name: "d", latitudeDeg: 2, longitudeDeg: 0 }
    ];
    expect(pointInPolygon(1, 1, square)).toBe(true);
    expect(pointInPolygon(5, 5, square)).toBe(false);
  });

  it("flags a landing outside the recovery circle", () => {
    const trajectory = runSeaTurtle({
      ...DEFAULT_SEA_TURTLE_CONFIG,
      startAltKm: 40,
      startVelMps: 3000,
      entryAngleDeg: 8
    });

    const far: SafetyConstraint = {
      id: "far-zone",
      name: "Far recovery",
      kind: "recovery_zone",
      center: { name: "elsewhere", latitudeDeg: 10, longitudeDeg: 10 },
      radiusKm: 5
    };
    const near: SafetyConstraint = {
      id: "near-zone",
      name: "Near recovery",
      kind: "recovery_zone",
      center: {
        name: "aim",
        latitudeDeg: trajectory.summary.impactLatitudeDeg,
        longitudeDeg: trajectory.summary.impactLongitudeDeg
      },
      radiusKm: 20
    };

    const farEval = evaluateConstraints([far], trajectory, trajectory)[0];
    const nearEval = evaluateConstraints([near], trajectory, trajectory)[0];

    expect(farEval.violated).toBe(true);
    expect(farEval.violationTimeSeconds).not.toBeNull();
    expect(farEval.location).not.toBeNull();
    expect(nearEval.violated).toBe(false);
  });

  it("catches a keep-out polygon that covers the landing", () => {
    const trajectory = runSeaTurtle({
      ...DEFAULT_SEA_TURTLE_CONFIG,
      startAltKm: 40,
      startVelMps: 3000,
      entryAngleDeg: 8
    });
    const lat = trajectory.summary.impactLatitudeDeg;
    const lon = trajectory.summary.impactLongitudeDeg;
    const keepOut: SafetyConstraint = {
      id: "ko",
      name: "box",
      kind: "keep_out",
      polygon: [
        { name: "nw", latitudeDeg: lat + 1, longitudeDeg: lon - 1 },
        { name: "ne", latitudeDeg: lat + 1, longitudeDeg: lon + 1 },
        { name: "se", latitudeDeg: lat - 1, longitudeDeg: lon + 1 },
        { name: "sw", latitudeDeg: lat - 1, longitudeDeg: lon - 1 }
      ]
    };

    const evals = evaluateConstraints([keepOut], trajectory, trajectory);
    expect(evals[0].violated).toBe(true);
    expect(evals[0].associatedRequirementId ?? null).toBeNull();
  });
});
