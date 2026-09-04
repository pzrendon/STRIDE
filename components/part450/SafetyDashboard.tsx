"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, type ReactNode } from "react";
import type { Config, Data, Layout } from "plotly.js";
import {
  exampleReentryFailures,
  generateSafetyReport,
  PART450_DISCLAIMER,
  REGULATORY_VALUE_REQUIRED,
  runMissionSafetyAssessment,
  serializeComplianceMatrix,
  type SafetyAssessment
} from "@/lib/part450";
import { formatNumber } from "@/lib/marlin/format";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const PLOT_CONFIG: Partial<Config> = { displayModeBar: false, responsive: true };
const FAIL_COLORS = ["#fc8181", "#f6ad55", "#d6bcfa", "#63b3ed", "#fbd38d", "#feb2b2", "#9ae6b4", "#90cdf4"];

function circleLatLon(lat: number, lon: number, radiusKm: number, steps = 72): { lat: number; lon: number }[] {
  const points: { lat: number; lon: number }[] = [];
  const d = radiusKm / 6371;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;
  for (let i = 0; i <= steps; i += 1) {
    const brng = (2 * Math.PI * i) / steps;
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
    const lon2 =
      lon1 +
      Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
    points.push({ lat: (lat2 * 180) / Math.PI, lon: (lon2 * 180) / Math.PI });
  }
  return points;
}

function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function SafetyDashboard() {
  const allFailures = useMemo(() => exampleReentryFailures(), []);
  const [enabledIds, setEnabledIds] = useState<string[]>(() => allFailures.map((item) => item.id));
  const [monteCarlo, setMonteCarlo] = useState(false);

  const assessment: SafetyAssessment = useMemo(() => {
    const failures = allFailures.filter((item) => enabledIds.includes(item.id));
    return runMissionSafetyAssessment({
      failures,
      monteCarlo: { enabled: monteCarlo, samples: 12, seed: 450 }
    });
  }, [allFailures, enabledIds, monteCarlo]);

  const report = useMemo(() => generateSafetyReport(assessment), [assessment]);

  function toggleFailure(id: string) {
    setEnabledIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  const recovery = assessment.constraints.find((item) => item.id === "CON-RECOVERY");
  const keepOut = assessment.constraints.find((item) => item.id === "CON-KEEPOUT");
  const recoveryCircle =
    recovery?.center && recovery.radiusKm
      ? circleLatLon(recovery.center.latitudeDeg, recovery.center.longitudeDeg, recovery.radiusKm)
      : [];

  const groundTraces: Data[] = [
    {
      x: assessment.nominal.samples.map((p) => p.longitudeDeg),
      y: assessment.nominal.samples.map((p) => p.latitudeDeg),
      name: "Nominal",
      type: "scatter",
      mode: "lines",
      line: { color: "#4fd1c5", width: 3 }
    },
    ...assessment.failureRuns.map((run, index) => ({
      x: run.trajectory.samples.map((p) => p.longitudeDeg),
      y: run.trajectory.samples.map((p) => p.latitudeDeg),
      name: run.scenario.id,
      type: "scatter" as const,
      mode: "lines" as const,
      line: { color: FAIL_COLORS[index % FAIL_COLORS.length], width: 1.6, dash: "dot" as const }
    })),
    {
      x: assessment.debris.impacts.map((p) => p.longitudeDeg),
      y: assessment.debris.impacts.map((p) => p.latitudeDeg),
      name: "Debris / MC impacts",
      type: "scatter",
      mode: "markers",
      marker: { color: "#fc8181", size: 9, symbol: "x" }
    },
    {
      x: recoveryCircle.map((p) => p.lon),
      y: recoveryCircle.map((p) => p.lat),
      name: "Recovery zone",
      type: "scatter",
      mode: "lines",
      line: { color: "#68d391", width: 2 }
    }
  ];

  if (keepOut?.polygon) {
    const poly = [...keepOut.polygon, keepOut.polygon[0]];
    groundTraces.push({
      x: poly.map((p) => p.longitudeDeg),
      y: poly.map((p) => p.latitudeDeg),
      name: "Keep-out (synthetic)",
      type: "scatter",
      mode: "lines",
      line: { color: "#f6ad55", width: 2, dash: "dash" }
    });
  }

  const layout: Partial<Layout> = {
    autosize: true,
    height: 460,
    margin: { l: 54, r: 20, t: 12, b: 44 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(255,255,255,0.03)",
    font: { color: "#dce9fa" },
    xaxis: { title: { text: "longitude [deg]" }, gridcolor: "rgba(255,255,255,0.08)" },
    yaxis: { title: { text: "latitude [deg]" }, gridcolor: "rgba(255,255,255,0.08)", scaleanchor: "x" },
    legend: { orientation: "h", x: 0, y: 1.16 }
  };

  const uniqueConstraintHits = new Map<string, (typeof assessment.constraintEvaluations)[number]>();
  for (const row of assessment.constraintEvaluations) {
    if (!row.violated) continue;
    if (!uniqueConstraintHits.has(row.constraintId)) uniqueConstraintHits.set(row.constraintId, row);
  }

  return (
    <>
      <section className="hero">
        <div className="hero-card">
          <p className="eyebrow">STRIDE / Sea Turtle + Part 450</p>
          <h1>Mission safety &amp; licensing workbook</h1>
          <p className="lede">
            Engineering-oriented traceability from a Sea Turtle reentry trajectory to hazards,
            off-nominal cases, a first-order footprint, conceptual public risk, and a Part 450
            evidence matrix. This is not a license application and not an FAA-validated flight
            safety analysis.
          </p>
          <div className="hero-actions">
            <span className="pill">Reentry CONOPS</span>
            <span className="pill">Sea Turtle 2-DOF</span>
            <span className="pill">Placeholder CFR catalog</span>
            <span className="pill">{REGULATORY_VALUE_REQUIRED}</span>
          </div>
        </div>
        <aside className="hero-aside panel">
          <div>
            <p className="eyebrow">Scope guardrail</p>
            <p className="disclaimer">{PART450_DISCLAIMER}</p>
          </div>
          <div className="phase-timeline">
            {["LEO", "deorbit", "EI", "entry", "chute", "recovery"].map((phase) => (
              <span className="phase-pill" key={phase}>
                {phase}
              </span>
            ))}
          </div>
        </aside>
      </section>

      <section className="dashboard">
        <aside className="controls">
          <Panel title="Example mission">
            <p className="disclaimer">
              {assessment.mission.name}. Vehicle is a capsule-class reusable reentry flying the
              Sea Turtle no-lift model toward a synthetic Florida recovery aimpoint.
            </p>
            <p className="disclaimer">{assessment.mission.capabilities.notes}</p>
          </Panel>

          <Panel title="Failure scenarios">
            <div className="checkbox-grid">
              {allFailures.map((scenario) => (
                <label className="checkbox-row" key={scenario.id}>
                  <input
                    type="checkbox"
                    checked={enabledIds.includes(scenario.id)}
                    onChange={() => toggleFailure(scenario.id)}
                  />
                  <span>
                    {scenario.id}
                    <small className="muted-block">{scenario.failureType}</small>
                  </span>
                </label>
              ))}
            </div>
          </Panel>

          <Panel title="Optional compute">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={monteCarlo}
                onChange={() => setMonteCarlo((value) => !value)}
              />
              <span>Conceptual Cd Monte Carlo (12 draws)</span>
            </label>
            <div className="hero-actions" style={{ marginTop: 14 }}>
              <button
                type="button"
                className="text-btn"
                onClick={() => downloadText("stride-part450-assessment.md", report, "text/markdown")}
              >
                Download report
              </button>
              <button
                type="button"
                className="text-btn"
                onClick={() =>
                  downloadText(
                    "stride-part450-compliance.json",
                    serializeComplianceMatrix(assessment.compliance),
                    "application/json"
                  )
                }
              >
                Download matrix JSON
              </button>
            </div>
          </Panel>
        </aside>

        <div className="main-column">
          <div className="metrics-grid part450-metrics">
            <MetricCard
              label="Nominal outcome"
              value={assessment.nominal.summary.outcome}
              detail={`${formatNumber(assessment.nominal.summary.rangeKm, 0)} km range`}
            />
            <MetricCard
              label="Conceptual Ec"
              value={assessment.risk.expectedCasualties.toExponential(2)}
              detail={assessment.risk.equation}
            />
            <MetricCard
              label="Ec threshold"
              value={
                assessment.risk.comparisons.find((row) => row.criterionId === "expected_casualties")
                  ?.thresholdDisplay ?? REGULATORY_VALUE_REQUIRED
              }
              detail="From criteria.yaml — not guessed in code"
            />
            <MetricCard
              label="Constraint hits"
              value={String(uniqueConstraintHits.size)}
              detail={`${assessment.failureRuns.length} off-nominal runs`}
            />
          </div>

          <Panel title="Ground track, recovery zone, debris impacts">
            <p className="disclaimer">
              Lon/lat from the planar Sea Turtle track. Debris markers are a canned fragment
              inventory plus optional Cd Monte Carlo — conceptual, not a validated breakup model.
            </p>
            <article className="plot-card full">
              <Plot data={groundTraces} layout={layout} config={PLOT_CONFIG} style={{ width: "100%", height: "100%" }} />
            </article>
          </Panel>

          <Panel title="Mission timeline / key safety events">
            <div className="phase-timeline">
              {assessment.nominal.events.map((event) => (
                <span className="phase-pill" key={event.id}>
                  {event.label}: t={formatNumber(event.timeSeconds, 0)}s /{" "}
                  {formatNumber(event.sample.altitudeM / 1000, 0)} km
                </span>
              ))}
            </div>
          </Panel>

          <Panel title="Hazard summary">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Hazard</th>
                    <th>Phase</th>
                    <th>Severity</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assessment.hazards.map((hazard) => (
                    <tr key={hazard.id}>
                      <td>{hazard.id}</td>
                      <td>{hazard.description}</td>
                      <td>{hazard.affectedPhase}</td>
                      <td>{hazard.severity}</td>
                      <td>
                        <span className={`status-pill ${hazard.status}`}>{hazard.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Risk summary">
            <p className="disclaimer">
              Aircraft and maritime terms are not implemented. Individual risk uses the synthetic
              Florida grid, not census data.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Criterion</th>
                    <th>Computed</th>
                    <th>Threshold</th>
                  </tr>
                </thead>
                <tbody>
                  {assessment.risk.comparisons.map((row) => (
                    <tr key={row.criterionId}>
                      <td>{row.name}</td>
                      <td>{row.computed === null ? "NOT IMPLEMENTED" : row.computed.toExponential(3)}</td>
                      <td>{row.thresholdDisplay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Flight safety constraints">
            <div className="constraint-list">
              {assessment.constraints.map((constraint) => {
                const hit = uniqueConstraintHits.get(constraint.id);
                return (
                  <div className="constraint-item" key={constraint.id}>
                    <div>
                      <strong>{constraint.name}</strong>
                      <p className="disclaimer">{constraint.notes}</p>
                    </div>
                    <span className={`constraint-status ${hit ? "warning" : "clean"}`}>
                      {hit ? "violated on at least one run" : "clear on plotted runs"}
                    </span>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Requirement / compliance status">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Citation</th>
                    <th>Title</th>
                    <th>STRIDE evidence</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assessment.compliance.map((row) => (
                    <tr key={row.id}>
                      <td>{row.regulationReference}</td>
                      <td>{row.requirementTitle}</td>
                      <td>{row.strideTool}</td>
                      <td>
                        <span className={`status-pill ${row.status.toLowerCase()}`}>{row.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </section>
    </>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="metric-card">
      <strong>{label}</strong>
      <span>{value}</span>
      <small>{detail}</small>
    </article>
  );
}
