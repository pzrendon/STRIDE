/*
 * STRIDE — Re-Entry Predictor (aka Sea Turtle)
 * Client-side port of the reference Python trajectory simulation.
 *
 * Physics-informed, first-order model. Same governing equations as the
 * Python reference: 2-DOF point-mass entry with exponential atmosphere,
 * ballistic-coefficient drag, variable time step, and a Sutton-Graves style
 * stagnation-point heat-flux estimate.
 *
 * Nothing here talks to a server. All computation happens in the visitor's
 * browser, which is why there is no server-side attack surface.
 */

export const CONSTANTS = Object.freeze({
  R_EARTH: 6371000.0,
  G_ACCEL: 9.81,
  RHO_0: 1.225,
  H_SCALE: 8500.0,
  KARMAN_LINE: 100000.0,
  K_SG: 1.7415e-4,
  ROT_SPEED: 7.2921e-5,
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
const MAX_STEPS = 5_000_000;

/**
 * Run one entry simulation for a given heat-shield diameter, chute diameter,
 * and flight-path angle. Returns summary metrics plus down-sampled logs.
 */
export function runMasterSim(cfg, sDia, pDia, gammaIn) {
  const C = CONSTANTS;
  const sArea = Math.PI * (sDia / 2) ** 2;
  const shieldMass = sArea * cfg.tpsThickness * cfg.tpsDensity;
  const totalMass = cfg.payloadMassKg + shieldMass + 5.0;
  const beta = totalMass / (cfg.shieldCd * sArea);

  let h = cfg.startAltKm * 1000.0;
  const gamma = deg2rad(gammaIn);
  let vx = cfg.startVelMps * Math.cos(gamma);
  let vz = cfg.startVelMps * Math.sin(gamma);

  let t = 0,
    tK = 0,
    tC = 0,
    maxG = 0,
    maxQ = 0,
    shockG = 0,
    kReached = false;

  const altLog = [];
  const gLog = [];
  const qLog = [];
  let lonRel = 0.0;
  let stepCount = 0;

  while (h > 0 && stepCount < MAX_STEPS) {
    const dt = h < C.KARMAN_LINE + 5000 ? 0.05 : 2.0;
    const rho = h < C.KARMAN_LINE ? C.RHO_0 * Math.exp(-h / C.H_SCALE) : 1e-15;
    const vMag = Math.sqrt(vx * vx + vz * vz);

    if (h <= C.KARMAN_LINE && !kReached) {
      tK = t;
      kReached = true;
    }

    let area, cd;
    if (h <= cfg.chuteDeployAltM) {
      const pArea = Math.PI * (pDia / 2) ** 2;
      if (shockG === 0) {
        const qDyn = 0.5 * rho * vMag * vMag;
        shockG =
          (qDyn * pArea * cfg.chuteCd * cfg.shockFactorX) /
          (totalMass * C.G_ACCEL);
      }
      area = pArea;
      cd = cfg.chuteCd;
      tC += dt;
    } else {
      area = sArea;
      cd = cfg.shieldCd;
    }

    const dragA = (0.5 * rho * vMag * vMag * cd * area) / totalMass;
    // Guard against divide-by-zero if velocity collapses to exactly 0.
    const safeVMag = vMag === 0 ? 1e-12 : vMag;
    vx += -(dragA * (vx / safeVMag)) * dt;
    vz += (-(dragA * (vz / safeVMag)) + C.G_ACCEL) * dt;
    h -= vz * dt;

    const curG = dragA / C.G_ACCEL;
    if (curG > maxG) maxG = curG;

    let qDot = 0;
    if (h < C.KARMAN_LINE) {
      qDot = (C.K_SG * Math.sqrt(rho / (sDia / 2)) * vMag ** 3) / 10000.0;
      if (qDot > maxQ) maxQ = qDot;
    }

    if (stepCount % 20 === 0) {
      altLog.push(h / 1000);
      gLog.push(curG);
      qLog.push(qDot);
    }

    t += dt;
    stepCount += 1;
    lonRel += (vx * dt) / (C.R_EARTH * Math.cos(deg2rad(cfg.targetLat)));
    if (vMag < 0.2) break;
  }

  return {
    lon: rad2deg(lonRel) - rad2deg(C.ROT_SPEED * t),
    beta,
    t1: tK,
    t2: t - tK,
    g: maxG,
    q: maxQ,
    shock: shockG,
    alt: altLog,
    gArr: gLog,
    qArr: qLog,
    timedOut: stepCount >= MAX_STEPS,
  };
}

/** Iterative deorbit-burn longitude targeting (mirrors the Python solver). */
export function solveDeorbitLongitude(cfg) {
  let eLon = cfg.targetLon - 22.0;
  for (let i = 0; i < 5; i++) {
    const s = runMasterSim(
      cfg,
      cfg.testShieldDiams[1],
      cfg.testChuteDiams[0],
      cfg.entryAngleDeg,
    );
    eLon += cfg.targetLon - (eLon + s.lon);
  }
  return eLon;
}

/** Binary search for the steepest survivable entry angle (< 11.9 G). */
export function solveSteepestAngle(cfg) {
  let lo = 0.5,
    hi = 10.0,
    mid = (lo + hi) / 2;
  for (let i = 0; i < 12; i++) {
    mid = (lo + hi) / 2;
    const res = runMasterSim(
      cfg,
      cfg.testShieldDiams[1],
      cfg.testChuteDiams[0],
      mid,
    );
    if (res.g < 11.9) lo = mid;
    else hi = mid;
  }
  return mid;
}

/** Build the full parametric study across shield/chute diameters. */
export function runStudy(cfg) {
  const rows = [];
  const decelSeries = []; // for the first chute diameter, per shield
  const thermalSeries = [];

  for (const sd of cfg.testShieldDiams) {
    for (const pd of cfg.testChuteDiams) {
      const r = runMasterSim(cfg, sd, pd, cfg.entryAngleDeg);
      const surv = r.g <= 12.0 && r.shock <= 12.0 ? "PASS" : "FAIL";
      rows.push({
        shield: sd,
        chute: pd,
        beta: r.beta,
        t1: r.t1,
        t2: r.t2,
        g: r.g,
        shock: r.shock,
        q: r.q,
        status: surv,
      });

      if (pd === cfg.testChuteDiams[0]) {
        decelSeries.push({ label: `S:${sd}m`, x: r.gArr, y: r.alt });
        thermalSeries.push({ label: `S:${sd}m`, x: r.qArr, y: r.alt });
      }
    }
  }

  return {
    rows,
    decelSeries,
    thermalSeries,
    deorbitLon: solveDeorbitLongitude(cfg),
    steepestAngle: solveSteepestAngle(cfg),
  };
}

export const format = { deg2rad, rad2deg };
