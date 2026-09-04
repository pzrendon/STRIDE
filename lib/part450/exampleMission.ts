import { DEFAULT_SEA_TURTLE_CONFIG, type SeaTurtleConfig } from "../sea-turtle";
import { exampleReentryConstraints } from "./constraints";
import { exampleReentryFailures } from "./failures";
import { exampleReentryHazards } from "./hazards";
import type { MissionSafetyConfig } from "./types";

/**
 * Reusable ballistic reentry from LEO toward a Florida recovery aimpoint.
 *
 * Sea Turtle is still the propagator (no-lift), so this is a capsule-class
 * vehicle, not the Marlin lifting-body. Mass/area are in the same ballpark
 * as the Marlin "Blunt Capsule" preset so the two modules can talk later.
 */
export function leoReusableReentryMission(): MissionSafetyConfig {
  const seaTurtle: SeaTurtleConfig = {
    ...DEFAULT_SEA_TURTLE_CONFIG,
    missionName: "STRIDE_LEO_reusable_reentry",
    payloadMassKg: 2800,
    startAltKm: 120,
    startVelMps: 7650,
    entryAngleDeg: 3.75,
    targetLat: 28.47,
    targetLon: -80.57,
    tpsDensity: 480,
    tpsThickness: 0.06,
    chuteCd: 1.8,
    shieldCd: 1.15,
    chuteDeployAltM: 6000,
    shockFactorX: 1.6,
    shieldDiameterM: 3.6,
    chuteDiameterM: 14,
    chuteEnabled: true
  };

  return {
    id: "ex-leo-reentry-florida",
    name: "LEO reusable capsule reentry (example)",
    operationType: "reentry",
    site: {
      name: "On-orbit / deorbit initiation (LEO)",
      latitudeDeg: 28.47,
      longitudeDeg: -80.57
    },
    recoveryLocation: {
      name: "Synthetic Florida recovery area",
      latitudeDeg: 28.47,
      longitudeDeg: -80.57
    },
    vehicleName: "STRIDE example reusable capsule",
    vehicleDescription:
      "Conceptual capsule-class reusable reentry vehicle. Ballistic (L/D ≈ 0) for the Sea Turtle MVP. Heat-shield entry, parachute terminal descent, water/coast recovery. Not a real vehicle.",
    stages: [
      {
        id: "entry-vehicle",
        name: "Entry vehicle",
        massKg: 2800,
        referenceAreaM2: Math.PI * (3.6 / 2) ** 2,
        cd: 1.15,
        role: "hypersonic entry / TPS"
      },
      {
        id: "recovery",
        name: "Parachute recovery system",
        massKg: 80,
        referenceAreaM2: Math.PI * (14 / 2) ** 2,
        cd: 1.8,
        role: "terminal descent"
      }
    ],
    seaTurtle,
    timeline: [
      {
        id: "EV-DEORBIT",
        name: "Deorbit maneuver",
        phase: "deorbit",
        kind: "propulsion",
        timeSeconds: null,
        notes: "CONOPS event. Sea Turtle starts at the post-burn entry state, not the burn itself."
      },
      {
        id: "EV-EI",
        name: "Entry interface",
        phase: "entry_interface",
        kind: "entry_interface",
        timeSeconds: 0,
        notes: "Simulation t=0 is the configured start altitude (120 km in this example)."
      },
      {
        id: "EV-HYPER",
        name: "Hypersonic atmospheric entry",
        phase: "hypersonic_entry",
        kind: "reentry",
        timeSeconds: null,
        notes: "Below the Kármán line, heat-shield Cd/A."
      },
      {
        id: "EV-CHUTE",
        name: "Terminal descent / parachute",
        phase: "terminal_descent",
        kind: "descent",
        timeSeconds: null,
        notes: "Chute deploy altitude is a Sea Turtle input (6 km here)."
      },
      {
        id: "EV-LAND",
        name: "Landing / recovery",
        phase: "recovery",
        kind: "landing",
        timeSeconds: null,
        notes: "Aimpoint 28.47 N, 80.57 W. Planar model holds latitude except for failure cross-range."
      },
      {
        id: "EV-DISP",
        name: "Disposal (n/a — recovered)",
        phase: "disposal",
        kind: "disposal",
        timeSeconds: null,
        notes: "Reusable recovery, not an uncontrolled disposal. Left on the timeline so the schema has the slot."
      }
    ],
    capabilities: {
      commandedTermination: false,
      autonomousFlightSafetySystem: false,
      notes: "Example CONOPS does not claim an FSS. Set the flags when a real design has one."
    },
    notes:
      "Example workflow: LEO → deorbit → entry interface → hypersonic entry → chute → recovery. Uses Sea Turtle for the trajectory and synthetic population for risk."
  };
}

export function exampleMissionBundle() {
  const mission = leoReusableReentryMission();
  return {
    mission,
    hazards: exampleReentryHazards(),
    failures: exampleReentryFailures(),
    constraints: exampleReentryConstraints(mission.recoveryLocation)
  };
}
