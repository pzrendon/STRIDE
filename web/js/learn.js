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
      "A small capsule returning from low Earth orbit toward Florida. Good first run — read the story panel even if Status shows FAIL.",
    teach:
      "This ballistic (no-lift) model often exceeds the 12 G teaching screen. Focus on how β, Heat, and Shock change across shield sizes.",
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
    teach: "Compare Max G and Heat against the default. Steeper γ shortens the air phase but spikes loads.",
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
      "Higher payload mass raises β (ballistic coefficient). The vehicle punches deeper before slowing down.",
    teach: "Larger β → higher peak heating and G for the same shield. Try enlarging the shield diameter in Research mode.",
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
      "Faster entry speed (closer to lunar-return class energy, still first-order). Heating scales roughly with V³.",
    teach: "Sutton–Graves heat flux ∝ √ρ · V³. Small speed increases dominate the thermal story.",
    values: {
      payloadMassKg: 40,
      startAltKm: 400,
      startVelMps: 9500,
      entryAngleDeg: 4.2,
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
    body: "Sea Turtle treats altitudes above 100 km as essentially vacuum (negligible density). The “space phase” clock runs until the vehicle crosses this line; the “air phase” is everything below it.",
  },
  {
    id: "gamma",
    term: "Entry flight-path angle (γ)",
    short: "How steeply the velocity vector points into the atmosphere.",
    body: "Small γ (shallow) stretches the deceleration over more atmosphere — lower peak G, longer heat pulse. Large γ (steep) is a short, violent brake. Too steep and structural G limits fail; too shallow and you may skip or overshoot the target corridor.",
  },
  {
    id: "beta",
    term: "Ballistic coefficient (β)",
    short: "β = m / (Cd · A) — how hard the vehicle is to slow with drag.",
    body: "High β vehicles (heavy, small area, low Cd) reach denser air before slowing, raising peak heating and often peak G. Enlarging the heat shield lowers β. Units here are kg/m².",
  },
  {
    id: "gload",
    term: "Deceleration (G-load)",
    short: "Drag acceleration expressed in multiples of Earth gravity.",
    body: "Peak G is a structural and crew/payload limit. This tool flags configurations above ~12 G as FAIL for the parametric study. Opening-shock G at parachute deploy is a separate spike that can snap lines. Because Sea Turtle is ballistic (no lift), many LEO-like cases fail the screen — use FAIL as a prompt to compare trades, not as a flight prediction.",
  },
  {
    id: "heatflux",
    term: "Stagnation heat flux",
    short: "Estimated convective heating at the nose/shield stagnation point.",
    body: "Sea Turtle uses a Sutton–Graves-style estimate: q̇ ∝ √(ρ / R_n) · V³. It is a first-order trend tool, not a TPS sizing code. Peak flux (W/cm²) drives material and thickness trades with density.",
  },
  {
    id: "tps",
    term: "Thermal protection system (TPS)",
    short: "The heat shield mass is area × thickness × density.",
    body: "TPS mass is added to payload mass before β is computed. Thicker or denser shields protect more but raise mass — which can raise β unless area grows too. Real TPS also ablates and conducts; this model only accounts for inert mass.",
  },
  {
    id: "atmosphere",
    term: "Exponential atmosphere",
    short: "ρ = ρ₀ · exp(−h / H) below the Kármán line.",
    body: "With ρ₀ = 1.225 kg/m³ and scale height H ≈ 8.5 km, density grows rapidly as altitude falls. That is why most deceleration and heating concentrate in a relatively thin band of the lower atmosphere.",
  },
  {
    id: "drag",
    term: "2-DOF point-mass drag model",
    short: "Planar motion with drag opposing velocity; gravity on the vertical axis.",
    body: "The integrator steps altitude and velocity components with a variable time step (coarse in space, fine in atmosphere). Lift, Coriolis detail, and shape-dependent aerodynamics are omitted — transparency over fidelity.",
  },
  {
    id: "chute",
    term: "Parachute deploy & opening shock",
    short: "Below deploy altitude, Cd and area switch to the chute.",
    body: "Opening shock estimates dynamic pressure × chute area × Cd × a shock factor, divided by weight. Deploy higher to open in thinner air; a smaller chute reduces shock but raises terminal speed.",
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
  startVelMps: "Inertial-ish entry speed magnitude. LEO ≈ 7.5–7.8 km/s; faster ⇒ much more heat.",
  entryAngleDeg: "Flight-path angle below local horizontal. ~3–5° is a common capsule corridor start.",
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
  "Point-mass, planar 2-DOF; no lift, bank, or guidance closed loop.",
  "Exponential atmosphere below 100 km; near-vacuum above.",
  "Constant Cd per phase (shield vs chute); no Mach/Re tables.",
  "Sutton–Graves-style stagnation flux — trend only, not certified heating.",
  "TPS contributes mass only; no ablation, conduction, or bond-line temperature.",
  "Earth rotation appears only in a simple longitude correction.",
  "PASS/FAIL uses a 12 G structural/crew proxy for peak G and chute shock.",
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
  const hottest = study.rows.reduce((a, b) => (b.q > a.q ? b : a), study.rows[0]);
  const hardest = study.rows.reduce((a, b) => (b.g > a.g ? b : a), study.rows[0]);
  const softest = study.rows.reduce((a, b) => (b.g < a.g ? b : a), study.rows[0]);

  const paragraphs = [
    `You entered from ${cfg.startAltKm} km at ${cfg.startVelMps} m/s with γ = ${cfg.entryAngleDeg}°. Below the Kármán line (~100 km), exponential atmosphere density rises fast, so drag — and heating — concentrate in a relatively thin band.`,
    `Across ${study.rows.length} shield×chute pairs, ballistic coefficient β ranged from ${Math.min(...study.rows.map((r) => r.beta)).toFixed(0)} to ${Math.max(...study.rows.map((r) => r.beta)).toFixed(0)} kg/m². Larger shields lower β. In this no-lift ballistic model, peak G often stays high even as β falls — real capsules use lift and guidance to stretch the pulse.`,
    `Hardest peak deceleration: ${hardest.g.toFixed(1)} G (${hardest.shield.toFixed(1)} m shield). Softest in this sweep: ${softest.g.toFixed(1)} G. Hottest stagnation flux: ${hottest.q.toFixed(1)} W/cm² on the ${hottest.shield.toFixed(1)} m shield.`,
  ];

  if (hardest.altMaxG != null) {
    paragraphs.push(
      `Peak G for the hardest case sits near ~${hardest.altMaxG.toFixed(0)} km altitude — where density and leftover speed still combine before the vehicle has fully bled energy.`,
    );
  }

  const corridorNote = study.steepestFeasible
    ? `Steepest angle under the ≈11.9 G search: ${study.steepestAngle.toFixed(2)}°.`
    : `Even a very shallow γ (~0.5°) still peaks near ${Number(study.shallowG).toFixed(1)} G in this ballistic model — the 12 G PASS flag is a teaching screen, not a claim that lift-assisted entry is impossible.`;

  const takeaways = [
    `${pass.length} of ${study.rows.length} configurations PASS the 12 G peak / chute-shock screen; ${fail.length} FAIL.`,
    corridorNote,
    `Suggested deorbit-burn longitude for Lat ${cfg.targetLat.toFixed(2)}° / Lon ${cfg.targetLon.toFixed(2)}°: ${study.deorbitLon.toFixed(2)}°.`,
    `Learning tip: change one knob (γ, mass, velocity, or shield size), re-run, and compare Heat and Max G — relative trades matter more than the absolute PASS flag here.`,
  ];

  let headline;
  if (fail.length === 0) {
    headline = "All tested configurations stay within the 12 G proxy limits.";
  } else if (pass.length === 0) {
    headline =
      "All cases exceed the 12 G teaching screen — use relative trades (Heat, β, shock) to learn the physics.";
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
      "Open the glossary entry for exponential atmosphere.",
      "Ask: why do both G and heat flux stay near zero until well below 100 km?",
    ],
  },
  {
    title: "Module 2 — Ballistic coefficient trades",
    steps: [
      "Compare the default table rows: how does β fall as shield diameter rises?",
      "Load Heavy probe. What happens to Max G and Heat at the same γ?",
      "In Research mode, add a 2.4 m shield diameter to the sweep.",
    ],
  },
  {
    title: "Module 3 — Entry angle corridor",
    steps: [
      "Run Steep ballistic entry. Compare Max G and Heat to the LEO default.",
      "Read the engineer notes: this no-lift model may report no feasible 12 G corridor.",
      "Relate γ to pulse shape: steeper still tends to be sharper; real capsules add lift to stretch the pulse.",
    ],
  },
  {
    title: "Module 4 — Heating scales with V³",
    steps: [
      "Run Higher-energy return. Compare peak heat flux to the LEO case.",
      "Read the Sutton–Graves glossary note.",
      "Export CSV (Research mode) and plot Heat vs shield diameter offline.",
    ],
  },
]);
