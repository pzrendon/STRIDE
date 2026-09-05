/*
 * STRIDE — Re-Entry Predictor (aka Sea Turtle)
 * Client-side no-lift ballistic entry model.
 *
 * Planar 2-DOF point-mass equations in (h, V, γ) with:
 *   - continuous exponential atmosphere
 *   - inverse-square gravity
 *   - drag only (L/D = 0) — classic ballistic entry
 *   - Sutton–Graves-style stagnation heat-flux estimate
 *   - parachute phase via Cd/A switch + opening-shock proxy
 *
 * Flight-path angle γ is measured from local horizontal and is negative
 * during descent (aerospace convention). The UI still enters a positive
 * "entry angle" in degrees below the horizon.
 *
 * Peak G is recorded during the heat-shield (ballistic) phase only; chute
 * opening load is reported separately as Shock G.
 *
 * Nothing here talks to a server. All computation happens in the visitor's
 * browser, which is why there is no server-side attack surface.
 */

export const CONSTANTS = Object.freeze({
  R_EARTH: 6371000.0,
  G0: 9.81,
  RHO_0: 1.225,
  H_SCALE: 8500.0,
  KARMAN_LINE: 100000.0,
  K_SG: 1.7415e-4,
  ROT_SPEED: 7.2921e-5,
  /** Approximate peak-G factor from Allen–Eggers: V² sin|γ| / (2 e H) */
  ALLEN_EGGERS_E: Math.E,
  /** Abort if the vehicle lofts above this altitude (skip / escape). */
  SKIP_ABORT_ALT_M: 2_000_000,
  /** Soft wall-clock for a single integration (seconds of simulated time). */
  MAX_SIM_TIME_S: 20_000,
});

// Defaults mirror the Python "USER CONFIGURATION PANEL".
export const DEFAULT_CONFIG = Object.freeze({
  missionName: "STRIDE_Re-Entry_Predictor",
  payloadMassKg: 24.0,
  startAltKm: 300.0,
  startVelMps: 7650.0,
  entryAngleDeg: 3.75,
  targetLat: 28.47,
  targetLon: -80.57,
  tpsDensity: 480.0,
  tpsThickness: 0.05,
  chuteCd: 1.8,
  shieldCd: 1.5,
  chuteDeployAltM: 5000.0,
  shockFactorX: 1.6,
  testShieldDiams: [0.8, 1.2, 1.8],
  testChuteDiams: [3.0, 5.0],
});

const deg2rad = (d) => (d * Math.PI) / 180.0;
const rad2deg = (r) => (r * 180.0) / Math.PI;

// Safety guard: prevents a pathological input set from freezing the browser
// tab with an unbounded integration loop.
const MAX_STEPS = 2_000_000;

function density(h) {
  // Continuous exponential model (tiny but non-zero above the Kármán line).
  return CONSTANTS.RHO_0 * Math.exp(-Math.max(h, 0) / CONSTANTS.H_SCALE);
}

function gravity(h) {
  const r = CONSTANTS.R_EARTH + Math.max(h, 0);
  return CONSTANTS.G0 * (CONSTANTS.R_EARTH / r) ** 2;
}

/**
 * Allen–Eggers closed-form peak deceleration (G) for exponential-atmosphere
 * ballistic entry at constant γ. Real no-lift trajectories steepen as they
 * slow, so the numerical peak can exceed this estimate — especially at
 * shallow entry angles.
 */
export function allenEggersPeakG(velMps, entryAngleDeg) {
  const gamma = deg2rad(Math.abs(entryAngleDeg));
  const aMax =
    (velMps * velMps * Math.sin(gamma)) /
    (2 * CONSTANTS.ALLEN_EGGERS_E * CONSTANTS.H_SCALE);
  return aMax / CONSTANTS.G0;
}

function pickDt(h, v, rho) {
  // Coarse in vacuum / loft, finer where drag rises, finest near chute.
  if (h > CONSTANTS.KARMAN_LINE + 50000) return 2.0;
  if (h > CONSTANTS.KARMAN_LINE) return 0.5;
  if (h > 40000) return 0.1;
  if (h > 15000) return 0.05;
  if (rho * v > 200) return 0.02;
  return 0.05;
}

/**
 * Right-hand side of the no-lift planar entry ODEs.
 * State: altitude h [m], speed V [m/s], flight-path γ [rad] (neg. = descent).
 *
 *   dh/dt     = V sin γ
 *   dV/dt     = −D/m − g sin γ
 *   dγ/dt     = cos γ · (V/r − g/V)     (L = 0)
 */
function derivs(h, v, gamma, mass, cd, area) {
  const C = CONSTANTS;
  const r = C.R_EARTH + h;
  const g = gravity(h);
  const rho = density(h);
  const safeV = Math.max(v, 1e-9);
  const dragA = (0.5 * rho * safeV * safeV * cd * area) / mass;

  return {
    dh: safeV * Math.sin(gamma),
    dV: -dragA - g * Math.sin(gamma),
    dGamma: Math.cos(gamma) * (safeV / r - g / safeV),
    dragA,
    rho,
    g,
  };
}

function wrapLon(lon) {
  let x = lon;
  while (x > 180) x -= 360;
  while (x < -180) x += 360;
  return x;
}

/**
 * Run one entry simulation for a given heat-shield diameter, chute diameter,
 * and flight-path angle (positive degrees below horizon). Returns summary
 * metrics plus down-sampled logs.
 *
 * options (all optional; omit them and this is the original Sea Turtle run):
 *   track, startLongitudeDeg, chuteEnabled, shieldCd, crossrangeRateMps,
 *   maxSamples, initialState { h, v, gamma, t, rangeM, crossrangeM, mass }
 */
export function runMasterSim(cfg, sDia, pDia, gammaInDeg, options = {}) {
  const C = CONSTANTS;
  const sArea = Math.PI * (sDia / 2) ** 2;
  const pArea = Math.PI * (pDia / 2) ** 2;
  const shieldMass = sArea * cfg.tpsThickness * cfg.tpsDensity;
  const totalMass = options.initialState?.mass ?? cfg.payloadMassKg + shieldMass + 5.0;
  const shieldCd = options.shieldCd ?? cfg.shieldCd;
  const chuteEnabled = options.chuteEnabled !== false;
  const crossrangeRateMps = options.crossrangeRateMps ?? 0;
  const startLon = options.startLongitudeDeg;
  const track = Boolean(options.track);
  const maxSamples = options.maxSamples ?? 480;
  const beta = totalMass / (shieldCd * sArea);

  const init = options.initialState;
  let h = init?.h ?? cfg.startAltKm * 1000.0;
  let v = init?.v ?? cfg.startVelMps;
  // UI entry angle is below-horizon positive → γ negative for descent.
  let gamma = init?.gamma ?? -deg2rad(Math.abs(gammaInDeg));

  let t = init?.t ?? 0,
    tK = 0,
    maxG = 0,
    maxQ = 0,
    maxQdyn = 0,
    shockG = 0,
    altMaxG = 0,
    altMaxQ = 0,
    rangeM = init?.rangeM ?? 0,
    crossrangeM = init?.crossrangeM ?? 0,
    kReached = h <= C.KARMAN_LINE,
    chuteDeployed = Boolean(init?.chuteDeployed),
    outcome = "integrating";

  const altLog = [];
  const gLog = [];
  const qLog = [];
  const samples = [];
  const events = [];
  let stepCount = 0;

  const latRad = deg2rad(cfg.targetLat);
  const cosLat = Math.max(Math.abs(Math.cos(latRad)), 1e-6);

  const lonAt = (range, time) => {
    const lonRelDeg = rad2deg(range / (C.R_EARTH * cosLat));
    const earthRotateDeg = rad2deg(C.ROT_SPEED * time);
    return wrapLon((startLon ?? 0) + lonRelDeg - earthRotateDeg);
  };
  const latAt = (cross) => {
    const lat = cfg.targetLat + rad2deg(cross / C.R_EARTH);
    return Math.max(-89.9, Math.min(89.9, lat));
  };
  const pushSample = (force) => {
    if (!track) return;
    const stride = Math.max(1, Math.floor(40));
    if (!force && stepCount % stride !== 0) return;
    const last = samples[samples.length - 1];
    if (last && !force && t - last.t < 0.4) return;
    if (samples.length > maxSamples && !force) return;
    samples.push({
      t,
      h,
      v,
      gammaDeg: rad2deg(gamma),
      rangeM,
      crossrangeM,
      lat: latAt(crossrangeM),
      lon: lonAt(rangeM, t),
      qDyn: 0.5 * density(h) * v * v,
      mass: totalMass,
      chuteDeployed,
    });
  };
  const recordEvent = (id, label) => {
    if (!track || events.some((e) => e.id === id)) return;
    const sample = samples[samples.length - 1];
    events.push({ id, label, t, sample });
  };

  pushSample(true);
  recordEvent("sim-start", "Propagation start");

  while (stepCount < MAX_STEPS) {
    if (h <= 0) {
      outcome = "landed";
      h = 0;
      break;
    }
    if (v <= 0.2) {
      outcome = h < 1000 ? "landed" : "stalled";
      break;
    }
    if (t > C.MAX_SIM_TIME_S) {
      outcome = "timeout";
      break;
    }
    if (h > C.SKIP_ABORT_ALT_M) {
      outcome = "skipped";
      break;
    }

    const rho = density(h);
    const dt = pickDt(h, v, rho);

    if (h <= C.KARMAN_LINE && !kReached) {
      tK = t;
      kReached = true;
      pushSample(true);
      recordEvent("entry-interface", "Atmospheric entry interface (~100 km)");
    }

    // Capture opening shock on the ballistic state *before* chute aero is
    // applied, so RK2 midpoints cannot bleed speed and under-report shock.
    if (chuteEnabled && !chuteDeployed && h <= cfg.chuteDeployAltM) {
      const qDyn = 0.5 * rho * v * v;
      shockG =
        (qDyn * pArea * cfg.chuteCd * cfg.shockFactorX) /
        (totalMass * C.G0);
      chuteDeployed = true;
      pushSample(true);
      recordEvent("chute-deploy", "Parachute deploy");
    }

    const area = chuteDeployed ? pArea : sArea;
    const cd = chuteDeployed ? cfg.chuteCd : shieldCd;

    // Midpoint (RK2) integration of the no-lift ODEs.
    const k1 = derivs(h, v, gamma, totalMass, cd, area);
    const hMid = h + 0.5 * dt * k1.dh;
    const vMid = Math.max(v + 0.5 * dt * k1.dV, 0);
    const gMid = gamma + 0.5 * dt * k1.dGamma;
    // Keep aero mode fixed across the step once the chute decision is made.
    const k2 = derivs(hMid, vMid, gMid, totalMass, cd, area);

    // Ballistic peak G from shield aero only (never from chute Cd/A).
    const shieldDragA =
      (0.5 * rho * Math.max(v, 1e-9) ** 2 * shieldCd * sArea) / totalMass;
    const ballisticG = shieldDragA / C.G0;
    if (!chuteDeployed && ballisticG > maxG) {
      maxG = ballisticG;
      altMaxG = Math.max(h, 0) / 1000;
    }

    h += dt * k2.dh;
    v = Math.max(v + dt * k2.dV, 0);
    gamma += dt * k2.dGamma;

    const qDyn = 0.5 * k2.rho * v * v;
    if (qDyn > maxQdyn) maxQdyn = qDyn;

    let qDot = 0;
    if (h < C.KARMAN_LINE && h > 0) {
      qDot =
        (C.K_SG * Math.sqrt(Math.max(k2.rho, 0) / (sDia / 2)) * v ** 3) /
        10000.0;
      if (qDot > maxQ) {
        maxQ = qDot;
        altMaxQ = h / 1000;
      }
    }

    // Ground-range increment (arc on spherical Earth).
    const r = C.R_EARTH + Math.max(h, 0);
    rangeM += ((v * Math.cos(gamma) * C.R_EARTH) / r) * dt;
    crossrangeM += crossrangeRateMps * dt;

    if (stepCount % 20 === 0) {
      altLog.push(h / 1000);
      gLog.push(ballisticG);
      qLog.push(qDot);
    }

    t += dt;
    stepCount += 1;
    pushSample(false);
  }

  if (stepCount >= MAX_STEPS && outcome === "integrating") {
    outcome = "timeout";
  }

  pushSample(true);
  recordEvent(
    "end-of-propagation",
    outcome === "landed" ? "Surface impact / landing" : `Ended: ${outcome}`,
  );

  const lonRelDeg = rad2deg(rangeM / (C.R_EARTH * cosLat));
  const earthRotateDeg = rad2deg(C.ROT_SPEED * t);
  const relativeLon = lonRelDeg - earthRotateDeg;
  const impactLat = latAt(crossrangeM);
  const impactLon =
    startLon == null ? relativeLon : lonAt(rangeM, t);

  return {
    lon: relativeLon,
    beta,
    t1: tK,
    t2: kReached ? Math.max(t - tK, 0) : 0,
    g: maxG,
    q: maxQ,
    shock: shockG,
    altMaxG,
    altMaxQ,
    maxQdyn,
    rangeKm: rangeM / 1000,
    allenEggersG: allenEggersPeakG(cfg.startVelMps, gammaInDeg),
    outcome,
    alt: altLog,
    gArr: gLog,
    qArr: qLog,
    timedOut: outcome === "timeout",
    impactLatitudeDeg: impactLat,
    impactLongitudeDeg: impactLon,
    impactVelocityMs: v,
    impactKineticEnergyJ: 0.5 * totalMass * v * v,
    deorbitLongitudeDeg: startLon ?? null,
    samples,
    events,
    massKg: totalMass,
  };
}

/** Full ground-track run used by the Part 450 workbook. */
export function runTrackedEntry(cfg, options = {}) {
  const { shield, chute } = referenceShieldChute(cfg);
  const sDia = options.shieldDiameterM ?? shield;
  const pDia = options.chuteDiameterM ?? chute;
  const gamma = options.entryAngleDeg ?? cfg.entryAngleDeg;
  let startLon = options.startLongitudeDeg;
  if (startLon == null && !options.skipTargeting) {
    startLon = cfg.targetLon - 22.0;
    for (let i = 0; i < 5; i += 1) {
      const s = runMasterSim(cfg, sDia, pDia, gamma, {
        ...options,
        track: false,
        startLongitudeDeg: startLon,
        skipTargeting: true,
      });
      if (s.outcome !== "landed") break;
      startLon += cfg.targetLon - s.impactLongitudeDeg;
    }
    startLon = wrapLon(startLon);
  }
  if (startLon == null) startLon = cfg.targetLon;
  return runMasterSim(cfg, sDia, pDia, gamma, {
    ...options,
    track: true,
    startLongitudeDeg: startLon,
  });
}

function referenceShieldChute(cfg) {
  const shield =
    cfg.testShieldDiams[
      Math.min(1, Math.max(0, cfg.testShieldDiams.length - 1))
    ];
  const chute = cfg.testChuteDiams[0];
  return { shield, chute };
}

/** Iterative deorbit-burn longitude targeting. */
export function solveDeorbitLongitude(cfg) {
  const { shield, chute } = referenceShieldChute(cfg);
  let eLon = cfg.targetLon - 22.0;
  for (let i = 0; i < 5; i++) {
    const s = runMasterSim(cfg, shield, chute, cfg.entryAngleDeg);
    if (s.outcome !== "landed") break;
    eLon += cfg.targetLon - (eLon + s.lon);
  }
  return eLon;
}

/**
 * Binary search for the steepest survivable entry angle (< 11.9 G).
 * Returns { angle, feasible, shallowG }.
 */
export function solveSteepestAngle(cfg) {
  const { shield, chute } = referenceShieldChute(cfg);
  const shallow = runMasterSim(cfg, shield, chute, 0.5);
  if (shallow.outcome !== "landed" || shallow.g >= 11.9) {
    return {
      angle: 0.5,
      feasible: shallow.outcome === "landed" && shallow.g < 11.9,
      shallowG: shallow.g,
    };
  }
  let lo = 0.5,
    hi = 15.0,
    mid = (lo + hi) / 2;
  for (let i = 0; i < 14; i++) {
    mid = (lo + hi) / 2;
    const res = runMasterSim(cfg, shield, chute, mid);
    if (res.outcome === "landed" && res.g < 11.9) lo = mid;
    else hi = mid;
  }
  return { angle: mid, feasible: true, shallowG: shallow.g };
}

/** Build the full parametric study across shield/chute diameters. */
export function runStudy(cfg) {
  const rows = [];
  const decelSeries = [];
  const thermalSeries = [];

  for (const sd of cfg.testShieldDiams) {
    for (const pd of cfg.testChuteDiams) {
      const r = runMasterSim(cfg, sd, pd, cfg.entryAngleDeg);
      const landed = r.outcome === "landed";
      const surv =
        landed && r.g <= 12.0 && r.shock <= 12.0
          ? "PASS"
          : landed
            ? "FAIL"
            : r.outcome === "skipped"
              ? "SKIP"
              : "FAIL";
      rows.push({
        shield: sd,
        chute: pd,
        beta: r.beta,
        t1: r.t1,
        t2: r.t2,
        g: r.g,
        shock: r.shock,
        q: r.q,
        altMaxG: r.altMaxG,
        altMaxQ: r.altMaxQ,
        rangeKm: r.rangeKm,
        maxQdyn: r.maxQdyn,
        allenEggersG: r.allenEggersG,
        outcome: r.outcome,
        status: surv,
      });

      if (pd === cfg.testChuteDiams[0]) {
        decelSeries.push({ label: `S:${sd}m`, x: r.gArr, y: r.alt });
        thermalSeries.push({ label: `S:${sd}m`, x: r.qArr, y: r.alt });
      }
    }
  }

  const steepest = solveSteepestAngle(cfg);
  const ae = allenEggersPeakG(cfg.startVelMps, cfg.entryAngleDeg);
  return {
    rows,
    decelSeries,
    thermalSeries,
    deorbitLon: solveDeorbitLongitude(cfg),
    steepestAngle: steepest.angle,
    steepestFeasible: steepest.feasible,
    shallowG: steepest.shallowG,
    allenEggersG: ae,
  };
}

export const format = { deg2rad, rad2deg };
