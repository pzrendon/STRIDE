import type { Part450Catalog } from "./regulatory";
import type { ComplianceEntry, ComplianceStatus, Hazard, OperationType } from "./types";

export const COMPLIANCE_STATUSES: ComplianceStatus[] = [
  "NOT_ASSESSED",
  "NOT_APPLICABLE",
  "IN_WORK",
  "ANALYSIS_COMPLETE",
  "EVIDENCE_AVAILABLE",
  "REQUIRES_EXTERNAL_EVIDENCE"
];

export function serializeComplianceMatrix(entries: ComplianceEntry[]): string {
  return JSON.stringify({ schema: "stride.part450.compliance.v1", entries }, null, 2);
}

export function parseComplianceMatrix(json: string): ComplianceEntry[] {
  const parsed = JSON.parse(json) as { entries?: ComplianceEntry[] };
  if (!Array.isArray(parsed?.entries)) {
    throw new Error("compliance matrix JSON missing entries[]");
  }
  for (const entry of parsed.entries) {
    if (!entry.id || !entry.requirementId || !entry.status) {
      throw new Error(`compliance entry missing id/requirementId/status: ${JSON.stringify(entry)}`);
    }
    if (!COMPLIANCE_STATUSES.includes(entry.status)) {
      throw new Error(`unknown compliance status ${entry.status}`);
    }
  }
  return parsed.entries;
}

export function buildComplianceMatrix(input: {
  catalog: Part450Catalog;
  operationType: OperationType;
  hazards: Hazard[];
}): ComplianceEntry[] {
  const applicable =
    input.catalog.operations.find((op) => op.id === input.operationType)?.defaultApplicableRequirementIds ?? [];

  return input.catalog.requirements.map((req) => {
    const isApplicable = applicable.includes(req.id);
    const linkedHazards = input.hazards.filter((hazard) => hazard.associatedRequirementIds.includes(req.id));

    return {
      id: `CM-${req.id}`,
      requirementId: req.id,
      regulationReference: req.citation,
      requirementTitle: req.title,
      applicability: isApplicable ? "applicable" : "unknown",
      complianceApproach: approachFor(req.id),
      strideTool: toolFor(req.id),
      evidenceArtifact: artifactFor(req.id),
      status: statusFor(req.id, isApplicable),
      assumptions: "Requirement text is a PLACEHOLDER until YAML is updated from the CFR.",
      comments: req.notes ?? "",
      associatedHazardIds: linkedHazards.map((hazard) => hazard.id)
    };
  });
}

function approachFor(requirementId: string): string {
  switch (requirementId) {
    case "PART450-PLACEHOLDER-TRAJECTORY-ANALYSIS":
      return "Nominal + off-nominal Sea Turtle ballistic trajectories.";
    case "PART450-PLACEHOLDER-HAZARD-ANALYSIS":
      return "Structured hazard register with traceability to requirement IDs.";
    case "PART450-PLACEHOLDER-PUBLIC-RISK":
      return "Conceptual Ec sum using synthetic population. Criteria come from criteria.yaml.";
    case "PART450-PLACEHOLDER-CONTAINMENT":
      return "Recovery-zone / keep-out / corridor constraint checks on impact states.";
    case "PART450-PLACEHOLDER-FLIGHT-SAFETY-ANALYSIS":
      return "End-to-end mission safety workflow (trajectory, debris, risk, constraints).";
    case "PART450-PLACEHOLDER-FLIGHT-SAFETY-SYSTEM":
      return "CONOPS flags for commanded termination / AFSS; no FSS design in STRIDE.";
    case "PART450-PLACEHOLDER-APPLICATION-EVIDENCE":
      return "Generated markdown safety report + machine-readable compliance JSON.";
    default:
      return "Not yet mapped.";
  }
}

function toolFor(requirementId: string): string {
  switch (requirementId) {
    case "PART450-PLACEHOLDER-TRAJECTORY-ANALYSIS":
      return "Sea Turtle (lib/sea-turtle)";
    case "PART450-PLACEHOLDER-PUBLIC-RISK":
      return "lib/part450/risk.ts";
    case "PART450-PLACEHOLDER-CONTAINMENT":
      return "lib/part450/constraints.ts";
    case "PART450-PLACEHOLDER-HAZARD-ANALYSIS":
      return "lib/part450/hazards.ts";
    default:
      return "lib/part450 workflow";
  }
}

function artifactFor(requirementId: string): string {
  switch (requirementId) {
    case "PART450-PLACEHOLDER-APPLICATION-EVIDENCE":
      return "STRIDE Part 450 Mission Safety Assessment (markdown)";
    case "PART450-PLACEHOLDER-TRAJECTORY-ANALYSIS":
      return "Nominal and failure ground tracks";
    case "PART450-PLACEHOLDER-PUBLIC-RISK":
      return "Conceptual public-risk table";
    default:
      return "In-app dashboard + generated report";
  }
}

function statusFor(requirementId: string, isApplicable: boolean): ComplianceStatus {
  if (!isApplicable) return "NOT_APPLICABLE";
  if (requirementId === "PART450-PLACEHOLDER-FLIGHT-SAFETY-SYSTEM") {
    return "REQUIRES_EXTERNAL_EVIDENCE";
  }
  if (requirementId === "PART450-PLACEHOLDER-APPLICATION-EVIDENCE") {
    return "IN_WORK";
  }
  return "ANALYSIS_COMPLETE";
}
