/*
 * STRIDE web app — UI wiring for the Re-Entry Predictor.
 * All values are read from the DOM, validated/clamped, then fed to the
 * pure simulation functions in sim.js. Output is rendered with textContent
 * (never innerHTML) so user input can never inject markup.
 */

import { DEFAULT_CONFIG, runStudy } from "./sim.js";
import { drawLineChart } from "./plot.js";

// [element id, config key, min, max]
const FIELDS = [
  ["payloadMassKg", "payloadMassKg", 0.1, 100000],
  ["startAltKm", "startAltKm", 100, 2000],
  ["startVelMps", "startVelMps", 100, 12000],
  ["entryAngleDeg", "entryAngleDeg", 0.1, 89],
  ["targetLat", "targetLat", -89.9, 89.9],
  ["targetLon", "targetLon", -180, 180],
  ["shieldCd", "shieldCd", 0.1, 3],
  ["chuteCd", "chuteCd", 0.1, 3],
  ["chuteDeployAltM", "chuteDeployAltM", 100, 50000],
  ["tpsDensity", "tpsDensity", 10, 5000],
  ["tpsThickness", "tpsThickness", 0.001, 1],
  ["shockFactorX", "shockFactorX", 0.5, 5],
];

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

function readConfig() {
  const cfg = { ...DEFAULT_CONFIG };
  for (const [id, key, min, max] of FIELDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    const raw = Number.parseFloat(el.value);
    const val = Number.isFinite(raw) ? clamp(raw, min, max) : DEFAULT_CONFIG[key];
    cfg[key] = val;
    el.value = String(val);
  }
  return cfg;
}

function fmtHMS(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
}

function renderTable(rows) {
  const tbody = document.getElementById("results-body");
  tbody.textContent = "";
  for (const r of rows) {
    const tr = document.createElement("tr");
    const cells = [
      r.shield.toFixed(1),
      r.chute.toFixed(1),
      r.beta.toFixed(1),
      fmtHMS(r.t1),
      fmtHMS(r.t2),
      r.g.toFixed(1),
      r.shock.toFixed(1),
      r.q.toFixed(1),
      r.status,
    ];
    cells.forEach((text, i) => {
      const td = document.createElement("td");
      td.textContent = text;
      if (i === cells.length - 1) {
        td.className = r.status === "PASS" ? "pass" : "fail";
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }
}

function renderRecommendations(study, cfg) {
  const box = document.getElementById("recommendations");
  box.textContent = "";
  const msgs = [];

  const worst = study.rows.reduce((a, b) => (b.g > a.g ? b : a), study.rows[0]);
  const worstShock = study.rows.reduce(
    (a, b) => (b.shock > a.shock ? b : a),
    study.rows[0],
  );

  msgs.push(
    `Deorbit burn target: Lat ${cfg.targetLat.toFixed(2)}, Long ${study.deorbitLon.toFixed(4)}.`,
  );
  msgs.push(
    `Steepest survivable entry angle (11.9 G limit): ${study.steepestAngle.toFixed(3)}°.`,
  );

  if (worst.g > 12) {
    msgs.push(
      `CRITICAL: peak G-load of ${worst.g.toFixed(1)} exceeds the 12 G structural limit. Shallow the entry angle toward ~${study.steepestAngle.toFixed(2)}° or enlarge the heat shield.`,
    );
  }
  if (worstShock.shock > 12) {
    msgs.push(
      `DANGER: parachute opening shock (${worstShock.shock.toFixed(1)} G) can snap shroud lines. Increase deployment altitude or use a smaller main chute.`,
    );
  }
  if (worst.g <= 12 && worstShock.shock <= 12) {
    msgs.push("All tested configurations are within structural limits.");
  }

  for (const m of msgs) {
    const li = document.createElement("li");
    li.textContent = m;
    box.appendChild(li);
  }
}

function renderCharts(study) {
  drawLineChart(document.getElementById("chart-decel"), {
    title: "Deceleration Profile",
    xLabel: "Deceleration (G)",
    yLabel: "Altitude (km)",
    series: study.decelSeries,
  });
  drawLineChart(document.getElementById("chart-thermal"), {
    title: "Thermal Flux Profile",
    xLabel: "Heat flux (W/cm²)",
    yLabel: "Altitude (km)",
    series: study.thermalSeries,
  });
}

let lastStudy = null;

function run() {
  const status = document.getElementById("run-status");
  status.textContent = "Running…";
  // Defer so the status paint lands before the (synchronous) solve.
  requestAnimationFrame(() => {
    const t0 = performance.now();
    const cfg = readConfig();
    const study = runStudy(cfg);
    lastStudy = study;
    renderTable(study.rows);
    renderRecommendations(study, cfg);
    renderCharts(study);
    const ms = (performance.now() - t0).toFixed(0);
    status.textContent = `Done in ${ms} ms — ${study.rows.length} configurations simulated in your browser.`;
  });
}

function init() {
  document.getElementById("run-btn").addEventListener("click", run);
  document.getElementById("reset-btn").addEventListener("click", () => {
    for (const [id, key] of FIELDS) {
      const el = document.getElementById(id);
      if (el) el.value = String(DEFAULT_CONFIG[key]);
    }
  });
  window.addEventListener("resize", () => {
    if (lastStudy) renderCharts(lastStudy);
  });
  run(); // run once with defaults so the page is populated
}

document.addEventListener("DOMContentLoaded", init);
