import { runSeaTurtle } from "../sea-turtle";
import { buildComplianceMatrix } from "./compliance";
import { evaluateConstraints, exampleReentryConstraints } from "./constraints";
import { buildDebrisFootprint } from "./debris";
import { exampleMissionBundle } from "./exampleMission";
import { runFailureScenarios, sampleAeroMonteCarlo } from "./failures";
import { syntheticFloridaRecoveryGeography } from "./geography";
import { exampleReentryHazards } from "./hazards";
import { loadPart450Catalog } from "./regulatory";
import { assessPublicRisk } from "./risk";
import type { FailureScenario, GeographicDataset, MissionSafetyConfig, MonteCarloOptions, SafetyAssessment, SafetyConstraint } from "./types";

export interface AssessmentInput {
  mission?: MissionSafetyConfig;
  catalogYaml?: {
    requirementsYaml?: string;
    criteriaYaml?: string;
    applicabilityYaml?: string;
  };
  hazards?: SafetyAssessment["hazards"];
  failures?: FailureScenario[];
  constraints?: SafetyConstraint[];
  geography?: GeographicDataset;
  monteCarlo?: MonteCarloOptions;
  now?: Date;
}

/**
 * Vehicle → CONOPS → nominal → hazards → failures → debris → risk →
 * constraints → compliance. Each piece is swappable; this just wires the MVP.
 */
export function runMissionSafetyAssessment(input: AssessmentInput = {}): SafetyAssessment {
  const bundle = exampleMissionBundle();
  const mission = input.mission ?? bundle.mission;
  const catalog = loadPart450Catalog(input.catalogYaml);
  const hazards = input.hazards ?? exampleReentryHazards();
  const failures = input.failures ?? bundle.failures;
  const constraints = input.constraints ?? exampleReentryConstraints(mission.recoveryLocation);
  const geography = input.geography ?? syntheticFloridaRecoveryGeography();
  const monteCarlo: MonteCarloOptions = input.monteCarlo ?? { enabled: false, samples: 12, seed: 450 };

  const nominal = runSeaTurtle(mission.seaTurtle);
  const failureRuns = runFailureScenarios(failures, nominal);
  const debris = buildDebrisFootprint(nominal);

  if (monteCarlo.enabled) {
    const mc = sampleAeroMonteCarlo(nominal, {
      samples: monteCarlo.samples,
      seed: monteCarlo.seed
    });
    // Fold MC impact points into the debris footprint as extra weighted hits.
    for (const [index, result] of mc.entries()) {
      debris.impacts.push({
        fragmentId: `MC-${index}`,
        latitudeDeg: result.summary.impactLatitudeDeg,
        longitudeDeg: result.summary.impactLongitudeDeg,
        velocityMs: result.summary.impactVelocityMs,
        kineticEnergyJ: result.summary.impactKineticEnergyJ,
        probabilityWeight: 1 / Math.max(mc.length, 1)
      });
    }
  }

  const risk = assessPublicRisk({ catalog, failureRuns, geography });

  const constraintEvaluations = [
    ...evaluateConstraints(constraints, nominal, nominal),
    ...failureRuns.flatMap((run) => evaluateConstraints(constraints, run.trajectory, nominal))
  ];

  const compliance = buildComplianceMatrix({
    catalog,
    operationType: mission.operationType,
    hazards
  });

  return {
    mission,
    catalog,
    nominal,
    hazards,
    failureRuns,
    debris,
    geography,
    risk,
    constraints,
    constraintEvaluations,
    compliance,
    monteCarlo,
    generatedAtIso: (input.now ?? new Date()).toISOString()
  };
}
