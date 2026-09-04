import type { SeaTurtleResult, TrajectorySample } from "../sea-turtle";
import { haversineKm } from "./debris";
import type { ConstraintEvaluation, GeoPoint, SafetyConstraint } from "./types";

function pointInPolygon(lat: number, lon: number, polygon: GeoPoint[]): boolean {
  // Ray cast. Polygons are small, so we ignore the date line. Fine for Florida.
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const yi = polygon[i].latitudeDeg;
    const xi = polygon[i].longitudeDeg;
    const yj = polygon[j].latitudeDeg;
    const xj = polygon[j].longitudeDeg;
    const intersect = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-18) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function distanceToTrackKm(sample: TrajectorySample, nominal: SeaTurtleResult): number {
  let best = Infinity;
  for (const point of nominal.samples) {
    const d = haversineKm(sample.latitudeDeg, sample.longitudeDeg, point.latitudeDeg, point.longitudeDeg);
    if (d < best) best = d;
  }
  return best;
}

function evaluateOne(constraint: SafetyConstraint, trajectory: SeaTurtleResult, nominal: SeaTurtleResult): ConstraintEvaluation {
  const base: ConstraintEvaluation = {
    constraintId: constraint.id,
    constraintName: constraint.name,
    kind: constraint.kind,
    violated: false,
    violationTimeSeconds: null,
    vehicleState: null,
    location: null,
    associatedHazardId: constraint.associatedHazardId ?? null,
    associatedRequirementId: constraint.associatedRequirementId ?? null,
    notes: constraint.notes ?? ""
  };

  const checkSample = (sample: TrajectorySample, violated: boolean) => {
    if (!violated || base.violated) return;
    base.violated = true;
    base.violationTimeSeconds = sample.timeSeconds;
    base.vehicleState = sample;
    base.location = {
      name: "violation",
      latitudeDeg: sample.latitudeDeg,
      longitudeDeg: sample.longitudeDeg
    };
  };

  if ((constraint.kind === "recovery_zone" || constraint.kind === "impact_containment") && constraint.center && constraint.radiusKm !== undefined) {
    const impact = trajectory.samples[trajectory.samples.length - 1];
    if (impact) {
      const d = haversineKm(impact.latitudeDeg, impact.longitudeDeg, constraint.center.latitudeDeg, constraint.center.longitudeDeg);
      // recovery_zone: landing should be inside. containment: same idea for debris/impact.
      checkSample(impact, d > constraint.radiusKm);
      if (base.violated) {
        base.notes = `Impact ${d.toFixed(1)} km from ${constraint.center.name} (limit ${constraint.radiusKm} km).`;
      }
    }
    return base;
  }

  if (constraint.kind === "trajectory_corridor" && constraint.corridorWidthKm !== undefined) {
    for (const sample of trajectory.samples) {
      const d = distanceToTrackKm(sample, nominal);
      if (d > constraint.corridorWidthKm) {
        checkSample(sample, true);
        base.notes = `Left corridor by ${d.toFixed(1)} km (limit ${constraint.corridorWidthKm} km).`;
        break;
      }
    }
    return base;
  }

  if ((constraint.kind === "keep_out" || constraint.kind === "hazard_area") && constraint.polygon?.length) {
    for (const sample of trajectory.samples) {
      if (pointInPolygon(sample.latitudeDeg, sample.longitudeDeg, constraint.polygon)) {
        checkSample(sample, true);
        base.notes = `Ground track entered ${constraint.kind.replace("_", "-")} polygon.`;
        break;
      }
    }
    return base;
  }

  if (constraint.kind === "flight_termination" || constraint.kind === "autonomous_flight_safety") {
    // MVP: treat these as the same corridor/keep-out rules if geometry was provided.
    // If not, we just record "not evaluated" rather than inventing a terminate-now policy.
    base.notes = "No terminate-now logic in the MVP. Attach a corridor or keep-out polygon to evaluate geometrically.";
    return base;
  }

  return base;
}

export function evaluateConstraints(
  constraints: SafetyConstraint[],
  trajectory: SeaTurtleResult,
  nominal: SeaTurtleResult
): ConstraintEvaluation[] {
  return constraints.map((constraint) => evaluateOne(constraint, trajectory, nominal));
}

export function exampleReentryConstraints(recovery: { latitudeDeg: number; longitudeDeg: number }): SafetyConstraint[] {
  return [
    {
      id: "CON-RECOVERY",
      name: "Designated recovery zone",
      kind: "recovery_zone",
      center: { name: "recovery aimpoint", latitudeDeg: recovery.latitudeDeg, longitudeDeg: recovery.longitudeDeg },
      radiusKm: 40,
      associatedHazardId: "HAZ-REC-002",
      associatedRequirementId: "PART450-PLACEHOLDER-CONTAINMENT",
      notes: "Circle around the CONOPS recovery location. Not a licensed hazard area."
    },
    {
      id: "CON-CORRIDOR",
      name: "Allowable trajectory corridor",
      kind: "trajectory_corridor",
      corridorWidthKm: 75,
      associatedHazardId: "HAZ-NAV-001",
      associatedRequirementId: "PART450-PLACEHOLDER-TRAJECTORY-ANALYSIS",
      notes: "Distance from the nominal Sea Turtle ground track."
    },
    {
      id: "CON-KEEPOUT",
      name: "Synthetic inland keep-out",
      kind: "keep_out",
      associatedHazardId: "HAZ-REC-002",
      associatedRequirementId: "PART450-PLACEHOLDER-CONTAINMENT",
      polygon: [
        { name: "nw", latitudeDeg: 28.9, longitudeDeg: -81.6 },
        { name: "ne", latitudeDeg: 28.9, longitudeDeg: -81.05 },
        { name: "se", latitudeDeg: 27.9, longitudeDeg: -81.05 },
        { name: "sw", latitudeDeg: 27.9, longitudeDeg: -81.6 }
      ],
      notes: "Made-up inland box so the checker has something to test. Not a real keep-out."
    },
    {
      id: "CON-CONTAIN",
      name: "Impact containment region",
      kind: "impact_containment",
      center: { name: "recovery aimpoint", latitudeDeg: recovery.latitudeDeg, longitudeDeg: recovery.longitudeDeg },
      radiusKm: 120,
      associatedHazardId: "HAZ-STR-001",
      associatedRequirementId: "PART450-PLACEHOLDER-CONTAINMENT",
      notes: "Wide circle used as a first-order containment check for debris and chute-fail cases."
    },
    {
      id: "CON-AFSS",
      name: "Autonomous flight safety rule (geometry TBD)",
      kind: "autonomous_flight_safety",
      associatedHazardId: "HAZ-FSS-001",
      associatedRequirementId: "PART450-PLACEHOLDER-FLIGHT-SAFETY-SYSTEM",
      notes: "Placeholder. Wire real AFSS predicates here later."
    }
  ];
}

export { pointInPolygon };
