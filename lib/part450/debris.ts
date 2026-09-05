import {
  ballisticCoefficient,
  initialIntegratorState,
  propagateFromState,
  sampleAtTime,
  type SeaTurtleConfig,
  type SeaTurtleResult
} from "../sea-turtle";
import { PART450_DISCLAIMER } from "./regulatory";
import type { DebrisFootprint, DebrisFragment, DebrisImpact } from "./types";

const DEBRIS_DISCLAIMER =
  "Conceptual / preliminary debris model. Not an FAA-validated breakup or flight safety analysis. Fragment masses and ballistic coefficients are engineering placeholders.";

export function exampleBreakupFragments(nominal: SeaTurtleResult, breakupTimeSeconds: number): DebrisFragment[] {
  const state = sampleAtTime(nominal, breakupTimeSeconds);
  const totalMass = Math.max(state.massKg, 1);
  const recipes = [
    { id: "DEB-CORE", massFrac: 0.55, areaM2: 1.8, cd: 1.1 },
    { id: "DEB-TPS", massFrac: 0.2, areaM2: 2.4, cd: 1.4 },
    { id: "DEB-TANK", massFrac: 0.15, areaM2: 0.9, cd: 0.8 },
    { id: "DEB-MISC", massFrac: 0.1, areaM2: 0.4, cd: 1.2 }
  ];

  return recipes.map((recipe) => {
    const massKg = totalMass * recipe.massFrac;
    return {
      id: recipe.id,
      massKg,
      referenceAreaM2: recipe.areaM2,
      cd: recipe.cd,
      ballisticCoefficientKgM2: ballisticCoefficient(massKg, recipe.cd, recipe.areaM2),
      breakupTimeSeconds,
      probabilityWeight: recipe.massFrac,
      initialState: state,
      notes: "Placeholder fragment. Replace with a real breakup inventory later."
    };
  });
}

export function propagateFragment(fragment: DebrisFragment, templateCfg: SeaTurtleConfig, deorbitLonDeg: number): DebrisImpact {
  // Fragments fall as small ballistic bodies. No chute, no targeting.
  const cfg: SeaTurtleConfig = {
    ...templateCfg,
    payloadMassKg: Math.max(fragment.massKg - 5, 0.1),
    shieldCd: fragment.cd,
    shieldDiameterM: 2 * Math.sqrt(Math.max(fragment.referenceAreaM2, 0.01) / Math.PI),
    chuteEnabled: false,
    missionName: fragment.id
  };

  const start = initialIntegratorState(cfg);
  start.timeSeconds = fragment.initialState.timeSeconds;
  start.altitudeM = fragment.initialState.altitudeM;
  start.velocityMs = fragment.initialState.velocityMs;
  start.gammaRad = (fragment.initialState.flightPathAngleDeg * Math.PI) / 180;
  start.downrangeM = fragment.initialState.downrangeM;
  start.crossrangeM = fragment.initialState.crossrangeM;
  start.massKg = fragment.massKg;
  start.shieldCd = fragment.cd;
  start.shieldAreaM2 = fragment.referenceAreaM2;
  start.chuteEnabled = false;

  const result = propagateFromState(cfg, start, deorbitLonDeg, {
    skipTargeting: true,
    maxSamples: 240
  });

  return {
    fragmentId: fragment.id,
    latitudeDeg: result.summary.impactLatitudeDeg,
    longitudeDeg: result.summary.impactLongitudeDeg,
    velocityMs: result.summary.impactVelocityMs,
    kineticEnergyJ: result.summary.impactKineticEnergyJ,
    probabilityWeight: fragment.probabilityWeight
  };
}

export function buildDebrisFootprint(
  nominal: SeaTurtleResult,
  options?: { breakupTimeSeconds?: number; fragments?: DebrisFragment[] }
): DebrisFootprint {
  let breakupTime = options?.breakupTimeSeconds;
  if (breakupTime === undefined) {
    let peak = nominal.samples[0];
    for (const sample of nominal.samples) {
      if (sample.dynamicPressurePa > (peak?.dynamicPressurePa ?? 0)) peak = sample;
    }
    breakupTime = peak?.timeSeconds ?? 0;
  }

  const fragments = options?.fragments ?? exampleBreakupFragments(nominal, breakupTime);
  const impacts = fragments.map((fragment) =>
    propagateFragment(fragment, nominal.config, nominal.summary.deorbitLongitudeDeg)
  );

  return footprintFromImpacts(fragments, impacts);
}

export function footprintFromImpacts(fragments: DebrisFragment[], impacts: DebrisImpact[]): DebrisFootprint {
  const weights = impacts.map((impact) => impact.probabilityWeight);
  const wSum = weights.reduce((a, b) => a + b, 0) || 1;
  const meanLat = impacts.reduce((s, impact) => s + impact.latitudeDeg * impact.probabilityWeight, 0) / wSum;
  const meanLon = impacts.reduce((s, impact) => s + impact.longitudeDeg * impact.probabilityWeight, 0) / wSum;

  const radiiKm = impacts.map((impact) => haversineKm(meanLat, meanLon, impact.latitudeDeg, impact.longitudeDeg));
  const variance =
    radiiKm.reduce((s, r, i) => s + impacts[i].probabilityWeight * r * r, 0) / wSum;
  const sigma = Math.sqrt(Math.max(variance, 0));

  return {
    fidelity: "conceptual_preliminary",
    disclaimer: `${DEBRIS_DISCLAIMER} ${PART450_DISCLAIMER}`,
    fragments,
    impacts,
    meanLatitudeDeg: meanLat,
    meanLongitudeDeg: meanLon,
    contourRadiiKm: { oneSigma: sigma, twoSigma: 2 * sigma }
  };
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}