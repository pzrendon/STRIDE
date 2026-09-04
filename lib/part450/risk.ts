import { formatThreshold, type CriterionRecord, type Part450Catalog } from "./regulatory";
import { haversineKm } from "./debris";
import { populationAt } from "./geography";
import type { CriterionComparison, FailureRun, GeographicDataset, PublicRiskResult, RiskContribution } from "./types";
import type { SeaTurtleResult } from "../sea-turtle";

type ImpactLike = {
  latitudeDeg: number;
  longitudeDeg: number;
  kineticEnergyJ: number;
};

function conceptualCasualtyProbability(kineticEnergyJ: number): number {
  // Placeholder lethality vs. KE. This is NOT an FAA casualty-area model.
  // Swap this function out when a validated P_casualty model exists.
  if (kineticEnergyJ < 50) return 0.001;
  if (kineticEnergyJ < 1_000) return 0.01;
  if (kineticEnergyJ < 50_000) return 0.05;
  if (kineticEnergyJ < 1_000_000) return 0.15;
  return 0.35;
}

function impactFromTrajectory(result: SeaTurtleResult): ImpactLike {
  return {
    latitudeDeg: result.summary.impactLatitudeDeg,
    longitudeDeg: result.summary.impactLongitudeDeg,
    kineticEnergyJ: result.summary.impactKineticEnergyJ
  };
}

function nExposedNear(dataset: GeographicDataset, lat: number, lon: number, radiusKm: number): number {
  let n = 0;
  for (const cell of dataset.population) {
    if (haversineKm(lat, lon, cell.latitudeDeg, cell.longitudeDeg) <= radiusKm) {
      n += cell.population;
    }
  }
  if (n > 0) return n;
  return populationAt(dataset, lat, lon)?.population ?? 0;
}

export function expectedCasualtiesTerm(input: {
  probabilityOfFailure: number;
  probabilityOfImpact: number;
  probabilityOfCasualty: number;
  nExposed: number;
}): number {
  return (
    input.probabilityOfFailure *
    input.probabilityOfImpact *
    input.probabilityOfCasualty *
    input.nExposed
  );
}

export function assessPublicRisk(input: {
  catalog: Part450Catalog;
  failureRuns: FailureRun[];
  geography: GeographicDataset;
  casualtyRadiusKm?: number;
}): PublicRiskResult {
  const radiusKm = input.casualtyRadiusKm ?? 5;
  const contributions: RiskContribution[] = input.failureRuns.map((run) => {
    const impact = impactFromTrajectory(run.trajectory);
    const pImpact = run.trajectory.summary.outcome === "landed" ? 1 : 0.25;
    const pCasualty = conceptualCasualtyProbability(impact.kineticEnergyJ);
    const nExposed = nExposedNear(input.geography, impact.latitudeDeg, impact.longitudeDeg, radiusKm);
    const ec = expectedCasualtiesTerm({
      probabilityOfFailure: run.scenario.probability,
      probabilityOfImpact: pImpact,
      probabilityOfCasualty: pCasualty,
      nExposed
    });

    return {
      scenarioId: run.scenario.id,
      probabilityOfFailure: run.scenario.probability,
      probabilityOfImpact: pImpact,
      probabilityOfCasualty: pCasualty,
      nExposed,
      expectedCasualties: ec,
      notes: `Conceptual P_casualty from KE=${impact.kineticEnergyJ.toExponential(2)} J. Not a certified casualty area.`
    };
  });

  const expectedCasualties = contributions.reduce((sum, row) => sum + row.expectedCasualties, 0);

  // Individual risk: max over cells of Σ P_f * P_hit_cell * P_casualty.
  // Collective risk is just Ec in this bookkeeping identity.
  let individualRisk = 0;
  for (const cell of input.geography.population) {
    let p = 0;
    for (const run of input.failureRuns) {
      const impact = impactFromTrajectory(run.trajectory);
      const distance = haversineKm(cell.latitudeDeg, cell.longitudeDeg, impact.latitudeDeg, impact.longitudeDeg);
      const pHit = distance <= radiusKm ? 1 : 0;
      p += run.scenario.probability * pHit * conceptualCasualtyProbability(impact.kineticEnergyJ);
    }
    if (p > individualRisk) individualRisk = p;
  }

  const comparisons: CriterionComparison[] = input.catalog.criteria.map((criterion) =>
    compareCriterion(criterion, {
      expected_casualties: expectedCasualties,
      individual_risk: individualRisk,
      collective_risk: expectedCasualties,
      aircraft_risk: null,
      maritime_risk: null
    })
  );

  return {
    fidelity: "conceptual",
    equation: "Ec = Σ(P_failure × P_impact × P_casualty × N_exposed)",
    expectedCasualties,
    individualRisk: input.geography.population.length ? individualRisk : null,
    collectiveRisk: expectedCasualties,
    aircraftRisk: "NOT_IMPLEMENTED",
    maritimeRisk: "NOT_IMPLEMENTED",
    contributions,
    comparisons,
    notes: [
      "Aircraft and ship risk are interface-only in the MVP.",
      "Do not treat these numbers as an FAA public-risk result.",
      "Example P_f values are not a mutually exclusive fault tree — overlapping scenarios can double-count Ec.",
      "Threshold comparisons print REGULATORY VALUE REQUIRED until criteria.yaml is filled from an authoritative source."
    ]
  };
}

function compareCriterion(
  criterion: CriterionRecord,
  computed: Record<string, number | null>
): CriterionComparison {
  const value = Object.prototype.hasOwnProperty.call(computed, criterion.quantity)
    ? computed[criterion.quantity]
    : null;

  return {
    criterionId: criterion.id,
    name: criterion.name,
    computed: value,
    thresholdDisplay: formatThreshold(criterion),
    assessed: criterion.threshold !== null && value !== null
  };
}
