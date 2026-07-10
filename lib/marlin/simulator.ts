import { dynamicPressurePa, standardAtmosphere, STANDARD_GRAVITY_MS2 } from "./atmosphere";
import type {
  ConstraintSummary,
  MissionConfig,
  MissionPhase,
  PhaseMarker,
  SimulationPoint,
  SimulationResult,
  SimulationSummary,
  VehicleConfig
} from "./types";

const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;
const EARTH_RADIUS_M = 6371000;
const HEATING_CORRELATION = 1.1e-4;

interface IntegratorState {
  timeSeconds: number;
  xM: number;
  zM: number;
  crossrangeM: number;
  vxMs: number;
  vzMs: number;
  massKg: number;
  propellantRemainingKg: number;
  heatLoadJm2: number;
  phase: MissionPhase;
}

interface ForceResult {
  axMs2: number;
  azMs2: number;
  specificForceG: number;
  dynamicPressurePa: number;
  heatingRateWm2: number;
  mach: number;
}

export function runMission(vehicle: VehicleConfig, mission: MissionConfig): SimulationResult {
  const initialMassKg = vehicle.dryMassKg + vehicle.payloadMassKg + vehicle.propellantMassKg;
  const launchAngleRad = mission.launchAngleDeg * DEG_TO_RAD;
  const initialVelocityMs = 140;
  const state: IntegratorState = {
    timeSeconds: 0,
    xM: 0,
    zM: 0,
    crossrangeM: 0,
    vxMs: initialVelocityMs * Math.cos(launchAngleRad),
    vzMs: initialVelocityMs * Math.sin(launchAngleRad),
    massKg: initialMassKg,
    propellantRemainingKg: vehicle.propellantMassKg,
    heatLoadJm2: 0,
    phase: "boost"
  };

  const points: SimulationPoint[] = [];
  const markers: PhaseMarker[] = [
    markerFromState(state, "boost", "Liftoff / boost start")
  ];

  let previousPhase = state.phase;
  let previousAltitudeM = state.zM;
  let crossedEntryInterface = false;

  while (
    state.timeSeconds <= mission.maxSimulationSeconds &&
    state.zM >= 0 &&
    points.length < 5000
  ) {
    state.phase = determinePhase(state, mission, crossedEntryInterface);

    if (state.phase !== previousPhase) {
      markers.push(markerFromState(state, state.phase, phaseReason(state.phase)));
      previousPhase = state.phase;
    }

    const forces = computeForces(state, vehicle, mission);
    const point = pointFromState(state, vehicle, forces);
    points.push(point);

    if (
      previousAltitudeM > mission.entryInterfaceAltitudeM &&
      state.zM <= mission.entryInterfaceAltitudeM &&
      state.vzMs < 0
    ) {
      crossedEntryInterface = true;
      markers.push(markerFromState(state, "entry", "Atmospheric entry interface"));
    }

    if (
      state.phase === "terminal" &&
      state.zM <= mission.terminalAltitudeM &&
      speed(state.vxMs, state.vzMs) <= mission.terminalVelocityMs
    ) {
      markers.push(markerFromState(state, "terminal", "Terminal energy-management target reached"));
      break;
    }

    stepState(state, vehicle, mission, forces);
    previousAltitudeM = state.zM;
  }

  const summary = summarize(points, vehicle);
  const constraints = summarizeConstraints(points, vehicle);

  return {
    vehicle,
    mission,
    points,
    markers,
    summary,
    constraints
  };
}

function determinePhase(
  state: IntegratorState,
  mission: MissionConfig,
  crossedEntryInterface: boolean
): MissionPhase {
  if (state.timeSeconds < mission.boostBurnSeconds && state.propellantRemainingKg > 0) {
    return "boost";
  }

  if (!crossedEntryInterface && state.zM > mission.entryInterfaceAltitudeM) {
    return "coast";
  }

  if (state.zM > 45000 && speed(state.vxMs, state.vzMs) > 2500) {
    return "entry";
  }

  if (state.zM > mission.terminalAltitudeM || speed(state.vxMs, state.vzMs) > mission.terminalVelocityMs) {
    return "glide";
  }

  return "terminal";
}

function computeForces(
  state: IntegratorState,
  vehicle: VehicleConfig,
  mission: MissionConfig
): ForceResult {
  const vMs = Math.max(1, speed(state.vxMs, state.vzMs));
  const atmosphere = standardAtmosphere(state.zM);
  const qPa = dynamicPressurePa(atmosphere.densityKgM3, vMs);
  const dragN = qPa * vehicle.referenceAreaM2 * vehicle.dragCoefficient;
  const heatingRateWm2 =
    HEATING_CORRELATION *
    Math.sqrt(Math.max(atmosphere.densityKgM3, 0) / Math.max(vehicle.noseRadiusM, 0.1)) *
    Math.pow(vMs, 3);

  const dragAx = (-dragN * state.vxMs) / vMs / state.massKg;
  const dragAz = (-dragN * state.vzMs) / vMs / state.massKg;

  const bankRad = vehicle.bankAngleDeg * DEG_TO_RAD;
  const liftN = state.phase === "boost" ? 0 : dragN * vehicle.liftToDrag;
  let normalX = -state.vzMs / vMs;
  let normalZ = state.vxMs / vMs;
  if (normalZ < 0) {
    normalX *= -1;
    normalZ *= -1;
  }

  const verticalLiftN = liftN * Math.cos(bankRad);
  const liftAx = (verticalLiftN * normalX) / state.massKg;
  const liftAz = (verticalLiftN * normalZ) / state.massKg;

  const thrustN =
    state.phase === "boost" && state.propellantRemainingKg > 0 ? mission.boostThrustN : 0;
  const pitchRad = boostPitchRad(state, mission);
  const thrustAx = (thrustN * Math.cos(pitchRad)) / state.massKg;
  const thrustAz = (thrustN * Math.sin(pitchRad)) / state.massKg;

  const gravityMs2 = gravityAtAltitude(state.zM);
  const axMs2 = dragAx + liftAx + thrustAx;
  const azMs2 = dragAz + liftAz + thrustAz - gravityMs2;
  const specificForceG =
    Math.sqrt(
      Math.pow(dragAx + liftAx + thrustAx, 2) + Math.pow(dragAz + liftAz + thrustAz, 2)
    ) / STANDARD_GRAVITY_MS2;

  return {
    axMs2,
    azMs2,
    specificForceG,
    dynamicPressurePa: qPa,
    heatingRateWm2,
    mach: vMs / atmosphere.speedOfSoundMs
  };
}

function boostPitchRad(state: IntegratorState, mission: MissionConfig): number {
  if (state.phase !== "boost") {
    return Math.atan2(state.vzMs, state.vxMs);
  }

  const progress = Math.min(1, state.timeSeconds / Math.max(mission.boostBurnSeconds, 1));
  const initial = mission.launchAngleDeg * DEG_TO_RAD;
  const terminal = 18 * DEG_TO_RAD;
  return initial + (terminal - initial) * Math.pow(progress, 0.85);
}

function stepState(
  state: IntegratorState,
  vehicle: VehicleConfig,
  mission: MissionConfig,
  forces: ForceResult
) {
  const dt = mission.timeStepSeconds;
  const vMs = speed(state.vxMs, state.vzMs);

  if (state.phase === "boost" && state.propellantRemainingKg > 0) {
    const massFlowKgS = mission.boostThrustN / (mission.rocketIspSeconds * STANDARD_GRAVITY_MS2);
    const consumedKg = Math.min(state.propellantRemainingKg, massFlowKgS * dt);
    state.propellantRemainingKg -= consumedKg;
    state.massKg -= consumedKg;
  }

  state.vxMs += forces.axMs2 * dt;
  state.vzMs += forces.azMs2 * dt;
  state.xM += state.vxMs * dt;
  state.zM += state.vzMs * dt;

  const bankCrossrangeFactor = state.phase === "boost" ? 0 : Math.sin(vehicle.bankAngleDeg * DEG_TO_RAD) * 0.18;
  state.crossrangeM += Math.max(0, state.vxMs) * bankCrossrangeFactor * dt;
  state.heatLoadJm2 += forces.heatingRateWm2 * dt;
  state.timeSeconds += dt;

  if (vMs < 30 && state.phase !== "boost") {
    state.vxMs = Math.max(state.vxMs, 30);
  }
}

function pointFromState(
  state: IntegratorState,
  vehicle: VehicleConfig,
  forces: ForceResult
): SimulationPoint {
  const velocityMs = speed(state.vxMs, state.vzMs);

  return {
    timeSeconds: state.timeSeconds,
    phase: state.phase,
    altitudeM: Math.max(0, state.zM),
    downrangeM: Math.max(0, state.xM),
    crossrangeM: Math.max(0, state.crossrangeM),
    velocityMs,
    mach: forces.mach,
    flightPathAngleDeg: Math.atan2(state.vzMs, Math.max(Math.abs(state.vxMs), 1)) * RAD_TO_DEG,
    massKg: state.massKg,
    dynamicPressurePa: forces.dynamicPressurePa,
    heatingRateWm2: forces.heatingRateWm2,
    heatLoadJm2: state.heatLoadJm2,
    gLoad: forces.specificForceG,
    propellantRemainingKg: Math.max(0, state.propellantRemainingKg)
  };
}

function summarize(points: SimulationPoint[], vehicle: VehicleConfig): SimulationSummary {
  const finalPoint = points[points.length - 1];
  const initialMassKg = vehicle.dryMassKg + vehicle.payloadMassKg + vehicle.propellantMassKg;

  return {
    downrangeKm: finalPoint ? finalPoint.downrangeM / 1000 : 0,
    crossrangeKm: finalPoint ? finalPoint.crossrangeM / 1000 : 0,
    missionDurationSeconds: finalPoint?.timeSeconds ?? 0,
    payloadFractionPercent: (vehicle.payloadMassKg / initialMassKg) * 100,
    propellantUsedKg: vehicle.propellantMassKg - (finalPoint?.propellantRemainingKg ?? vehicle.propellantMassKg),
    finalVelocityMs: finalPoint?.velocityMs ?? 0,
    finalAltitudeM: finalPoint?.altitudeM ?? 0
  };
}

function summarizeConstraints(points: SimulationPoint[], vehicle: VehicleConfig): ConstraintSummary {
  const peakMach = maxBy(points, (point) => point.mach);
  const peakDynamicPressurePa = maxBy(points, (point) => point.dynamicPressurePa);
  const peakHeatingRateWm2 = maxBy(points, (point) => point.heatingRateWm2);
  const totalHeatLoadJm2 = points[points.length - 1]?.heatLoadJm2 ?? 0;
  const peakGLoad = maxBy(points, (point) => point.gLoad);
  const thermalProtectionMassKg =
    vehicle.referenceAreaM2 *
    (vehicle.thermal.thermalProtectionBaseKgM2 + (totalHeatLoadJm2 / 100000000) * 0.85);

  const margins = [
    1 - peakDynamicPressurePa / vehicle.thermal.maxDynamicPressurePa,
    1 - peakHeatingRateWm2 / vehicle.thermal.peakHeatingWm2,
    1 - totalHeatLoadJm2 / vehicle.thermal.totalHeatLoadJm2,
    1 - peakGLoad / vehicle.thermal.maxG
  ];

  const violations: string[] = [];
  if (peakDynamicPressurePa > vehicle.thermal.maxDynamicPressurePa) {
    violations.push("dynamic pressure");
  }
  if (peakHeatingRateWm2 > vehicle.thermal.peakHeatingWm2) {
    violations.push("peak heating");
  }
  if (totalHeatLoadJm2 > vehicle.thermal.totalHeatLoadJm2) {
    violations.push("heat load");
  }
  if (peakGLoad > vehicle.thermal.maxG) {
    violations.push("g-load");
  }

  return {
    peakMach,
    peakDynamicPressurePa,
    peakHeatingRateWm2,
    totalHeatLoadJm2,
    peakGLoad,
    thermalProtectionMassKg,
    reusabilityMarginPercent: Math.min(...margins) * 100,
    violations
  };
}

function markerFromState(state: IntegratorState, phase: MissionPhase, reason: string): PhaseMarker {
  return {
    phase,
    timeSeconds: state.timeSeconds,
    altitudeM: Math.max(0, state.zM),
    downrangeM: Math.max(0, state.xM),
    reason
  };
}

function phaseReason(phase: MissionPhase): string {
  switch (phase) {
    case "coast":
      return "Rocket cutoff / coast";
    case "entry":
      return "Entry heating corridor";
    case "glide":
      return "Aerodynamic glide and energy management";
    case "terminal":
      return "Terminal atmospheric energy management";
    case "boost":
    default:
      return "Rocket boost";
  }
}

function gravityAtAltitude(altitudeM: number): number {
  return STANDARD_GRAVITY_MS2 * Math.pow(EARTH_RADIUS_M / (EARTH_RADIUS_M + Math.max(0, altitudeM)), 2);
}

function speed(vxMs: number, vzMs: number): number {
  return Math.sqrt(vxMs * vxMs + vzMs * vzMs);
}

function maxBy(points: SimulationPoint[], accessor: (point: SimulationPoint) => number): number {
  return points.reduce((currentMax, point) => Math.max(currentMax, accessor(point)), 0);
}
