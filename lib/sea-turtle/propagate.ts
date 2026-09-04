import { SEA_TURTLE_CONSTANTS as C } from "./constants";
import type {
  IntegratorState,
  PropagateOptions,
  SeaTurtleConfig,
  SeaTurtleOutcome,
  SeaTurtlePhase,
  SeaTurtleResult,
  TrajectoryEvent,
  TrajectorySample
} from "./types";

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

export const DEFAULT_SEA_TURTLE_CONFIG: SeaTurtleConfig = {
  missionName: "STRIDE_Re-Entry_Predictor",
  payloadMassKg: 24,
  startAltKm: 300,
  startVelMps: 7650,
  entryAngleDeg: 3.75,
  targetLat: 28.47,
  targetLon: -80.57,
  tpsDensity: 480,
  tpsThickness: 0.05,
  chuteCd: 1.8,
  shieldCd: 1.5,
  chuteDeployAltM: 5000,
  shockFactorX: 1.6,
  shieldDiameterM: 1.2,
  chuteDiameterM: 3.0,
  chuteEnabled: true
};

export function deg2rad(d: number): number {
  return d * DEG2RAD;
}

export function rad2deg(r: number): number {
  return r * RAD2DEG;
}

export function exponentialDensity(altitudeM: number): number {
  return C.RHO_0 * Math.exp(-Math.max(altitudeM, 0) / C.H_SCALE);
}

export function gravity(altitudeM: number): number {
  const r = C.R_EARTH + Math.max(altitudeM, 0);
  return C.G0 * (C.R_EARTH / r) ** 2;
}

export function allenEggersPeakG(velMps: number, entryAngleDeg: number): number {
  const gamma = deg2rad(Math.abs(entryAngleDeg));
  const aMax = (velMps * velMps * Math.sin(gamma)) / (2 * C.ALLEN_EGGERS_E * C.H_SCALE);
  return aMax / C.G0;
}

export function circleArea(diameterM: number): number {
  return Math.PI * (diameterM / 2) ** 2;
}

export function vehicleMassKg(cfg: SeaTurtleConfig): number {
  const shieldMass = circleArea(cfg.shieldDiameterM) * cfg.tpsThickness * cfg.tpsDensity;
  // +5 kg is the same hardware allowance the JS Sea Turtle uses. Don't "fix" it.
  return cfg.payloadMassKg + shieldMass + 5;
}

export function ballisticCoefficient(massKg: number, cd: number, areaM2: number): number {
  return massKg / Math.max(cd * areaM2, 1e-9);
}

function pickDt(h: number, v: number, rho: number): number {
  if (h > C.KARMAN_LINE + 50_000) return 2.0;
  if (h > C.KARMAN_LINE) return 0.5;
  if (h > 40_000) return 0.1;
  if (h > 15_000) return 0.05;
  if (rho * v > 200) return 0.02;
  return 0.05;
}

function derivs(h: number, v: number, gamma: number, mass: number, cd: number, area: number) {
  const r = C.R_EARTH + h;
  const g = gravity(h);
  const rho = exponentialDensity(h);
  const safeV = Math.max(v, 1e-9);
  const dragA = (0.5 * rho * safeV * safeV * cd * area) / mass;

  return {
    dh: safeV * Math.sin(gamma),
    dV: -dragA - g * Math.sin(gamma),
    dGamma: Math.cos(gamma) * (safeV / r - g / safeV),
    dragA,
    rho,
    g
  };
}

function phaseOf(h: number, chuteDeployed: boolean): SeaTurtlePhase {
  if (h <= 0) return "surface";
  if (chuteDeployed) return "parachute";
  if (h <= C.KARMAN_LINE) return "entry";
  return "exoatmospheric";
}

function longitudeAt(rangeM: number, timeSeconds: number, startLonDeg: number, latDeg: number): number {
  const cosLat = Math.max(Math.abs(Math.cos(deg2rad(latDeg))), 1e-6);
  const lonRelDeg = rad2deg(rangeM / (C.R_EARTH * cosLat));
  const earthRotateDeg = rad2deg(C.ROT_SPEED * timeSeconds);
  return wrapLon(startLonDeg + lonRelDeg - earthRotateDeg);
}

function wrapLon(lon: number): number {
  let x = lon;
  while (x > 180) x -= 360;
  while (x < -180) x += 360;
  return x;
}

function latitudeAt(baseLatDeg: number, crossrangeM: number): number {
  const lat = baseLatDeg + rad2deg(crossrangeM / C.R_EARTH);
  return Math.max(-89.9, Math.min(89.9, lat));
}

function sampleFromState(
  state: IntegratorState,
  cfg: SeaTurtleConfig,
  startLonDeg: number,
  rho: number,
  ballisticG: number,
  heatingWcm2: number
): TrajectorySample {
  const area = state.chuteDeployed ? state.chuteAreaM2 : state.shieldAreaM2;
  const cd = state.chuteDeployed ? state.chuteCd : state.shieldCd;
  return {
    timeSeconds: state.timeSeconds,
    altitudeM: Math.max(state.altitudeM, 0),
    velocityMs: state.velocityMs,
    flightPathAngleDeg: rad2deg(state.gammaRad),
    downrangeM: state.downrangeM,
    crossrangeM: state.crossrangeM,
    latitudeDeg: latitudeAt(cfg.targetLat, state.crossrangeM),
    longitudeDeg: longitudeAt(state.downrangeM, state.timeSeconds, startLonDeg, cfg.targetLat),
    densityKgM3: rho,
    dynamicPressurePa: 0.5 * rho * state.velocityMs * state.velocityMs,
    ballisticG,
    heatingRateWcm2: heatingWcm2,
    massKg: state.massKg,
    ballisticCoefficientKgM2: ballisticCoefficient(state.massKg, cd, area),
    phase: phaseOf(state.altitudeM, state.chuteDeployed)
  };
}

export function initialIntegratorState(cfg: SeaTurtleConfig): IntegratorState {
  const shieldAreaM2 = circleArea(cfg.shieldDiameterM);
  const chuteAreaM2 = circleArea(cfg.chuteDiameterM);
  return {
    timeSeconds: 0,
    altitudeM: cfg.startAltKm * 1000,
    velocityMs: cfg.startVelMps,
    gammaRad: -deg2rad(Math.abs(cfg.entryAngleDeg)),
    downrangeM: 0,
    crossrangeM: 0,
    chuteDeployed: false,
    massKg: vehicleMassKg(cfg),
    shieldCd: cfg.shieldCd,
    chuteCd: cfg.chuteCd,
    shieldAreaM2,
    chuteAreaM2,
    chuteEnabled: cfg.chuteEnabled,
    chuteDeployAltM: cfg.chuteDeployAltM
  };
}

/**
 * Midpoint (RK2) no-lift entry, same ODEs as web/js/sim.js.
 *
 * Difference vs the static site: we keep a real time history (lat/lon/V/γ)
 * because Part 450 needs ground tracks and impact states, not just peak-G
 * tables. Physics should still line up with the JS engine.
 */
export function propagateFromState(
  cfg: SeaTurtleConfig,
  start: IntegratorState,
  startLongitudeDeg: number,
  options: PropagateOptions = {}
): SeaTurtleResult {
  const maxSamples = options.maxSamples ?? 720;
  const crossrangeRateMps = options.crossrangeRateMps ?? 0;

  let state: IntegratorState = { ...start };
  let outcome: SeaTurtleOutcome | "integrating" = "integrating";
  let tK = 0;
  let kReached = state.altitudeM <= C.KARMAN_LINE;
  let maxG = 0;
  let maxQ = 0;
  let maxQdyn = 0;
  let shockG = 0;
  let altMaxG = 0;
  let altMaxQ = 0;
  let stepCount = 0;

  const samples: TrajectorySample[] = [];
  const events: TrajectoryEvent[] = [];

  const recordEvent = (id: string, label: string, sample: TrajectorySample) => {
    if (events.some((event) => event.id === id)) return;
    events.push({ id, label, timeSeconds: sample.timeSeconds, sample });
  };

  const startSample = sampleFromState(
    state,
    cfg,
    startLongitudeDeg,
    exponentialDensity(state.altitudeM),
    0,
    0
  );
  samples.push(startSample);
  recordEvent("sim-start", "Propagation start", startSample);

  const maybeRecordSample = (sample: TrajectorySample, force: boolean) => {
    const stride = Math.max(1, Math.floor(C.MAX_STEPS / (maxSamples * 40)));
    if (force || stepCount % stride === 0) {
      const last = samples[samples.length - 1];
      if (!last || sample.timeSeconds - last.timeSeconds >= 0.2 || force) {
        samples.push(sample);
      }
    }
  };

  while (stepCount < C.MAX_STEPS) {
    if (state.altitudeM <= 0) {
      outcome = "landed";
      state.altitudeM = 0;
      break;
    }
    if (state.velocityMs <= 0.2) {
      outcome = state.altitudeM < 1000 ? "landed" : "stalled";
      break;
    }
    if (state.timeSeconds > C.MAX_SIM_TIME_S) {
      outcome = "timeout";
      break;
    }
    if (state.altitudeM > C.SKIP_ABORT_ALT_M) {
      outcome = "skipped";
      break;
    }

    const rho = exponentialDensity(state.altitudeM);
    const dt = pickDt(state.altitudeM, state.velocityMs, rho);

    if (state.altitudeM <= C.KARMAN_LINE && !kReached) {
      tK = state.timeSeconds;
      kReached = true;
    }

    if (
      state.chuteEnabled &&
      !state.chuteDeployed &&
      state.altitudeM <= state.chuteDeployAltM
    ) {
      const qDyn = 0.5 * rho * state.velocityMs * state.velocityMs;
      shockG =
        (qDyn * state.chuteAreaM2 * state.chuteCd * cfg.shockFactorX) / (state.massKg * C.G0);
      state.chuteDeployed = true;
    }

    const area = state.chuteDeployed ? state.chuteAreaM2 : state.shieldAreaM2;
    const cd = state.chuteDeployed ? state.chuteCd : state.shieldCd;

    const k1 = derivs(state.altitudeM, state.velocityMs, state.gammaRad, state.massKg, cd, area);
    const hMid = state.altitudeM + 0.5 * dt * k1.dh;
    const vMid = Math.max(state.velocityMs + 0.5 * dt * k1.dV, 0);
    const gMid = state.gammaRad + 0.5 * dt * k1.dGamma;
    const k2 = derivs(hMid, vMid, gMid, state.massKg, cd, area);

    const shieldDragA =
      (0.5 * rho * Math.max(state.velocityMs, 1e-9) ** 2 * state.shieldCd * state.shieldAreaM2) /
      state.massKg;
    const ballisticG = shieldDragA / C.G0;
    if (!state.chuteDeployed && ballisticG > maxG) {
      maxG = ballisticG;
      altMaxG = Math.max(state.altitudeM, 0) / 1000;
    }

    state.altitudeM += dt * k2.dh;
    state.velocityMs = Math.max(state.velocityMs + dt * k2.dV, 0);
    state.gammaRad += dt * k2.dGamma;

    const r = C.R_EARTH + Math.max(state.altitudeM, 0);
    state.downrangeM += ((state.velocityMs * Math.cos(state.gammaRad) * C.R_EARTH) / r) * dt;
    state.crossrangeM += crossrangeRateMps * dt;

    const qDyn = 0.5 * k2.rho * state.velocityMs * state.velocityMs;
    if (qDyn > maxQdyn) maxQdyn = qDyn;

    let qDot = 0;
    if (state.altitudeM < C.KARMAN_LINE && state.altitudeM > 0) {
      qDot =
        (C.K_SG * Math.sqrt(Math.max(k2.rho, 0) / (cfg.shieldDiameterM / 2)) * state.velocityMs ** 3) /
        10_000;
      if (qDot > maxQ) {
        maxQ = qDot;
        altMaxQ = state.altitudeM / 1000;
      }
    }

    state.timeSeconds += dt;
    stepCount += 1;

    if (options.hooks?.afterStep) {
      const patched = options.hooks.afterStep(state);
      if (patched) state = patched;
    }

    const sample = sampleFromState(state, cfg, startLongitudeDeg, k2.rho, ballisticG, qDot);
    const force =
      sample.phase === "parachute" ||
      sample.altitudeM <= C.KARMAN_LINE && Math.abs(sample.altitudeM - C.KARMAN_LINE) < 200;
    maybeRecordSample(sample, Boolean(force) && samples.length < 8);

    if (kReached && events.every((event) => event.id !== "entry-interface")) {
      recordEvent("entry-interface", "Atmospheric entry interface (~100 km)", sample);
    }
    if (state.chuteDeployed && events.every((event) => event.id !== "chute-deploy")) {
      recordEvent("chute-deploy", "Parachute deploy", sample);
    }
  }

  if (stepCount >= C.MAX_STEPS && outcome === "integrating") {
    outcome = "timeout";
  }

  const finalRho = exponentialDensity(state.altitudeM);
  const finalSample = sampleFromState(
    state,
    cfg,
    startLongitudeDeg,
    finalRho,
    0,
    0
  );
  samples.push(finalSample);
  recordEvent("end-of-propagation", outcome === "landed" ? "Surface impact / landing" : `Ended: ${outcome}`, finalSample);

  const impactVelocityMs = finalSample.velocityMs;
  const impactKe = 0.5 * state.massKg * impactVelocityMs * impactVelocityMs;

  return {
    config: cfg,
    samples,
    events,
    summary: {
      outcome: outcome === "integrating" ? "timeout" : outcome,
      ballisticCoefficientKgM2: ballisticCoefficient(state.massKg, cfg.shieldCd, start.shieldAreaM2),
      timeToKarmanSeconds: tK,
      timeBelowKarmanSeconds: kReached ? Math.max(state.timeSeconds - tK, 0) : 0,
      peakG: maxG,
      peakHeatingWcm2: maxQ,
      chuteShockG: shockG,
      altPeakGKm: altMaxG,
      altPeakHeatingKm: altMaxQ,
      peakDynamicPressurePa: maxQdyn,
      rangeKm: state.downrangeM / 1000,
      impactLatitudeDeg: finalSample.latitudeDeg,
      impactLongitudeDeg: finalSample.longitudeDeg,
      impactVelocityMs,
      impactKineticEnergyJ: impactKe,
      allenEggersG: allenEggersPeakG(cfg.startVelMps, cfg.entryAngleDeg),
      deorbitLongitudeDeg: startLongitudeDeg
    }
  };
}

function landingLongitude(cfg: SeaTurtleConfig, startLonDeg: number): number {
  const result = propagateFromState(cfg, initialIntegratorState(cfg), startLonDeg, {
    skipTargeting: true,
    maxSamples: 80
  });
  return result.summary.impactLongitudeDeg;
}

/**
 * Same 5-pass longitude targeting loop as the JS tool. Planar 2-DOF, so this
 * only slides longitude; latitude stays at the recovery-site parallel.
 */
export function solveDeorbitLongitude(cfg: SeaTurtleConfig): number {
  let eLon = cfg.targetLon - 22;
  for (let i = 0; i < 5; i += 1) {
    const impactLon = landingLongitude(cfg, eLon);
    eLon += cfg.targetLon - impactLon;
  }
  return wrapLon(eLon);
}

export function runSeaTurtle(cfg: SeaTurtleConfig, options: PropagateOptions = {}): SeaTurtleResult {
  const startLon = options.startLongitudeDeg ?? (options.skipTargeting ? cfg.targetLon : solveDeorbitLongitude(cfg));
  return propagateFromState(cfg, initialIntegratorState(cfg), startLon, {
    ...options,
    startLongitudeDeg: startLon
  });
}

export function sampleAtTime(result: SeaTurtleResult, timeSeconds: number): TrajectorySample {
  if (!result.samples.length) {
    throw new Error("trajectory has no samples");
  }
  let closest = result.samples[0];
  let best = Math.abs(closest.timeSeconds - timeSeconds);
  for (const sample of result.samples) {
    const delta = Math.abs(sample.timeSeconds - timeSeconds);
    if (delta < best) {
      closest = sample;
      best = delta;
    }
  }
  return closest;
}

export function sampleAtAltitude(result: SeaTurtleResult, altitudeM: number): TrajectorySample {
  if (!result.samples.length) {
    throw new Error("trajectory has no samples");
  }
  let closest = result.samples[0];
  let best = Math.abs(closest.altitudeM - altitudeM);
  for (const sample of result.samples) {
    const delta = Math.abs(sample.altitudeM - altitudeM);
    if (delta < best) {
      closest = sample;
      best = delta;
    }
  }
  return closest;
}
