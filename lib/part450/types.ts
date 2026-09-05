import type { SeaTurtleConfig, SeaTurtleResult, TrajectorySample } from "../sea-turtle";
import type { Part450Catalog } from "./regulatory";

export type OperationType = "launch" | "reentry";

export type MissionPhaseName =
  | "pre_flight"
  | "deorbit"
  | "exoatmospheric"
  | "entry_interface"
  | "hypersonic_entry"
  | "terminal_descent"
  | "recovery"
  | "disposal";

export interface GeoPoint {
  name: string;
  latitudeDeg: number;
  longitudeDeg: number;
}

export interface VehicleStage {
  id: string;
  name: string;
  massKg: number;
  referenceAreaM2: number;
  cd: number;
  role: string;
}

export interface MissionEvent {
  id: string;
  name: string;
  phase: MissionPhaseName;
  kind:
    | "propulsion"
    | "staging"
    | "entry_interface"
    | "reentry"
    | "descent"
    | "landing"
    | "disposal"
    | "termination"
    | "other";
  /** Seconds from simulation t=0. Null means "derive from the trajectory after the run". */
  timeSeconds: number | null;
  notes?: string;
}

export interface FlightSafetyCapabilities {
  commandedTermination: boolean;
  autonomousFlightSafetySystem: boolean;
  notes: string;
}

export interface MissionSafetyConfig {
  id: string;
  name: string;
  operationType: OperationType;
  site: GeoPoint;
  recoveryLocation: GeoPoint;
  vehicleName: string;
  vehicleDescription: string;
  stages: VehicleStage[];
  seaTurtle: SeaTurtleConfig;
  timeline: MissionEvent[];
  capabilities: FlightSafetyCapabilities;
  notes: string;
}

export type HazardStatus = "open" | "mitigated" | "accepted" | "watching";

export type HazardSeverity = "catastrophic" | "critical" | "major" | "minor" | "negligible";

export interface Hazard {
  id: string;
  description: string;
  initiatingEvent: string;
  cause: string;
  affectedPhase: MissionPhaseName | string;
  consequence: string;
  severity: HazardSeverity;
  /** Qualitative or quantitative. We don't pretend these bins are FAA categories. */
  likelihood: string;
  mitigation: string;
  verificationEvidence: string;
  residualRisk: string;
  associatedRequirementIds: string[];
  associatedHazardIds?: string[];
  status: HazardStatus;
}

export interface FailureScenario {
  id: string;
  name: string;
  failureTimeSeconds: number;
  failureType: string;
  affectedSubsystem: string;
  parameterChanges: Record<string, number | boolean | string>;
  probability: number;
  associatedHazardId?: string;
  notes: string;
}

export interface DebrisFragment {
  id: string;
  massKg: number;
  referenceAreaM2: number;
  ballisticCoefficientKgM2: number;
  cd: number;
  breakupTimeSeconds: number;
  probabilityWeight: number;
  initialState: TrajectorySample;
  notes?: string;
}

export interface DebrisImpact {
  fragmentId: string;
  latitudeDeg: number;
  longitudeDeg: number;
  velocityMs: number;
  kineticEnergyJ: number;
  probabilityWeight: number;
}

export interface DebrisFootprint {
  fidelity: "conceptual_preliminary";
  disclaimer: string;
  fragments: DebrisFragment[];
  impacts: DebrisImpact[];
  meanLatitudeDeg: number;
  meanLongitudeDeg: number;
  /** Rough 1-sigma / 2-sigma radii in km. Only meaningful with a handful of points. */
  contourRadiiKm: { oneSigma: number; twoSigma: number };
}

export interface PopulationCell {
  id: string;
  latitudeDeg: number;
  longitudeDeg: number;
  halfWidthDeg: number;
  halfHeightDeg: number;
  population: number;
}

export interface AirportRecord {
  id: string;
  name: string;
  latitudeDeg: number;
  longitudeDeg: number;
}

export interface GeographicDataset {
  id: string;
  kind: "synthetic" | "user_provided";
  notes: string;
  population: PopulationCell[];
  airports: AirportRecord[];
  airways: GeoPoint[][];
  maritimeRoutes: GeoPoint[][];
  protectedAreas: GeoPoint[][];
}

export type SafetyConstraintKind =
  | "trajectory_corridor"
  | "keep_out"
  | "hazard_area"
  | "impact_containment"
  | "flight_termination"
  | "autonomous_flight_safety"
  | "recovery_zone";

export interface SafetyConstraint {
  id: string;
  name: string;
  kind: SafetyConstraintKind;
  associatedHazardId?: string;
  associatedRequirementId?: string;
  notes?: string;
  /** Circle in km. Used by recovery_zone / containment. */
  center?: GeoPoint;
  radiusKm?: number;
  /** Closed polygon in lat/lon. Used by keep_out / hazard_area. */
  polygon?: GeoPoint[];
  /** Max distance from the nominal ground track, km. */
  corridorWidthKm?: number;
}

export interface ConstraintEvaluation {
  constraintId: string;
  constraintName: string;
  kind: SafetyConstraintKind;
  violated: boolean;
  violationTimeSeconds: number | null;
  vehicleState: TrajectorySample | null;
  location: GeoPoint | null;
  associatedHazardId: string | null;
  associatedRequirementId: string | null;
  notes: string;
}

export type ComplianceStatus =
  | "NOT_ASSESSED"
  | "NOT_APPLICABLE"
  | "IN_WORK"
  | "ANALYSIS_COMPLETE"
  | "EVIDENCE_AVAILABLE"
  | "REQUIRES_EXTERNAL_EVIDENCE";

export interface ComplianceEntry {
  id: string;
  requirementId: string;
  regulationReference: string;
  requirementTitle: string;
  applicability: "applicable" | "not_applicable" | "unknown";
  complianceApproach: string;
  strideTool: string;
  evidenceArtifact: string;
  status: ComplianceStatus;
  assumptions: string;
  comments: string;
  associatedHazardIds: string[];
}

export interface RiskContribution {
  scenarioId: string;
  probabilityOfFailure: number;
  probabilityOfImpact: number;
  probabilityOfCasualty: number;
  nExposed: number;
  expectedCasualties: number;
  notes: string;
}

export interface CriterionComparison {
  criterionId: string;
  name: string;
  computed: number | null;
  thresholdDisplay: string;
  assessed: boolean;
}

export interface PublicRiskResult {
  fidelity: "conceptual";
  equation: "Ec = Σ(P_failure × P_impact × P_casualty × N_exposed)";
  expectedCasualties: number;
  individualRisk: number | null;
  collectiveRisk: number | null;
  aircraftRisk: "NOT_IMPLEMENTED";
  maritimeRisk: "NOT_IMPLEMENTED";
  contributions: RiskContribution[];
  comparisons: CriterionComparison[];
  notes: string[];
}

export interface FailureRun {
  scenario: FailureScenario;
  trajectory: SeaTurtleResult;
}

export interface MonteCarloOptions {
  enabled: boolean;
  samples: number;
  seed: number;
}

export interface SafetyAssessment {
  mission: MissionSafetyConfig;
  catalog: Part450Catalog;
  nominal: SeaTurtleResult;
  hazards: Hazard[];
  failureRuns: FailureRun[];
  debris: DebrisFootprint;
  geography: GeographicDataset;
  risk: PublicRiskResult;
  constraints: SafetyConstraint[];
  constraintEvaluations: ConstraintEvaluation[];
  compliance: ComplianceEntry[];
  monteCarlo: MonteCarloOptions;
  generatedAtIso: string;
}
