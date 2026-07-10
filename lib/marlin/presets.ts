import type { MissionConfig, VehicleConfig } from "./types";

export const VEHICLE_PRESETS: VehicleConfig[] = [
  {
    id: "capsule",
    name: "Blunt Capsule",
    archetype: "capsule",
    dryMassKg: 5200,
    payloadMassKg: 650,
    propellantMassKg: 3200,
    referenceAreaM2: 13,
    dragCoefficient: 1.05,
    liftToDrag: 0.25,
    noseRadiusM: 1.2,
    bankAngleDeg: 8,
    thermal: {
      peakHeatingWm2: 2400000,
      totalHeatLoadJm2: 900000000,
      maxG: 8,
      maxDynamicPressurePa: 80000,
      thermalProtectionBaseKgM2: 18
    }
  },
  {
    id: "lifting-body",
    name: "Lifting Body",
    archetype: "lifting-body",
    dryMassKg: 9200,
    payloadMassKg: 1200,
    propellantMassKg: 7600,
    referenceAreaM2: 29,
    dragCoefficient: 0.62,
    liftToDrag: 1.15,
    noseRadiusM: 0.75,
    bankAngleDeg: 32,
    thermal: {
      peakHeatingWm2: 1800000,
      totalHeatLoadJm2: 700000000,
      maxG: 5.5,
      maxDynamicPressurePa: 65000,
      thermalProtectionBaseKgM2: 14
    }
  },
  {
    id: "spaceplane",
    name: "Reusable Spaceplane",
    archetype: "spaceplane",
    dryMassKg: 18500,
    payloadMassKg: 2200,
    propellantMassKg: 23000,
    referenceAreaM2: 62,
    dragCoefficient: 0.42,
    liftToDrag: 1.85,
    noseRadiusM: 0.55,
    bankAngleDeg: 45,
    thermal: {
      peakHeatingWm2: 1350000,
      totalHeatLoadJm2: 540000000,
      maxG: 4,
      maxDynamicPressurePa: 52000,
      thermalProtectionBaseKgM2: 11
    }
  }
];

export const DEFAULT_MISSION: MissionConfig = {
  id: "concept-boost-glide",
  name: "Conceptual Rocket Boost + Entry Glide",
  timeStepSeconds: 2,
  boostBurnSeconds: 96,
  boostThrustN: 950000,
  rocketIspSeconds: 335,
  launchAngleDeg: 57,
  entryInterfaceAltitudeM: 80000,
  terminalAltitudeM: 12000,
  terminalVelocityMs: 850,
  maxSimulationSeconds: 2600
};

export const OUTPUT_OPTIONS = [
  { id: "altitudeMach", label: "Altitude and Mach" },
  { id: "velocity", label: "Velocity" },
  { id: "dynamicPressure", label: "Dynamic pressure" },
  { id: "heating", label: "Heating rate and heat load" },
  { id: "gLoad", label: "Acceleration / g-load" },
  { id: "range", label: "Downrange and cross-range" }
] as const;

export type OutputOptionId = (typeof OUTPUT_OPTIONS)[number]["id"];
