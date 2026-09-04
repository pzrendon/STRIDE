import type { Hazard } from "./types";

/**
 * Example reentry hazards. These are a starter list, not a closed taxonomy —
 * the register is just an array of Hazard objects, so add whatever you need.
 */
export function exampleReentryHazards(): Hazard[] {
  const fss = "PART450-PLACEHOLDER-FLIGHT-SAFETY-SYSTEM";
  const hzd = "PART450-PLACEHOLDER-HAZARD-ANALYSIS";
  const fsa = "PART450-PLACEHOLDER-FLIGHT-SAFETY-ANALYSIS";
  const cnt = "PART450-PLACEHOLDER-CONTAINMENT";
  const rsk = "PART450-PLACEHOLDER-PUBLIC-RISK";

  return [
    hazard("HAZ-PROP-001", "Propulsion failure during deorbit", "Deorbit burn abort or underperformance", "Engine, feed system, or command error", "deorbit", "Off-nominal entry interface energy / flight-path angle", "critical", "mission-specific", "Redundant deorbit capability; burn monitoring", "Requires vehicle FMEA — not produced by STRIDE", "open", [hzd, fsa]),
    hazard("HAZ-PROP-002", "Loss of thrust", "Thrust goes to zero while still needing ΔV", "Engine-out, premature cutoff", "deorbit", "Missed deorbit or shallow entry / skip risk", "critical", "mission-specific", "Contingency deorbit window; disposal plan", "External propulsion reliability data", "open", [hzd, fsa]),
    hazard("HAZ-PROP-003", "Unintended thrust", "Thruster or engine fires off-nominal", "Stuck valve, GNC command error", "exoatmospheric", "Trajectory departs the planned corridor", "catastrophic", "mission-specific", "Inhibits; commanded termination if applicable", "FSS design evidence required externally", "open", [hzd, fss]),
    hazard("HAZ-GNC-001", "GNC failure", "Onboard guidance/navigation/control lost", "Computer, sensor, or software fault", "hypersonic_entry", "Uncontrolled attitude or targeting miss", "catastrophic", "mission-specific", "Safe-hold modes; AFSS rules if present", "GNC FMEA / software assurance — external", "open", [hzd, fss]),
    hazard("HAZ-GNC-002", "Loss of attitude control", "RCS or aero control ineffective", "Actuator, propellant, or aero-control failure", "hypersonic_entry", "Tumbling; possible breakup or large footprint", "catastrophic", "mission-specific", "Rate-damping RCS; robust aero stability", "6-DOF stability analysis not in this module", "open", [hzd, fsa]),
    hazard("HAZ-STR-001", "Structural breakup", "Vehicle breaks up under aero/thermal load", "Loads exceed capability; pre-existing damage", "hypersonic_entry", "Multiple debris fragments, wider impact field", "catastrophic", "mission-specific", "Load-alleviating trajectory; structural margins", "Conceptual debris model only in MVP", "open", [cnt, fsa]),
    hazard("HAZ-TPS-001", "Thermal protection failure", "TPS breach during entry heating", "Under-designed TPS, damage, or hot-gas ingestion", "hypersonic_entry", "Loss of vehicle, possible breakup", "catastrophic", "mission-specific", "TPS margins vs. heating estimate", "Sea Turtle heating is Sutton–Graves-style, not a TPS size code", "open", [hzd, fsa]),
    hazard("HAZ-SEP-001", "Stage / separation failure", "Failed staging or payload/chute extract", "Pyro or mechanism fault", "terminal_descent", "Wrong aero configuration; off-nominal landing", "critical", "mission-specific", "Redundant release; inhibit logic", "External mechanism reliability data", "open", [hzd]),
    hazard("HAZ-NAV-001", "Navigation error", "State estimate biased or diverged", "IMU/GPS fault, poor ephemeris", "deorbit", "Landing / impact outside the recovery area", "major", "mission-specific", "Nav filter monitoring; wider containment", "Guidance-failure scenario in this module", "watching", [fsa, cnt]),
    hazard("HAZ-COM-001", "Communication loss", "No command or telemetry path", "Antenna, power, or geometry", "hypersonic_entry", "Cannot command terminate; lost tracking", "major", "mission-specific", "AFSS if no command path; redundant links", "Link analysis is out of scope", "open", [fss]),
    hazard("HAZ-FSS-001", "Flight safety system failure", "FSS/AFSS does not terminate when required", "Hardware, software, or inhibit error", "hypersonic_entry", "Uncontained hazard if already off-nominal", "catastrophic", "mission-specific", "FSS independence and inhibits", "FSS design is REQUIRES_EXTERNAL_EVIDENCE", "open", [fss]),
    hazard("HAZ-REC-001", "Parachute / recovery failure", "Chute fails to deploy or inflates incorrectly", "Mortar, bridle, or canopy fault", "terminal_descent", "High-energy impact, possibly outside recovery zone", "critical", "mission-specific", "Redundant chutes; recovery-zone sizing", "Chute-off trajectory is modeled in Sea Turtle", "watching", [fsa, cnt]),
    hazard("HAZ-REC-002", "Landing outside the designated recovery area", "Touchdown / impact misses the recovery zone", "Nav error, winds, chute fail, or aero uncertainty", "recovery", "Public exposure if the miss is toward shore", "major", "mission-specific", "Corridor + recovery-zone constraints", "Constraint checker flags misses", "watching", [cnt, rsk])
  ];
}

function hazard(
  id: string,
  description: string,
  initiatingEvent: string,
  cause: string,
  affectedPhase: string,
  consequence: string,
  severity: Hazard["severity"],
  likelihood: string,
  mitigation: string,
  verificationEvidence: string,
  status: Hazard["status"],
  associatedRequirementIds: string[]
): Hazard {
  return {
    id,
    description,
    initiatingEvent,
    cause,
    affectedPhase,
    consequence,
    severity,
    likelihood,
    mitigation,
    verificationEvidence,
    residualRisk: "Not quantified — qualitative only in the MVP",
    associatedRequirementIds,
    status
  };
}

export function upsertHazard(register: Hazard[], next: Hazard): Hazard[] {
  const index = register.findIndex((item) => item.id === next.id);
  if (index === -1) return [...register, next];
  const copy = register.slice();
  copy[index] = next;
  return copy;
}

export function hazardById(register: Hazard[], id: string): Hazard | undefined {
  return register.find((item) => item.id === id);
}
