/*
 * STRIDE web app — UI wiring for the Re-Entry Predictor.
 * All values are read from the DOM, validated/clamped, then fed to the
 * pure simulation functions in sim.js. Output is rendered with textContent
 * (never innerHTML) so user input can never inject markup.
 */

import { DEFAULT_CONFIG, runStudy } from "./sim.js";
import { drawLineChart } from "./plot.js";
import {
  PRESETS,
  GLOSSARY,
  FIELD_HELP,
  MODEL_ASSUMPTIONS,
  STUDY_MODULES,
  buildNarrative,
} from "./learn.js";

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

const MAX_SWEEP = 12;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

let mode = "learn";
let activePresetId = "leo-capsule";
let lastStudy = null;
let lastCfg = null;

function parseDiameterList(raw, fallback) {
  const parts = String(raw)
    .split(/[,;\s]+/)
    .map((s) => Number.parseFloat(s))
    .filter((n) => Number.isFinite(n) && n > 0 && n < 100);
  const unique = [...new Set(parts.map((n) => Math.round(n * 1000) / 1000))];
  if (!unique.length) return [...fallback];
  return unique.slice(0, MAX_SWEEP);
}

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

  const shieldEl = document.getElementById("testShieldDiams");
  const chuteEl = document.getElementById("testChuteDiams");
  cfg.testShieldDiams = parseDiameterList(
    shieldEl?.value ?? "",
    DEFAULT_CONFIG.testShieldDiams,
  );
  cfg.testChuteDiams = parseDiameterList(
    chuteEl?.value ?? "",
    DEFAULT_CONFIG.testChuteDiams,
  );
  if (shieldEl) shieldEl.value = cfg.testShieldDiams.join(", ");
  if (chuteEl) chuteEl.value = cfg.testChuteDiams.join(", ");

  return cfg;
}

function writeConfig(values) {
  for (const [id, key] of FIELDS) {
    const el = document.getElementById(id);
    if (!el || values[key] == null) continue;
    el.value = String(values[key]);
  }
  if (values.testShieldDiams) {
    const el = document.getElementById("testShieldDiams");
    if (el) el.value = values.testShieldDiams.join(", ");
  }
  if (values.testChuteDiams) {
    const el = document.getElementById("testChuteDiams");
    if (el) el.value = values.testChuteDiams.join(", ");
  }
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
      r.altMaxG != null ? r.altMaxG.toFixed(1) : "—",
      r.altMaxQ != null ? r.altMaxQ.toFixed(1) : "—",
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
  if (study.steepestFeasible) {
    msgs.push(
      `Steepest survivable entry angle (11.9 G limit): ${study.steepestAngle.toFixed(3)}°.`,
    );
  } else {
    msgs.push(
      `No angle in the 0.5–10° search stays under 11.9 G for the reference shield/chute (shallow probe ≈ ${Number(study.shallowG).toFixed(1)} G). This no-lift ballistic model is intentionally harsh — compare configurations relatively.`,
    );
  }

  if (worst.g > 12) {
    msgs.push(
      `Peak G-load of ${worst.g.toFixed(1)} exceeds the 12 G teaching limit. Try a larger heat shield, lower entry speed, or study how real vehicles add lift to lengthen the deceleration pulse.`,
    );
  }
  if (worstShock.shock > 12) {
    msgs.push(
      `Parachute opening shock (${worstShock.shock.toFixed(1)} G) can snap shroud lines. Increase deployment altitude or use a smaller main chute.`,
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

function renderNarrative(study, cfg) {
  const story = buildNarrative(study, cfg);
  const headline = document.getElementById("narrative-headline");
  const body = document.getElementById("narrative-body");
  const takes = document.getElementById("narrative-takeaways");
  headline.textContent = story.headline;
  body.textContent = "";
  for (const p of story.paragraphs) {
    const el = document.createElement("p");
    el.textContent = p;
    body.appendChild(el);
  }
  takes.textContent = "";
  for (const t of story.takeaways) {
    const li = document.createElement("li");
    li.textContent = t;
    takes.appendChild(li);
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

function updateSweepNote(cfg) {
  const note = document.getElementById("sweep-note");
  if (!note) return;
  note.textContent = `Sweeps shield diameters [${cfg.testShieldDiams.join(", ")}] m × chute diameters [${cfg.testChuteDiams.join(", ")}] m at γ = ${cfg.entryAngleDeg}°. Charts use the first chute size.`;
}

function run() {
  const status = document.getElementById("run-status");
  status.textContent = "Running…";
  // Defer so the status paint lands before the (synchronous) solve.
  requestAnimationFrame(() => {
    const t0 = performance.now();
    const cfg = readConfig();
    const study = runStudy(cfg);
    lastStudy = study;
    lastCfg = cfg;
    renderTable(study.rows);
    renderRecommendations(study, cfg);
    renderNarrative(study, cfg);
    renderCharts(study);
    updateSweepNote(cfg);
    const ms = (performance.now() - t0).toFixed(0);
    status.textContent = `Done in ${ms} ms — ${study.rows.length} configurations simulated in your browser.`;
  });
}

function setMode(next) {
  mode = next === "research" ? "research" : "learn";
  document.body.dataset.mode = mode;
  document.getElementById("mode-learn")?.classList.toggle("is-active", mode === "learn");
  document.getElementById("mode-research")?.classList.toggle("is-active", mode === "research");
}

function applyPreset(preset) {
  activePresetId = preset.id;
  writeConfig({
    ...preset.values,
    testShieldDiams: DEFAULT_CONFIG.testShieldDiams,
    testChuteDiams: DEFAULT_CONFIG.testChuteDiams,
  });
  document.querySelectorAll(".preset-card").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.presetId === preset.id);
  });
  const teach = document.getElementById("preset-teach");
  if (teach) {
    teach.textContent = `${preset.blurb} ${preset.teach}`;
  }
  run();
}

function renderPresets() {
  const root = document.getElementById("presets");
  if (!root) return;
  root.textContent = "";
  for (const preset of PRESETS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "preset-card";
    btn.dataset.presetId = preset.id;
    btn.setAttribute("role", "listitem");
    if (preset.id === activePresetId) btn.classList.add("is-active");

    const level = document.createElement("span");
    level.className = "preset-level";
    level.textContent = preset.level;

    const name = document.createElement("span");
    name.className = "preset-name";
    name.textContent = preset.name;

    const blurb = document.createElement("span");
    blurb.className = "preset-blurb";
    blurb.textContent = preset.blurb;

    btn.append(level, name, blurb);
    btn.addEventListener("click", () => applyPreset(preset));
    root.appendChild(btn);
  }
  const active = PRESETS.find((p) => p.id === activePresetId) || PRESETS[0];
  const teach = document.getElementById("preset-teach");
  if (teach && active) teach.textContent = `${active.blurb} ${active.teach}`;
}

function renderGlossary() {
  const root = document.getElementById("glossary");
  if (!root) return;
  root.textContent = "";
  for (const item of GLOSSARY) {
    const details = document.createElement("details");
    details.className = "glossary-item";
    details.id = `glossary-${item.id}`;

    const summary = document.createElement("summary");
    const term = document.createElement("span");
    term.className = "glossary-term";
    term.textContent = item.term;
    const short = document.createElement("span");
    short.className = "glossary-short";
    short.textContent = item.short;
    summary.append(term, short);

    const body = document.createElement("p");
    body.className = "glossary-body";
    body.textContent = item.body;

    details.append(summary, body);
    root.appendChild(details);
  }
}

function renderModules() {
  const root = document.getElementById("study-modules");
  if (!root) return;
  root.textContent = "";
  for (const mod of STUDY_MODULES) {
    const article = document.createElement("article");
    article.className = "module";
    const h = document.createElement("h4");
    h.textContent = mod.title;
    const ol = document.createElement("ol");
    for (const step of mod.steps) {
      const li = document.createElement("li");
      li.textContent = step;
      ol.appendChild(li);
    }
    article.append(h, ol);
    root.appendChild(article);
  }
}

function renderAssumptions() {
  const root = document.getElementById("assumptions-list");
  if (!root) return;
  root.textContent = "";
  for (const line of MODEL_ASSUMPTIONS) {
    const li = document.createElement("li");
    li.textContent = line;
    root.appendChild(li);
  }
}

function renderFieldHelp() {
  document.querySelectorAll("[data-help-for]").forEach((el) => {
    const key = el.getAttribute("data-help-for");
    const text = FIELD_HELP[key];
    if (!text) return;
    el.textContent = text;
  });
}

function downloadBlob(filename, mime, text) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportCsv() {
  if (!lastStudy) return;
  const header = [
    "shield_m",
    "chute_m",
    "beta_kg_m2",
    "space_phase_s",
    "air_phase_s",
    "max_g",
    "shock_g",
    "heat_w_cm2",
    "alt_max_g_km",
    "alt_max_q_km",
    "status",
  ];
  const lines = [header.join(",")];
  for (const r of lastStudy.rows) {
    lines.push(
      [
        r.shield,
        r.chute,
        r.beta.toFixed(4),
        r.t1.toFixed(3),
        r.t2.toFixed(3),
        r.g.toFixed(4),
        r.shock.toFixed(4),
        r.q.toFixed(4),
        r.altMaxG?.toFixed(3) ?? "",
        r.altMaxQ?.toFixed(3) ?? "",
        r.status,
      ].join(","),
    );
  }
  downloadBlob("sea-turtle-study.csv", "text/csv;charset=utf-8", lines.join("\n"));
}

function exportJson() {
  if (!lastStudy || !lastCfg) return;
  const payload = {
    tool: "STRIDE Sea Turtle Re-Entry Predictor",
    exportedAt: new Date().toISOString(),
    disclaimer: "Conceptual first-order model. Not for operational use.",
    config: lastCfg,
    deorbitLon: lastStudy.deorbitLon,
    steepestAngle: lastStudy.steepestAngle,
    steepestFeasible: lastStudy.steepestFeasible,
    shallowG: lastStudy.shallowG,
    rows: lastStudy.rows,
  };
  downloadBlob(
    "sea-turtle-study.json",
    "application/json;charset=utf-8",
    JSON.stringify(payload, null, 2),
  );
}

function init() {
  document.body.dataset.mode = mode;
  renderPresets();
  renderGlossary();
  renderModules();
  renderAssumptions();
  renderFieldHelp();

  document.getElementById("run-btn").addEventListener("click", run);
  document.getElementById("reset-btn").addEventListener("click", () => {
    const preset = PRESETS.find((p) => p.id === activePresetId) || PRESETS[0];
    writeConfig({
      ...DEFAULT_CONFIG,
      ...(preset?.values ?? {}),
      testShieldDiams: DEFAULT_CONFIG.testShieldDiams,
      testChuteDiams: DEFAULT_CONFIG.testChuteDiams,
    });
    run();
  });
  document.getElementById("mode-learn")?.addEventListener("click", () => setMode("learn"));
  document.getElementById("mode-research")?.addEventListener("click", () => setMode("research"));
  document.getElementById("export-csv-btn")?.addEventListener("click", exportCsv);
  document.getElementById("export-json-btn")?.addEventListener("click", exportJson);

  window.addEventListener("resize", () => {
    if (lastStudy) renderCharts(lastStudy);
  });

  run(); // run once with defaults so the page is populated
}

document.addEventListener("DOMContentLoaded", init);
