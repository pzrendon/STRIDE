export type SeaTurtlePhase = "exoatmospheric" | "entry" | "parachute" | "surface";

export type SeaTurtleOutcome = "landed" | "stalled" | "timeout" | "skipped";

export interface SeaTurtleConfig {
  missionName: string;
  payloadMassKg: number;
  startAltKm: number;
  startVelMps: number;
  entryAngleDeg: number;
  targetLat: number;
  targetLon: number;
  tpsDensity: number;
  tpsThickness: number;
  chuteCd: number;
  shieldCd: number;
  chuteDeployAltM: number;
  shockFactorX: number;
  /** Heat-shield diameter used for a single-run trajectory (not a sweep). */
  shieldDiameterM: number;
  chuteDiameterM: number;
  /** Set false to model a recovery-system failure. */
  chuteEnabled: boolean;
}

export interface TrajectorySample {
  timeSeconds: number;
  altitudeM: number;
  velocityMs: number;
  flightPathAngleDeg: number;
  downrangeM: number;
  crossrangeM: number;
  latitudeDeg: number;
  longitudeDeg: number;
  densityKgM3: number;
  dynamicPressurePa: number;
  ballisticG: number;
  heatingRateWcm2: number;
  massKg: number;
  ballisticCoefficientKgM2: number;
  phase: SeaTurtlePhase;
}

export interface SeaTurtleSummary {
  outcome: SeaTurtleOutcome;
  ballisticCoefficientKgM2: number;
  timeToKarmanSeconds: number;
  timeBelowKarmanSeconds: number;
  peakG: number;
  peakHeatingWcm2: number;
  chuteShockG: number;
  altPeakGKm: number;
  altPeakHeatingKm: number;
  peakDynamicPressurePa: number;
  rangeKm: number;
  impactLatitudeDeg: number;
  impactLongitudeDeg: number;
  impactVelocityMs: number;
  impactKineticEnergyJ: number;
  allenEggersG: number;
  deorbitLongitudeDeg: number;
}

export interface SeaTurtleResult {
  config: SeaTurtleConfig;
  samples: TrajectorySample[];
  events: TrajectoryEvent[];
  summary: SeaTurtleSummary;
}

export interface TrajectoryEvent {
  id: string;
  timeSeconds: number;
  label: string;
  sample: TrajectorySample;
}

export interface IntegratorHooks {
  /** Called each accepted step. Return a patched state to apply mid-flight failures. */
  afterStep?: (state: IntegratorState) => IntegratorState | void;
}

export interface IntegratorState {
  timeSeconds: number;
  altitudeM: number;
  velocityMs: number;
  gammaRad: number;
  downrangeM: number;
  crossrangeM: number;
  chuteDeployed: boolean;
  massKg: number;
  shieldCd: number;
  chuteCd: number;
  shieldAreaM2: number;
  chuteAreaM2: number;
  chuteEnabled: boolean;
  chuteDeployAltM: number;
}

export interface PropagateOptions {
  /** Deorbit / EI longitude. If omitted we iterate so the landing hits targetLon. */
  startLongitudeDeg?: number;
  /** Extra cross-range rate in m/s (guidance / TVC errors). */
  crossrangeRateMps?: number;
  maxSamples?: number;
  hooks?: IntegratorHooks;
  /** If true, skip the 5-pass deorbit-lon targeting loop. */
  skipTargeting?: boolean;
}
