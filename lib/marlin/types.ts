export type VehicleArchetype = "capsule" | "lifting-body" | "spaceplane";

export type MissionPhase = "boost" | "coast" | "entry" | "glide" | "terminal";

export interface ThermalLimits {
  peakHeatingWm2: number;
  totalHeatLoadJm2: number;
  maxG: number;
  maxDynamicPressurePa: number;
  thermalProtectionBaseKgM2: number;
}

export interface VehicleConfig {
  id: string;
  name: string;
  archetype: VehicleArchetype;
  dryMassKg: number;
  payloadMassKg: number;
  propellantMassKg: number;
  referenceAreaM2: number;
  dragCoefficient: number;
  liftToDrag: number;
  noseRadiusM: number;
  bankAngleDeg: number;
  thermal: ThermalLimits;
}

export interface MissionConfig {
  id: string;
  name: string;
  timeStepSeconds: number;
  boostBurnSeconds: number;
  boostThrustN: number;
  rocketIspSeconds: number;
  launchAngleDeg: number;
  entryInterfaceAltitudeM: number;
  terminalAltitudeM: number;
  terminalVelocityMs: number;
  maxSimulationSeconds: number;
}

export interface AtmosphereState {
  altitudeM: number;
  temperatureK: number;
  pressurePa: number;
  densityKgM3: number;
  speedOfSoundMs: number;
}

export interface SimulationPoint {
  timeSeconds: number;
  phase: MissionPhase;
  altitudeM: number;
  downrangeM: number;
  crossrangeM: number;
  velocityMs: number;
  mach: number;
  flightPathAngleDeg: number;
  massKg: number;
  dynamicPressurePa: number;
  heatingRateWm2: number;
  heatLoadJm2: number;
  gLoad: number;
  propellantRemainingKg: number;
}

export interface PhaseMarker {
  phase: MissionPhase;
  timeSeconds: number;
  altitudeM: number;
  downrangeM: number;
  reason: string;
}

export interface ConstraintSummary {
  peakMach: number;
  peakDynamicPressurePa: number;
  peakHeatingRateWm2: number;
  totalHeatLoadJm2: number;
  peakGLoad: number;
  thermalProtectionMassKg: number;
  reusabilityMarginPercent: number;
  violations: string[];
}

export interface SimulationSummary {
  downrangeKm: number;
  crossrangeKm: number;
  missionDurationSeconds: number;
  payloadFractionPercent: number;
  propellantUsedKg: number;
  finalVelocityMs: number;
  finalAltitudeM: number;
}

export interface SimulationResult {
  vehicle: VehicleConfig;
  mission: MissionConfig;
  points: SimulationPoint[];
  markers: PhaseMarker[];
  summary: SimulationSummary;
  constraints: ConstraintSummary;
}
