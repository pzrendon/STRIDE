// Shared with web/js/sim.js — if you change a number here, change it there too.
// Sea Turtle is a teaching/conceptual ballistic entry model, not a certified
// 6-DOF flight-safety propagator.

export const SEA_TURTLE_CONSTANTS = Object.freeze({
  R_EARTH: 6_371_000.0,
  G0: 9.81,
  RHO_0: 1.225,
  H_SCALE: 8500.0,
  KARMAN_LINE: 100_000.0,
  K_SG: 1.7415e-4,
  ROT_SPEED: 7.2921e-5,
  ALLEN_EGGERS_E: Math.E,
  SKIP_ABORT_ALT_M: 2_000_000,
  MAX_SIM_TIME_S: 20_000,
  MAX_STEPS: 2_000_000
});
