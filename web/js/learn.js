/*
 * Sea Turtle learning content — presets, glossary, and post-run narratives.
 * Kept as plain data + pure functions so the UI can render with textContent.
 */

/** Beginner-friendly mission presets. Values feed DEFAULT_CONFIG-compatible keys. */
export const PRESETS = Object.freeze([
  {
    id: "leo-capsule",
    name: "LEO capsule (default)",
    level: "beginner",
    blurb:
      "A small capsule returning from low Earth orbit toward Florida. A clean first run of the no-lift ballistic model.",
    teach:
      "Peak G is set mostly by entry speed and γ (Allen–Eggers). Shield size mainly changes heating and chute shock — compare the table columns.",
    values: {
      payloadMassKg: 24,
      startAltKm: 300,
      startVelMps: 7650,
      entryAngleDeg: 3.75,
      targetLat: 28.47,
      targetLon: -80.57,
      shieldCd: 1.5,
      chuteCd: 1.8,
      chuteDeployAltM: 5000,
      tpsDensity: 480,
      tpsThickness: 0.05,
      shockFactorX: 1.6,
    },
  },
  {
    id: "steep-ballistic",
    name: "Steep ballistic entry",
    level: "intermediate",
    blurb:
      "Same vehicle, steeper flight-path angle. Peak deceleration rises quickly — a classic survivability trade.",
    teach:
      "Compare Max G and Heat against the default. Steeper γ shortens the air phase but spikes loads; Allen–Eggers scales with sin|γ|.",
    values: {
      payloadMassKg: 24,
      startAltKm: 300,
      startVelMps: 7650,
      entryAngleDeg: 6.5,
      targetLat: 28.47,
      targetLon: -80.57,
      shieldCd: 1.5,
      chuteCd: 1.8,
      chuteDeployAltM: 5000,
      tpsDensity: 480,
      tpsThickness: 0.05,
      shockFactorX: 1.6,
    },
  },
  {
    id: "heavy-probe",
    name: "Heavy probe",
    level: "intermediate",
    blurb:
      "Higher payload mass raises β (ballistic coefficient). Peak G barely moves; peak heating and chute shock do.",
    teach:
      "For pure ballistic entry, β mainly shifts where heating peaks and how hard the chute opens — not the Allen–Eggers G ceiling.",
    values: {
      payloadMassKg: 120,
      startAltKm: 300,
      startVelMps: 7650,
      entryAngleDeg: 3.75,
      targetLat: 28.47,
      targetLon: -80.57,
      shieldCd: 1.5,
      chuteCd: 1.8,
      chuteDeployAltM: 6000,
      tpsDensity: 480,
      tpsThickness: 0.08,
      shockFactorX: 1.6,
    },
  },
  {
    id: "high-energy",
    name: "Higher-energy return",
    level: "advanced",
    blurb:
      "Faster LEO-band entry (~8.2 km/s from 120 km). Heating scales roughly with V³; too-shallow super-circular starts can SKIP.",
    teach:
      "Sutton–Graves heat flux ∝ √ρ · V³. If Status shows SKIP, the trajectory lofted — steepen γ or lower speed.",
    values: {
      payloadMassKg: 40,
      startAltKm: 120,
      startVelMps: 8200,
      entryAngleDeg: 5.0,
      targetLat: 28.47,
      targetLon: -80.57,
      shieldCd: 1.5,
      chuteCd: 1.8,
      chuteDeployAltM: 8000,
      tpsDensity: 480,
      tpsThickness: 0.1,
      shockFactorX: 1.8,
    },
  },
]);

/** Concept glossary for the Learn panel and inline field help. */
export const GLOSSARY = Object.freeze([
  {
    id: "karman",
    term: "Kármán line",
    short: "Conventionally ~100 km — where “space” begins for this model.",
    body: "Sea Turtle uses a continuous exponential atmosphere, but the “space phase” clock still runs until the vehicle crosses 100 km; the “air phase” is everything below it.",
  },
  {
    id: "gamma",
    term: "Entry flight-path angle (γ)",
    short: "How steeply the velocity vector points into the atmosphere.",
    body: "The UI asks for degrees below the local horizon (positive). Internally γ is negative for descent. Small |γ| (shallow) lowers the Allen–Eggers peak-G estimate but can loft or skip if energy is high; large |γ| (steep) is a short, violent brake.",
  },
  {
    id: "beta",
    term: "Ballistic coefficient (β)",
    short: "β = m / (Cd · A) — how hard the vehicle is to slow with drag.",
    body: "High β vehicles reach denser air before slowing, raising peak heating and often chute shock. For pure no-lift ballistic entry, peak G is largely set by V and γ (Allen–Eggers), while β mainly moves the altitude of peak heating.",
  },
  {
    id: "allen",
    term: "Allen–Eggers peak G",
    short: "Closed-form ballistic estimate: a_max ≈ V² sin|γ| / (2 e H).",
    body: "A classic exponential-atmosphere result for constant-γ ballistic entry. Sea Turtle’s numerical integrator lets γ steepen as the vehicle slows, so peak G can exceed this estimate — especially at shallow angles. Use it as a teaching check, not a certification number.",
  },
  {
    id: "gload",
    term: "Deceleration (G-load)",
    short: "Shield drag acceleration in multiples of Earth gravity.",
    body: "Max G is recorded from heat-shield aero only. Opening-shock G at parachute deploy is reported separately. Configurations above ~12 G (or shock) are flagged FAIL for the parametric study.",
  },
  {
    id: "heatflux",
    term: "Stagnation heat flux",
    short: "Estimated convective heating at the nose/shield stagnation point.",
    body: "Sea Turtle uses a Sutton–Graves-style estimate: q̇ ∝ √(ρ / R_n) · V³. It is a first-order trend tool, not a TPS sizing code. Peak flux (W/cm²) falls as shield diameter (nose radius) grows.",
  },
  {
    id: "tps",
    term: "Thermal protection system (TPS)",
    short: "The heat shield mass is area × thickness × density.",
    body: "TPS mass is added to payload mass before β is computed. Thicker or denser shields protect more but raise mass. Real TPS also ablates and conducts; this model only accounts for inert mass.",
  },
  {
    id: "atmosphere",
    term: "Exponential atmosphere",
    short: "ρ = ρ₀ · exp(−h / H) with H ≈ 8.5 km.",
    body: "Density grows rapidly as altitude falls. That is why most deceleration and heating concentrate in a relatively thin band of the atmosphere. Gravity uses an inverse-square law on a spherical Earth.",
  },
  {
    id: "drag",
    term: "No-lift 2-DOF ballistic model",
    short: "Planar (h, V, γ) dynamics with drag only — L/D = 0.",
    body: "Governing rates: dh/dt = V sin γ, dV/dt = −D/m − g sin γ, dγ/dt = cos γ · (V/r − g/V). No lift, bank, or guidance. Midpoint (RK2) integration with a variable time step.",
  },
  {
    id: "chute",
    term: "Parachute deploy & opening shock",
    short: "Below deploy altitude, Cd and area switch to the chute.",
    body: "Opening shock estimates dynamic pressure × chute area × Cd × a shock factor, divided by weight, captured on the ballistic state just before chute aero is applied. Deploy higher to open in thinner air; a smaller chute reduces shock but raises terminal speed.",
  },
  {
    id: "skip",
    term: "Skip / loft (SKIP status)",
    short: "Trajectory climbs away instead of capturing into the atmosphere.",
    body: "At super-circular energy with a shallow γ, centrifugal terms can loft the vehicle. Sea Turtle aborts those runs as SKIP. Steepen the entry angle or reduce speed to capture.",
  },
  {
    id: "deorbit",
    term: "Deorbit burn longitude",
    short: "Where to start the entry so the ground track reaches the target.",
    body: "An iterative targeting loop estimates the Earth-relative longitude of the deorbit burn given the simulated downrange. It is a conceptual targeting aid, not a flight-dynamics product.",
  },
]);

/** Field-level help keyed by input element id. */
export const FIELD_HELP = Object.freeze({
  payloadMassKg: "Dry payload mass before adding heat-shield TPS mass.",
  startAltKm: "Initial geodetic altitude. Typical LEO returns start near 100–400 km.",
  startVelMps:
    "Inertial-ish entry speed. LEO ≈ 7.5–7.8 km/s; faster raises heat (~V³) and can SKIP if too shallow.",
  entryAngleDeg:
    "Degrees below local horizontal. ~3–5° is a common capsule start; steeper raises peak G (~sin|γ|).",
  targetLat: "Landing-site latitude used for ground-track / deorbit longitude targeting.",
  targetLon: "Landing-site longitude (deg). Positive east.",
  shieldCd: "Heat-shield drag coefficient while ballistic (pre-chute).",
  chuteCd: "Parachute drag coefficient after deploy.",
  chuteDeployAltM: "Altitude where the model switches from shield to chute aerodynamics.",
  tpsDensity: "Areal TPS density used only to compute shield mass (kg/m³).",
  tpsThickness: "Uniform shield thickness for mass estimate (m).",
  shockFactorX: "Multiplier on ideal chute load to approximate inflation dynamics.",
  testShieldDiams: "Comma-separated shield diameters (m) for the parametric sweep.",
  testChuteDiams: "Comma-separated chute diameters (m) for the parametric sweep.",
});

export const MODEL_ASSUMPTIONS = Object.freeze([
  "No-lift planar 2-DOF in (h, V, γ); L/D = 0 — no bank or guidance.",
  "Exponential atmosphere ρ = ρ₀ exp(−h/H); inverse-square gravity on a spherical Earth.",
  "Constant Cd per phase (shield vs chute); no Mach/Re tables.",
  "Peak G from shield drag only; chute opening load reported separately as Shock G.",
  "Allen–Eggers closed form is shown as a teaching check; numerical γ can steepen.",
  "Sutton–Graves-style stagnation flux — trend only, not certified heating.",
  "TPS contributes mass only; no ablation, conduction, or bond-line temperature.",
  "SKIP means the trajectory lofted above the abort altitude (super-circular / shallow).",
  "PASS/FAIL uses a 12 G proxy for peak ballistic G and chute shock.",
]);

/**
 * Build a short plain-language story of the latest study for learners.
 * @param {object} study
 * @param {object} cfg
 */
export function buildNarrative(study, cfg) {
  if (!study?.rows?.length) {
    return {
      headline: "Run a simulation to see what the physics is doing.",
      paragraphs: [],
      takeaways: [],
    };
  }

  const pass = study.rows.filter((r) => r.status === "PASS");
  const fail = study.rows.filter((r) => r.status === "FAIL");
  const skip = study.rows.filter((r) => r.status === "SKIP");
  const hottest = study.rows.reduce((a, b) => (b.q > a.q ? b : a), study.rows[0]);
  const hardest = study.rows.reduce((a, b) => (b.g > a.g ? b : a), study.rows[0]);
  const softest = study.rows.reduce((a, b) => (b.g < a.g ? b : a), study.rows[0]);
  const ae = Number(study.allenEggersG);

  const paragraphs = [
    `No-lift ballistic entry from ${cfg.startAltKm} km at ${cfg.startVelMps} m/s with γ = ${cfg.entryAngleDeg}° below the horizon. The integrator marches (h, V, γ) with drag only, exponential atmosphere, and inverse-square gravity.`,
    `Allen–Eggers teaching check for these V, γ: ≈ ${ae.toFixed(1)} G. Numerical peaks in this sweep range ${softest.g.toFixed(1)}–${hardest.g.toFixed(1)} G (γ can steepen as the vehicle slows, so the number can exceed the closed form).`,
    `Across ${study.rows.length} shield×chute pairs, β ranged from ${Math.min(...study.rows.map((r) => r.beta)).toFixed(0)} to ${Math.max(...study.rows.map((r) => r.beta)).toFixed(0)} kg/m². Larger shields mainly cut peak heat flux (hottest here: ${hottest.q.toFixed(1)} W/cm² on the ${hottest.shield.toFixed(1)} m shield) and change chute shock.`,
  ];

  if (hardest.altMaxG != null && hardest.g > 0.05) {
    paragraphs.push(
      `Peak ballistic G sits near ~${hardest.altMaxG.toFixed(0)} km for the hardest case — where density and leftover speed still combine before energy is fully bled.`,
    );
  }

  if (skip.length) {
    paragraphs.push(
      `${skip.length} run(s) lofted and aborted as SKIP. Steepen γ or reduce entry speed to capture into the atmosphere.`,
    );
  }

  const corridorNote = study.steepestFeasible
    ? `Steepest angle under the ≈11.9 G search (reference shield/chute): ${study.steepestAngle.toFixed(2)}°.`
    : `No feasible ≤11.9 G corridor found near the shallow probe (≈ ${Number(study.shallowG).toFixed(1)} G).`;

  const takeaways = [
    `${pass.length} PASS · ${fail.length} FAIL · ${skip.length} SKIP (12 G peak / chute-shock screen).`,
    corridorNote,
    `Suggested deorbit-burn longitude for Lat ${cfg.targetLat.toFixed(2)}° / Lon ${cfg.targetLon.toFixed(2)}°: ${study.deorbitLon.toFixed(2)}°.`,
    `Learning tip: change γ to move Max G; change shield diameter to move Heat and Shock — that split is the heart of ballistic entry.`,
  ];

  let headline;
  if (skip.length && pass.length === 0 && fail.length === 0) {
    headline = "All cases skipped — the trajectory lofted instead of capturing.";
  } else if (fail.length === 0 && skip.length === 0) {
    headline = "All tested configurations stay within the 12 G proxy limits.";
  } else if (pass.length === 0) {
    headline =
      "No PASS in this sweep — shallow γ to cut Max G, or resize the chute to cut opening shock.";
  } else {
    headline = "Mixed results: some shield/chute pairs survive the G screen, others do not.";
  }

  return { headline, paragraphs, takeaways };
}

/** Self-study module outlines shown in the Learn section. */
export const STUDY_MODULES = Object.freeze([
  {
    title: "Module 1 — Energy and the atmosphere",
    steps: [
      "Run the LEO capsule preset. Note space-phase vs air-phase times.",
      "Open the glossary entries for exponential atmosphere and Allen–Eggers.",
      "Ask: why do G and heat flux stay near zero until well below 100 km?",
    ],
  },
  {
    title: "Module 2 — Ballistic coefficient trades",
    steps: [
      "Compare default table rows: β falls as shield diameter rises — what happens to Heat?",
      "Load Heavy probe. Does Max G move much? Does Heat?",
      "In Research mode, add a 2.4 m shield diameter to the sweep.",
    ],
  },
  {
    title: "Module 3 — Entry angle corridor",
    steps: [
      "Run Steep ballistic entry. Compare Max G to the Allen–Eggers check in the story panel.",
      "Use the reported steepest survivable angle from the engineer notes.",
      "Relate γ to pulse shape: steeper → higher peak G (~sin|γ|).",
    ],
  },
  {
    title: "Module 4 — Heating scales with V³",
    steps: [
      "Run Higher-energy return. Compare peak heat flux to the LEO case.",
      "If you see SKIP, steepen γ — that is capture physics, not a bug.",
      "Export CSV (Research mode) and plot Heat vs shield diameter offline.",
    ],
  },
]);
