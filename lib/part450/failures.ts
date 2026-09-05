import {
  initialIntegratorState,
  propagateFromState,
  sampleAtTime,
  type SeaTurtleConfig,
  type SeaTurtleResult,
  type TrajectorySample
} from "../sea-turtle";
import type { FailureRun, FailureScenario } from "./types";

/**
 * Failure types we ship examples for. The field is still a string on
 * FailureScenario so a later study can add "tank_rupture" without a refactor.
 */
export const EXAMPLE_FAILURE_TYPES = [
  "engine_shutdown",
  "thrust_reduction",
  "thrust_vector_error",
  "loss_of_control",
  "ballistic_continuation",
  "aero_coefficient_uncertainty",
  "guidance_failure",
  "early_maneuver",
  "late_maneuver",
  "recovery_system_failure"
] as const;

export function exampleReentryFailures(): FailureScenario[] {
  return [
    {
      id: "FAIL-CHUTE",
      name: "Recovery system failure (no parachute)",
      failureTimeSeconds: 0,
      failureType: "recovery_system_failure",
      affectedSubsystem: "recovery",
      parameterChanges: { chuteEnabled: false },
      probability: 0.02,
      associatedHazardId: "HAZ-REC-001",
      notes: "Chute never arms. Vehicle stays on heat-shield Cd/A to the surface."
    },
    {
      id: "FAIL-CD-HI",
      name: "Aero Cd +15%",
      failureTimeSeconds: 0,
      failureType: "aero_coefficient_uncertainty",
      affectedSubsystem: "aero",
      parameterChanges: { shieldCdScale: 1.15 },
      probability: 0.08,
      associatedHazardId: "HAZ-STR-001",
      notes: "First-order dispersion, not a CFD Monte Carlo."
    },
    {
      id: "FAIL-CD-LO",
      name: "Aero Cd −15%",
      failureTimeSeconds: 0,
      failureType: "aero_coefficient_uncertainty",
      affectedSubsystem: "aero",
      parameterChanges: { shieldCdScale: 0.85 },
      probability: 0.08,
      associatedHazardId: "HAZ-STR-001",
      notes: "Higher β, typically longer range and hotter."
    },
    {
      id: "FAIL-STEEP",
      name: "Late / steep deorbit (entry angle +1°)",
      failureTimeSeconds: 0,
      failureType: "late_maneuver",
      affectedSubsystem: "propulsion",
      parameterChanges: { entryAngleDeltaDeg: 1 },
      probability: 0.03,
      associatedHazardId: "HAZ-PROP-001",
      notes: "Stands in for a late or hot deorbit. Sea Turtle doesn't model the burn itself."
    },
    {
      id: "FAIL-SHALLOW",
      name: "Early / shallow deorbit (entry angle −0.8°)",
      failureTimeSeconds: 0,
      failureType: "early_maneuver",
      affectedSubsystem: "propulsion",
      parameterChanges: { entryAngleDeltaDeg: -0.8 },
      probability: 0.03,
      associatedHazardId: "HAZ-PROP-002",
      notes: "Can loft if energy is high; watch for SKIP outcomes."
    },
    {
      id: "FAIL-NAV",
      name: "Guidance / navigation bias",
      failureTimeSeconds: 0,
      failureType: "guidance_failure",
      affectedSubsystem: "gnc",
      parameterChanges: { crossrangeRateMps: 18 },
      probability: 0.04,
      associatedHazardId: "HAZ-NAV-001",
      notes: "Constant cross-range rate. Cheap stand-in for a heading bias."
    },
    {
      id: "FAIL-TVC",
      name: "Thrust vector / pointing error",
      failureTimeSeconds: 0,
      failureType: "thrust_vector_error",
      affectedSubsystem: "propulsion",
      parameterChanges: { crossrangeRateMps: -12, entryAngleDeltaDeg: 0.4 },
      probability: 0.02,
      associatedHazardId: "HAZ-PROP-003",
      notes: "Deorbit pointing error dumped into γ and crossrange."
    },
    {
      id: "FAIL-LOC",
      name: "Loss of control at peak heating",
      failureTimeSeconds: -1,
      failureType: "loss_of_control",
      affectedSubsystem: "gnc",
      parameterChanges: { gammaKickDeg: 2.5, crossrangeRateMps: 25 },
      probability: 0.015,
      associatedHazardId: "HAZ-GNC-002",
      notes: "failureTimeSeconds = -1 means 'use time of peak heating on the nominal'."
    },
    {
      id: "FAIL-BALLISTIC",
      name: "Ballistic continuation (already no-lift)",
      failureTimeSeconds: 0,
      failureType: "ballistic_continuation",
      affectedSubsystem: "aero",
      parameterChanges: {},
      probability: 0.05,
      associatedHazardId: "HAZ-GNC-001",
      notes: "Sea Turtle is already L/D = 0. Kept so the interface has the mode; trajectory ≈ nominal."
    }
  ];
}

export function applyParameterChanges(cfg: SeaTurtleConfig, changes: FailureScenario["parameterChanges"]): SeaTurtleConfig {
  const next: SeaTurtleConfig = { ...cfg };

  if (typeof changes.chuteEnabled === "boolean") {
    next.chuteEnabled = changes.chuteEnabled;
  }
  if (typeof changes.shieldCdScale === "number") {
    next.shieldCd = cfg.shieldCd * changes.shieldCdScale;
  }
  if (typeof changes.chuteCdScale === "number") {
    next.chuteCd = cfg.chuteCd * changes.chuteCdScale;
  }
  if (typeof changes.entryAngleDeltaDeg === "number") {
    next.entryAngleDeg = Math.max(0.1, cfg.entryAngleDeg + changes.entryAngleDeltaDeg);
  }
  if (typeof changes.startVelScale === "number") {
    next.startVelMps = cfg.startVelMps * changes.startVelScale;
  }
  if (typeof changes.shieldCd === "number") {
    next.shieldCd = changes.shieldCd;
  }

  return next;
}

function resolveFailureTime(scenario: FailureScenario, nominal: SeaTurtleResult): number {
  if (scenario.failureTimeSeconds >= 0) return scenario.failureTimeSeconds;
  // -1: peak heating. Handy for "broke up in the soup" cases.
  let peak = nominal.samples[0];
  for (const sample of nominal.samples) {
    if (sample.heatingRateWcm2 > (peak?.heatingRateWcm2 ?? 0)) peak = sample;
  }
  return peak?.timeSeconds ?? 0;
}

export function snapshotToIntegratorState(cfg: SeaTurtleConfig, sample: TrajectorySample) {
  const start = initialIntegratorState(cfg);
  start.timeSeconds = sample.timeSeconds;
  start.altitudeM = sample.altitudeM;
  start.velocityMs = sample.velocityMs;
  start.gammaRad = (sample.flightPathAngleDeg * Math.PI) / 180;
  start.downrangeM = sample.downrangeM;
  start.crossrangeM = sample.crossrangeM;
  start.chuteDeployed = sample.phase === "parachute";
  start.massKg = sample.massKg;
  return start;
}

export function runFailureScenario(
  scenario: FailureScenario,
  nominal: SeaTurtleResult
): FailureRun {
  const patchedCfg = applyParameterChanges(nominal.config, scenario.parameterChanges);
  const failureTime = resolveFailureTime(scenario, nominal);
  const sample = sampleAtTime(nominal, failureTime);
  const start = snapshotToIntegratorState(patchedCfg, sample);

  if (typeof scenario.parameterChanges.gammaKickDeg === "number") {
    start.gammaRad += (Number(scenario.parameterChanges.gammaKickDeg) * Math.PI) / 180;
  }

  const crossrangeRateMps =
    typeof scenario.parameterChanges.crossrangeRateMps === "number"
      ? Number(scenario.parameterChanges.crossrangeRateMps)
      : 0;

  // Failures that start at t=0 can just re-run from EI with targeting off so
  // they share the nominal deorbit longitude (otherwise every Cd tweak
  // re-aims itself back at the recovery site, which hides the miss).
  const fromScratch = failureTime <= 1;
  const trajectory = fromScratch
    ? propagateFromState(patchedCfg, initialIntegratorState(patchedCfg), nominal.summary.deorbitLongitudeDeg, {
        skipTargeting: true,
        crossrangeRateMps,
        maxSamples: 480
      })
    : propagateFromState(patchedCfg, start, nominal.summary.deorbitLongitudeDeg, {
        skipTargeting: true,
        crossrangeRateMps,
        maxSamples: 480
      });

  return { scenario, trajectory };
}

export function runFailureScenarios(scenarios: FailureScenario[], nominal: SeaTurtleResult): FailureRun[] {
  return scenarios.map((scenario) => runFailureScenario(scenario, nominal));
}

/**
 * Tiny deterministic PRNG so Monte Carlo tests don't flap.
 * Not a cryptographic generator — it's a footprint sampler.
 */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function sampleAeroMonteCarlo(
  nominal: SeaTurtleResult,
  options: { samples: number; seed: number; cdSigma?: number }
): SeaTurtleResult[] {
  const rand = mulberry32(options.seed);
  const sigma = options.cdSigma ?? 0.08;
  const runs: SeaTurtleResult[] = [];

  for (let i = 0; i < options.samples; i += 1) {
    // Box-Muller — good enough for a conceptual Cd scatter.
    const u1 = Math.max(rand(), 1e-9);
    const u2 = rand();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const scale = Math.max(0.5, 1 + sigma * z);
    const scenario: FailureScenario = {
      id: `MC-CD-${i}`,
      name: `MC Cd scale ${scale.toFixed(3)}`,
      failureTimeSeconds: 0,
      failureType: "aero_coefficient_uncertainty",
      affectedSubsystem: "aero",
      parameterChanges: { shieldCdScale: scale },
      probability: 1 / options.samples,
      notes: "Optional Monte Carlo. Off unless the caller asks for it."
    };
    runs.push(runFailureScenario(scenario, nominal).trajectory);
  }

  return runs;
}
