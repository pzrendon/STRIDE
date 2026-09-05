/**
 * Bundled copies of regulatory/part450/*.yaml
 *
 * The YAML files on disk are the ones humans should edit. Tests will fail
 * if these strings drift. The browser can't read ../../regulatory at
 * runtime, so we ship the text here and parse it.
 */

export const BUNDLED_REQUIREMENTS_YAML = `# Part 450 regulatory catalog — PLACEHOLDER
#
# This file is the version-controlled home for 14 CFR Part 450 citations.
# Analysis code must read thresholds and requirement text from here (or from
# a future updated copy). Do not paste "remembered" FAA language into the
# TypeScript. If a field is unknown, leave it null / PLACEHOLDER.
#
# schema fields that every entry should eventually have:
#   citation, source, effective_date, revision, verification_date

schema_version: 1
regulation: "14 CFR Part 450"
title: "Launch and Reentry License Requirements — placeholder catalog"
disclaimer: >
  Entries below are structural placeholders for STRIDE configuration control.
  They are not a substitute for the Code of Federal Regulations. Insert
  authoritative section citations and requirement text before any licensing use.
source: PLACEHOLDER
effective_date: null
revision: unverified-placeholder
verification_date: null

entries:
  - id: PART450-PLACEHOLDER-FLIGHT-SAFETY-ANALYSIS
    citation: "14 CFR Part 450 — PLACEHOLDER: insert flight safety analysis section"
    title: "PLACEHOLDER: Flight safety analysis"
    requirement_text: "PLACEHOLDER: insert authoritative regulatory text"
    source: PLACEHOLDER
    effective_date: null
    revision: unverified-placeholder
    verification_date: null
    notes: "Hook for trajectory, debris, and containment evidence from STRIDE."

  - id: PART450-PLACEHOLDER-PUBLIC-RISK
    citation: "14 CFR Part 450 — PLACEHOLDER: insert public risk / expected casualty section"
    title: "PLACEHOLDER: Public risk criteria"
    requirement_text: "PLACEHOLDER: insert authoritative regulatory text"
    source: PLACEHOLDER
    effective_date: null
    revision: unverified-placeholder
    verification_date: null
    notes: "Numeric thresholds live in criteria.yaml, not in the risk equations."

  - id: PART450-PLACEHOLDER-HAZARD-ANALYSIS
    citation: "14 CFR Part 450 — PLACEHOLDER: insert hazard analysis / system safety section"
    title: "PLACEHOLDER: Hazard analysis"
    requirement_text: "PLACEHOLDER: insert authoritative regulatory text"
    source: PLACEHOLDER
    effective_date: null
    revision: unverified-placeholder
    verification_date: null
    notes: "Trace hazards in the register to this ID once a real citation exists."

  - id: PART450-PLACEHOLDER-FLIGHT-SAFETY-SYSTEM
    citation: "14 CFR Part 450 — PLACEHOLDER: insert FSS / AFSS section"
    title: "PLACEHOLDER: Flight safety system"
    requirement_text: "PLACEHOLDER: insert authoritative regulatory text"
    source: PLACEHOLDER
    effective_date: null
    revision: unverified-placeholder
    verification_date: null
    notes: "Commanded termination and AFSS flags on the CONOPS object."

  - id: PART450-PLACEHOLDER-CONTAINMENT
    citation: "14 CFR Part 450 — PLACEHOLDER: insert containment / hazard area section"
    title: "PLACEHOLDER: Debris containment and hazard areas"
    requirement_text: "PLACEHOLDER: insert authoritative regulatory text"
    source: PLACEHOLDER
    effective_date: null
    revision: unverified-placeholder
    verification_date: null
    notes: "Keep-out polygons and impact-containment constraints hang off this ID."

  - id: PART450-PLACEHOLDER-TRAJECTORY-ANALYSIS
    citation: "14 CFR Part 450 — PLACEHOLDER: insert trajectory analysis section"
    title: "PLACEHOLDER: Trajectory analysis"
    requirement_text: "PLACEHOLDER: insert authoritative regulatory text"
    source: PLACEHOLDER
    effective_date: null
    revision: unverified-placeholder
    verification_date: null
    notes: "Sea Turtle nominal + off-nominal trajectories are the current evidence source."

  - id: PART450-PLACEHOLDER-APPLICATION-EVIDENCE
    citation: "14 CFR Part 450 — PLACEHOLDER: insert application / compliance demonstration section"
    title: "PLACEHOLDER: Application evidence"
    requirement_text: "PLACEHOLDER: insert authoritative regulatory text"
    source: PLACEHOLDER
    effective_date: null
    revision: unverified-placeholder
    verification_date: null
    notes: "Compliance matrix rows should point here once real section numbers are filled in."
`;

export const BUNDLED_CRITERIA_YAML = `# Public-risk / flight-safety numeric criteria — PLACEHOLDER
#
# STRIDE will not guess FAA limits. If a threshold has not been entered from
# an authoritative source, the UI and reports print REGULATORY VALUE REQUIRED
# instead of a number. Analysis code compares against these fields; it does
# not hard-code 1e-4 / 1e-6 / etc.

schema_version: 1
regulation: "14 CFR Part 450"
disclaimer: >
  Threshold values are intentionally null until an authoritative, dated source
  is recorded. Do not fill these in from memory.
source: PLACEHOLDER
effective_date: null
revision: unverified-placeholder
verification_date: null
unspecified_display: REGULATORY VALUE REQUIRED

criteria:
  - id: expected_casualties
    name: Expected casualties (Ec)
    quantity: expected_casualties
    threshold: null
    units: expected_casualties
    citation: "14 CFR Part 450 — PLACEHOLDER: insert Ec criterion citation"
    source: PLACEHOLDER
    effective_date: null
    revision: unverified-placeholder
    verification_date: null
    notes: "Conceptual Ec is summed in lib/part450/risk.ts; pass/fail is not asserted without a threshold."

  - id: individual_risk
    name: Individual risk
    quantity: individual_risk
    threshold: null
    units: probability_per_mission
    citation: "14 CFR Part 450 — PLACEHOLDER: insert individual risk citation"
    source: PLACEHOLDER
    effective_date: null
    revision: unverified-placeholder
    verification_date: null
    notes: null

  - id: collective_risk
    name: Collective risk
    quantity: collective_risk
    threshold: null
    units: expected_casualties
    citation: "14 CFR Part 450 — PLACEHOLDER: insert collective risk citation"
    source: PLACEHOLDER
    effective_date: null
    revision: unverified-placeholder
    verification_date: null
    notes: null

  - id: aircraft_risk
    name: Aircraft risk
    quantity: aircraft_risk
    threshold: null
    units: expected_casualties
    citation: "14 CFR Part 450 — PLACEHOLDER: insert aircraft risk citation"
    source: PLACEHOLDER
    effective_date: null
    revision: unverified-placeholder
    verification_date: null
    notes: "Not implemented in the MVP. Left as an interface only."

  - id: maritime_risk
    name: Ship / maritime exposure
    quantity: maritime_risk
    threshold: null
    units: expected_casualties
    citation: "14 CFR Part 450 — PLACEHOLDER: insert maritime risk citation"
    source: PLACEHOLDER
    effective_date: null
    revision: unverified-placeholder
    verification_date: null
    notes: "Not implemented in the MVP. Left as an interface only."
`;

export const BUNDLED_APPLICABILITY_YAML = `# Which placeholder requirements apply to which operation types.
# Update this without touching the analysis libraries.

schema_version: 1
regulation: "14 CFR Part 450"
disclaimer: >
  Applicability flags are engineering bookkeeping for STRIDE, not a legal
  determination of what Part 450 requires for a given operator.
source: PLACEHOLDER
effective_date: null
revision: unverified-placeholder
verification_date: null

operations:
  - id: reentry
    label: Reentry operation
    default_applicable_requirement_ids:
      - PART450-PLACEHOLDER-FLIGHT-SAFETY-ANALYSIS
      - PART450-PLACEHOLDER-PUBLIC-RISK
      - PART450-PLACEHOLDER-HAZARD-ANALYSIS
      - PART450-PLACEHOLDER-FLIGHT-SAFETY-SYSTEM
      - PART450-PLACEHOLDER-CONTAINMENT
      - PART450-PLACEHOLDER-TRAJECTORY-ANALYSIS
      - PART450-PLACEHOLDER-APPLICATION-EVIDENCE

  - id: launch
    label: Launch operation
    default_applicable_requirement_ids:
      - PART450-PLACEHOLDER-FLIGHT-SAFETY-ANALYSIS
      - PART450-PLACEHOLDER-PUBLIC-RISK
      - PART450-PLACEHOLDER-HAZARD-ANALYSIS
      - PART450-PLACEHOLDER-FLIGHT-SAFETY-SYSTEM
      - PART450-PLACEHOLDER-CONTAINMENT
      - PART450-PLACEHOLDER-TRAJECTORY-ANALYSIS
      - PART450-PLACEHOLDER-APPLICATION-EVIDENCE
`;
