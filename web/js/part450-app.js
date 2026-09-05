/*
 * Part 450 workbook UI. Tables are built with DOM APIs (textContent),
 * never innerHTML, same rule as the Sea Turtle page.
 */

import {
  CATALOG,
  FAILURES,
  PART450_DISCLAIMER,
  REGULATORY_VALUE_REQUIRED,
  generateSafetyReport,
  runPart450Assessment,
} from "./part450.js";

const FAIL_COLORS = ["#f87171", "#fbbf24", "#c4b5fd", "#60a5fa", "#fcd34d", "#fca5a5", "#6ee7b7", "#93c5fd"];

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function fillTable(tbody, rows) {
  tbody.replaceChildren();
  for (const cells of rows) {
    const tr = document.createElement("tr");
    for (const cell of cells) {
      const td = document.createElement("td");
      if (cell && typeof cell === "object" && cell.text != null) {
        td.textContent = cell.text;
        if (cell.className) td.className = cell.className;
      } else {
        td.textContent = String(cell);
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
}

function downloadText(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function drawSketch(svg, assessment) {
  const series = [
    {
      label: "Nominal",
      color: "#5eead4",
      kind: "line",
      points: assessment.nominal.samples.map((s) => ({ lon: s.lon, lat: s.lat })),
    },
    ...assessment.failureRuns.map((run, i) => ({
      label: run.scenario.id,
      color: FAIL_COLORS[i % FAIL_COLORS.length],
      kind: "dash",
      points: run.trajectory.samples.map((s) => ({ lon: s.lon, lat: s.lat })),
    })),
    {
      label: "Recovery",
      color: "#34d399",
      kind: "line",
      points: assessment.recoveryCircle.map((p) => ({ lon: p.lon, lat: p.lat })),
    },
    {
      label: "Keep-out",
      color: "#fbbf24",
      kind: "dash",
      points: [...assessment.keepOut, assessment.keepOut[0]].map((p) => ({
        lon: p.lon,
        lat: p.lat,
      })),
    },
    {
      label: "Debris",
      color: "#f87171",
      kind: "mark",
      points: assessment.debris.impacts.map((p) => ({ lon: p.lon, lat: p.lat })),
    },
  ];

  const all = series.flatMap((s) => s.points);
  let minLon = Math.min(...all.map((p) => p.lon));
  let maxLon = Math.max(...all.map((p) => p.lon));
  let minLat = Math.min(...all.map((p) => p.lat));
  let maxLat = Math.max(...all.map((p) => p.lat));
  const padLon = Math.max((maxLon - minLon) * 0.08, 0.15);
  const padLat = Math.max((maxLat - minLat) * 0.08, 0.15);
  minLon -= padLon;
  maxLon += padLon;
  minLat -= padLat;
  maxLat += padLat;

  const w = 900;
  const h = 420;
  const m = { l: 52, r: 16, t: 16, b: 40 };
  const plotW = w - m.l - m.r;
  const plotH = h - m.t - m.b;

  // Equal-aspect projection so a geographic circle (the recovery zone) reads as
  // a circle, not an oval. Degrees of longitude shrink with latitude, so scale
  // both axes in kilometres and use one px/km factor for x and y, letterboxing
  // the track inside the frame.
  const midLatRad = (((minLat + maxLat) / 2) * Math.PI) / 180;
  const kmPerDegLat = 110.574;
  const kmPerDegLon = 111.32 * Math.cos(midLatRad);
  const spanKmX = Math.max((maxLon - minLon) * kmPerDegLon, 1e-6);
  const spanKmY = Math.max((maxLat - minLat) * kmPerDegLat, 1e-6);
  const scale = Math.min(plotW / spanKmX, plotH / spanKmY);
  const drawnW = spanKmX * scale;
  const drawnH = spanKmY * scale;
  const offX = m.l + (plotW - drawnW) / 2;
  const offY = m.t + (plotH - drawnH) / 2;
  const x = (lon) => offX + (lon - minLon) * kmPerDegLon * scale;
  const y = (lat) => offY + (maxLat - lat) * kmPerDegLat * scale;

  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.replaceChildren();

  const ns = "http://www.w3.org/2000/svg";
  const add = (name, attrs) => {
    const node = document.createElementNS(ns, name);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
    svg.appendChild(node);
    return node;
  };

  add("rect", {
    x: m.l,
    y: m.t,
    width: w - m.l - m.r,
    height: h - m.t - m.b,
    fill: "rgba(255,255,255,0.03)",
    stroke: "#1e2a3a",
  });
  const xlabel = add("text", {
    x: w / 2,
    y: h - 10,
    fill: "#8b98a5",
    "font-size": 12,
    "text-anchor": "middle",
  });
  xlabel.textContent = "longitude [deg]";
  const ylabel = add("text", {
    x: 16,
    y: h / 2,
    fill: "#8b98a5",
    "font-size": 12,
    transform: `rotate(-90 16 ${h / 2})`,
  });
  ylabel.textContent = "latitude [deg]";
  const xmin = add("text", { x: offX, y: h - 12, fill: "#8b98a5", "font-size": 11 });
  xmin.textContent = minLon.toFixed(1);
  const xmax = add("text", {
    x: offX + drawnW,
    y: h - 12,
    fill: "#8b98a5",
    "font-size": 11,
    "text-anchor": "end",
  });
  xmax.textContent = maxLon.toFixed(1);
  const aspectNote = add("text", {
    x: w - m.r,
    y: m.t + 14,
    fill: "#8b98a5",
    "font-size": 11,
    "text-anchor": "end",
  });
  aspectNote.textContent = "equal-aspect (1:1 km)";

  for (const item of series) {
    if (!item.points.length) continue;
    if (item.kind === "mark") {
      for (const p of item.points) {
        add("path", {
          d: `M ${x(p.lon) - 4} ${y(p.lat) - 4} L ${x(p.lon) + 4} ${y(p.lat) + 4} M ${x(p.lon) - 4} ${y(p.lat) + 4} L ${x(p.lon) + 4} ${y(p.lat) - 4}`,
          stroke: item.color,
          "stroke-width": 1.6,
          fill: "none",
        });
      }
      continue;
    }
    const stride = Math.max(1, Math.floor(item.points.length / 240));
    const picked = item.points.filter((_, i) => i % stride === 0 || i === item.points.length - 1);
    const d = picked
      .map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.lon).toFixed(1)} ${y(p.lat).toFixed(1)}`)
      .join(" ");
    add("path", {
      d,
      fill: "none",
      stroke: item.color,
      "stroke-width": item.kind === "line" ? 2.6 : 1.6,
      "stroke-dasharray": item.kind === "dash" ? "5 4" : "none",
    });
  }
}

function selectedFailureIds() {
  return [...document.querySelectorAll("#failure-list input:checked")].map((n) => n.value);
}

function renderFailures() {
  const box = document.getElementById("failure-list");
  box.replaceChildren();
  for (const f of FAILURES) {
    const label = el("label", "check-row");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = f.id;
    input.checked = true;
    const span = el("span");
    span.appendChild(el("strong", null, f.id));
    span.appendChild(el("small", "muted-block", f.failureType));
    label.appendChild(input);
    label.appendChild(span);
    box.appendChild(label);
  }
}

function render(assessment) {
  document.getElementById("metric-outcome").textContent = assessment.nominal.outcome;
  document.getElementById("metric-outcome-detail").textContent =
    `${assessment.nominal.rangeKm.toFixed(0)} km range`;
  document.getElementById("metric-ec").textContent = assessment.risk.expectedCasualties.toExponential(2);
  document.getElementById("metric-ec-detail").textContent = assessment.risk.equation;
  document.getElementById("metric-threshold").textContent = REGULATORY_VALUE_REQUIRED;
  document.getElementById("metric-hits").textContent = String(
    assessment.constraints.filter((c) => c.violated).length,
  );
  document.getElementById("metric-hits-detail").textContent =
    `${assessment.failureRuns.length} off-nominal runs`;

  const events = document.getElementById("events");
  events.replaceChildren();
  for (const ev of assessment.nominal.events) {
    const pill = el(
      "span",
      "pill",
      `${ev.label}: t=${ev.t.toFixed(0)}s / ${((ev.sample?.h ?? 0) / 1000).toFixed(0)} km`,
    );
    events.appendChild(pill);
  }

  drawSketch(document.getElementById("ground-track"), assessment);

  fillTable(
    document.getElementById("hazard-body"),
    assessment.hazards.map((h) => [
      h.id,
      h.description,
      h.phase,
      h.severity,
      { text: h.status, className: h.status === "open" ? "fail" : "skip" },
    ]),
  );

  fillTable(
    document.getElementById("risk-body"),
    [
      ["Expected casualties (Ec)", assessment.risk.expectedCasualties.toExponential(3), REGULATORY_VALUE_REQUIRED],
      ["Individual risk", assessment.risk.individualRisk.toExponential(3), REGULATORY_VALUE_REQUIRED],
      ["Collective risk", assessment.risk.collectiveRisk.toExponential(3), REGULATORY_VALUE_REQUIRED],
      ["Aircraft risk", "NOT IMPLEMENTED", REGULATORY_VALUE_REQUIRED],
      ["Ship / maritime exposure", "NOT IMPLEMENTED", REGULATORY_VALUE_REQUIRED],
    ],
  );

  const constraints = document.getElementById("constraint-list");
  constraints.replaceChildren();
  for (const c of assessment.constraints) {
    const row = el("div", "constraint-row");
    row.appendChild(el("strong", null, c.name));
    row.appendChild(
      el("span", c.violated ? "fail" : "pass", c.violated ? "violated on at least one run" : "clear on plotted runs"),
    );
    constraints.appendChild(row);
  }

  fillTable(
    document.getElementById("compliance-body"),
    CATALOG.requirements.map((r) => [r.citation, r.title, r.tool, r.status]),
  );

  return assessment;
}

let lastAssessment = null;

function rerun() {
  const status = document.getElementById("run-status");
  status.textContent = "Running Sea Turtle cases…";
  // Let the status paint before we block the main thread.
  requestAnimationFrame(() => {
    lastAssessment = runPart450Assessment({
      enabledIds: selectedFailureIds(),
      monteCarlo: document.getElementById("mc-toggle").checked,
    });
    render(lastAssessment);
    status.textContent = `Updated ${new Date().toLocaleTimeString()}`;
  });
}

function init() {
  document.getElementById("disclaimer-text").textContent = PART450_DISCLAIMER;
  renderFailures();
  document.getElementById("failure-list").addEventListener("change", rerun);
  document.getElementById("mc-toggle").addEventListener("change", rerun);
  document.getElementById("download-report").addEventListener("click", () => {
    if (!lastAssessment) return;
    downloadText(
      "stride-part450-assessment.md",
      generateSafetyReport(lastAssessment),
      "text/markdown",
    );
  });
  document.getElementById("download-matrix").addEventListener("click", () => {
    downloadText(
      "stride-part450-compliance.json",
      JSON.stringify({ schema: "stride.part450.compliance.v1", entries: CATALOG.requirements }, null, 2),
      "application/json",
    );
  });
  lastAssessment = runPart450Assessment({ enabledIds: FAILURES.map((f) => f.id) });
  render(lastAssessment);
  document.getElementById("run-status").textContent = "Example LEO reentry loaded.";
}

document.addEventListener("DOMContentLoaded", init);
