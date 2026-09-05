import { PART450_DISCLAIMER } from "./regulatory";
import type { SafetyAssessment } from "./types";

export function generateSafetyReport(assessment: SafetyAssessment): string {
  const { mission, nominal, hazards, failureRuns, debris, risk, constraintEvaluations, compliance } = assessment;
  const lines: string[] = [];

  const h = (title: string) => {
    lines.push("", `## ${title}`, "");
  };

  lines.push("# STRIDE Part 450 Mission Safety Assessment");
  lines.push("");
  lines.push(`_Generated ${assessment.generatedAtIso}_`);
  lines.push("");
  lines.push(`**${PART450_DISCLAIMER}**`);
  lines.push("");
  lines.push(`Mission: **${mission.name}** (${mission.id})`);
  lines.push(`Operation: ${mission.operationType}`);
  lines.push(`Vehicle: ${mission.vehicleName}`);

  h("1. Mission Overview");
  lines.push(mission.notes);
  lines.push("");
  lines.push(`- Site: ${mission.site.name} (${mission.site.latitudeDeg.toFixed(3)}, ${mission.site.longitudeDeg.toFixed(3)})`);
  lines.push(`- Recovery: ${mission.recoveryLocation.name} (${mission.recoveryLocation.latitudeDeg.toFixed(3)}, ${mission.recoveryLocation.longitudeDeg.toFixed(3)})`);
  lines.push(`- Commanded termination: ${mission.capabilities.commandedTermination ? "declared in CONOPS" : "not declared"}`);
  lines.push(`- AFSS: ${mission.capabilities.autonomousFlightSafetySystem ? "declared in CONOPS" : "not declared"}`);

  h("2. Vehicle Description");
  lines.push(mission.vehicleDescription);
  lines.push("");
  lines.push("| Stage | Role | Mass [kg] | S [m²] | Cd |");
  lines.push("| --- | --- | ---: | ---: | ---: |");
  for (const stage of mission.stages) {
    lines.push(`| ${stage.name} | ${stage.role} | ${stage.massKg} | ${stage.referenceAreaM2} | ${stage.cd} |`);
  }

  h("3. Concept of Operations");
  lines.push("| Event | Phase | Kind | t [s] | Notes |");
  lines.push("| --- | --- | --- | ---: | --- |");
  for (const event of mission.timeline) {
    const t = event.timeSeconds === null ? "derived" : event.timeSeconds.toFixed(0);
    lines.push(`| ${event.name} | ${event.phase} | ${event.kind} | ${t} | ${event.notes ?? ""} |`);
  }
  lines.push("");
  lines.push(mission.capabilities.notes);

  h("4. Nominal Trajectory");
  lines.push("Propagator: Sea Turtle no-lift ballistic (h, V, γ). Same family as the static-site Re-Entry Predictor.");
  lines.push("");
  lines.push(`- Outcome: ${nominal.summary.outcome}`);
  lines.push(`- Range: ${nominal.summary.rangeKm.toFixed(1)} km`);
  lines.push(`- Impact: ${nominal.summary.impactLatitudeDeg.toFixed(3)}, ${nominal.summary.impactLongitudeDeg.toFixed(3)}`);
  lines.push(`- Impact velocity: ${nominal.summary.impactVelocityMs.toFixed(1)} m/s`);
  lines.push(`- Peak G (heat-shield): ${nominal.summary.peakG.toFixed(2)}`);
  lines.push(`- Peak heating (Sutton–Graves-style): ${nominal.summary.peakHeatingWcm2.toFixed(2)} W/cm²`);
  lines.push(`- β: ${nominal.summary.ballisticCoefficientKgM2.toFixed(1)} kg/m²`);
  lines.push(`- Deorbit longitude (targeting iterate): ${nominal.summary.deorbitLongitudeDeg.toFixed(2)} deg`);

  h("5. Hazard Analysis");
  lines.push("| ID | Hazard | Phase | Severity | Status | Requirement IDs |");
  lines.push("| --- | --- | --- | --- | --- | --- |");
  for (const hazard of hazards) {
    lines.push(`| ${hazard.id} | ${hazard.description} | ${hazard.affectedPhase} | ${hazard.severity} | ${hazard.status} | ${hazard.associatedRequirementIds.join(", ")} |`);
  }

  h("6. Failure Scenarios");
  lines.push("| ID | Type | P_f | Outcome | Impact | Notes |");
  lines.push("| --- | --- | ---: | --- | --- | --- |");
  for (const run of failureRuns) {
    const s = run.trajectory.summary;
    lines.push(`| ${run.scenario.id} | ${run.scenario.failureType} | ${run.scenario.probability} | ${s.outcome} | ${s.impactLatitudeDeg.toFixed(2)}, ${s.impactLongitudeDeg.toFixed(2)} | ${run.scenario.notes} |`);
  }

  h("7. Flight Safety Analysis");
  lines.push("Off-nominal trajectories are Sea Turtle reruns with parameter changes (Cd, chute inhibit, γ kick, cross-range rate). This is not a 6-DOF Monte Carlo FSA.");
  lines.push("");
  lines.push(`Monte Carlo: ${assessment.monteCarlo.enabled ? `${assessment.monteCarlo.samples} samples, seed ${assessment.monteCarlo.seed}` : "not run (optional)"}`);

  h("8. Debris / Impact Analysis");
  lines.push(debris.disclaimer);
  lines.push("");
  lines.push(`- Fragment count: ${debris.fragments.length}`);
  lines.push(`- Mean impact: ${debris.meanLatitudeDeg.toFixed(3)}, ${debris.meanLongitudeDeg.toFixed(3)}`);
  lines.push(`- Conceptual 1σ / 2σ radius: ${debris.contourRadiiKm.oneSigma.toFixed(1)} / ${debris.contourRadiiKm.twoSigma.toFixed(1)} km`);
  lines.push("");
  lines.push("| Fragment | Mass [kg] | β [kg/m²] | Impact | V [m/s] | KE [J] |");
  lines.push("| --- | ---: | ---: | --- | ---: | ---: |");
  for (const impact of debris.impacts) {
    const frag = debris.fragments.find((item) => item.id === impact.fragmentId);
    lines.push(`| ${impact.fragmentId} | ${frag?.massKg.toFixed(0) ?? "?"} | ${frag?.ballisticCoefficientKgM2.toFixed(0) ?? "?"} | ${impact.latitudeDeg.toFixed(2)}, ${impact.longitudeDeg.toFixed(2)} | ${impact.velocityMs.toFixed(1)} | ${impact.kineticEnergyJ.toExponential(2)} |`);
  }

  h("9. Public Risk Assessment");
  lines.push(`Equation: \`${risk.equation}\``);
  lines.push("");
  lines.push(`- Conceptual Ec: ${risk.expectedCasualties.toExponential(3)}`);
  lines.push(`- Individual risk (max cell): ${risk.individualRisk === null ? "n/a" : risk.individualRisk.toExponential(3)}`);
  lines.push(`- Collective risk (bookkeeping = Ec): ${risk.collectiveRisk === null ? "n/a" : risk.collectiveRisk.toExponential(3)}`);
  lines.push(`- Aircraft risk: ${risk.aircraftRisk}`);
  lines.push(`- Maritime risk: ${risk.maritimeRisk}`);
  lines.push("");
  lines.push("| Criterion | Computed | Threshold |");
  lines.push("| --- | --- | --- |");
  for (const row of risk.comparisons) {
    const computed = row.computed === null ? "NOT IMPLEMENTED" : row.computed.toExponential(3);
    lines.push(`| ${row.name} | ${computed} | ${row.thresholdDisplay} |`);
  }
  lines.push("");
  for (const note of risk.notes) lines.push(`- ${note}`);

  h("10. Flight Safety Constraints");
  lines.push("| ID | Constraint | Violated | t_viol [s] | Location | Requirement |");
  lines.push("| --- | --- | --- | ---: | --- | --- |");
  for (const row of constraintEvaluations) {
    const loc = row.location ? `${row.location.latitudeDeg.toFixed(2)}, ${row.location.longitudeDeg.toFixed(2)}` : "—";
    const t = row.violationTimeSeconds === null ? "—" : row.violationTimeSeconds.toFixed(0);
    lines.push(`| ${row.constraintId} | ${row.constraintName} | ${row.violated ? "YES" : "no"} | ${t} | ${loc} | ${row.associatedRequirementId ?? ""} |`);
  }

  h("11. Assumptions and Limitations");
  lines.push("- Planar 2-DOF no-lift entry. Latitude is the recovery parallel plus a small cross-range term.");
  lines.push("- Atmosphere is a single exponential, not a winds-aloft / GRAM profile.");
  lines.push("- Population is synthetic unless a user dataset is supplied. Nothing is downloaded.");
  lines.push("- Debris fragments are a canned inventory. Not a breakup-state vector from a validated model.");
  lines.push("- P_casualty vs kinetic energy is a placeholder curve.");
  lines.push("- Regulatory text and numeric criteria are YAML placeholders.");
  lines.push(`- ${PART450_DISCLAIMER}`);

  h("12. Part 450 Compliance / Evidence Matrix");
  lines.push("| Requirement | Title | Approach | STRIDE tool | Status |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const row of compliance) {
    lines.push(`| ${row.regulationReference} | ${row.requirementTitle} | ${row.complianceApproach} | ${row.strideTool} | ${row.status} |`);
  }

  h("13. Open Items / Required External Analyses");
  lines.push("- Authoritative Part 450 citations and thresholds in `regulatory/part450/`.");
  lines.push("- Validated debris / casualty-area methodology.");
  lines.push("- Real population density, airports, airways, maritime traffic.");
  lines.push("- 6-DOF / lifting-body off-nominal trajectories if the vehicle is not ballistic.");
  lines.push("- Flight safety system design and independence evidence.");
  lines.push("- Winds, ship traffic, and aircraft exposure models.");

  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(PART450_DISCLAIMER);
  lines.push("");
  lines.push(`Catalog revision markers: ${assessment.catalog.requirements.map((r) => r.revision).join(", ")}`);
  lines.push(`Unspecified criteria display: ${assessment.catalog.unspecifiedDisplay}`);

  return lines.join("\n");
}
