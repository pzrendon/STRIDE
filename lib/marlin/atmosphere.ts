import type { AtmosphereState } from "./types";

const SEA_LEVEL_TEMPERATURE_K = 288.15;
const SEA_LEVEL_PRESSURE_PA = 101325;
const SEA_LEVEL_DENSITY_KG_M3 = 1.225;
const GAS_CONSTANT_AIR = 287.05;
const HEAT_CAPACITY_RATIO = 1.4;
const GRAVITY_MS2 = 9.80665;
const TROPOPAUSE_ALTITUDE_M = 11000;
const STRATOSPHERE_ALTITUDE_M = 20000;
const LAPSE_RATE_K_M = -0.0065;
const SCALE_HEIGHT_M = 7200;

export const STANDARD_GRAVITY_MS2 = GRAVITY_MS2;

export function standardAtmosphere(altitudeM: number): AtmosphereState {
  const altitude = Math.max(0, altitudeM);

  if (altitude <= TROPOPAUSE_ALTITUDE_M) {
    const temperatureK = SEA_LEVEL_TEMPERATURE_K + LAPSE_RATE_K_M * altitude;
    const pressurePa =
      SEA_LEVEL_PRESSURE_PA *
      Math.pow(temperatureK / SEA_LEVEL_TEMPERATURE_K, -GRAVITY_MS2 / (LAPSE_RATE_K_M * GAS_CONSTANT_AIR));
    const densityKgM3 = pressurePa / (GAS_CONSTANT_AIR * temperatureK);

    return {
      altitudeM: altitude,
      temperatureK,
      pressurePa,
      densityKgM3,
      speedOfSoundMs: Math.sqrt(HEAT_CAPACITY_RATIO * GAS_CONSTANT_AIR * temperatureK)
    };
  }

  if (altitude <= STRATOSPHERE_ALTITUDE_M) {
    const temperatureK = 216.65;
    const pressureAtTropopause =
      SEA_LEVEL_PRESSURE_PA *
      Math.pow(
        temperatureK / SEA_LEVEL_TEMPERATURE_K,
        -GRAVITY_MS2 / (LAPSE_RATE_K_M * GAS_CONSTANT_AIR)
      );
    const pressurePa =
      pressureAtTropopause *
      Math.exp((-GRAVITY_MS2 * (altitude - TROPOPAUSE_ALTITUDE_M)) / (GAS_CONSTANT_AIR * temperatureK));
    const densityKgM3 = pressurePa / (GAS_CONSTANT_AIR * temperatureK);

    return {
      altitudeM: altitude,
      temperatureK,
      pressurePa,
      densityKgM3,
      speedOfSoundMs: Math.sqrt(HEAT_CAPACITY_RATIO * GAS_CONSTANT_AIR * temperatureK)
    };
  }

  const densityKgM3 = SEA_LEVEL_DENSITY_KG_M3 * Math.exp(-altitude / SCALE_HEIGHT_M);
  const temperatureK = altitude < 50000 ? 216.65 + 0.001 * (altitude - STRATOSPHERE_ALTITUDE_M) : 270;
  const pressurePa = densityKgM3 * GAS_CONSTANT_AIR * temperatureK;

  return {
    altitudeM: altitude,
    temperatureK,
    pressurePa,
    densityKgM3,
    speedOfSoundMs: Math.sqrt(HEAT_CAPACITY_RATIO * GAS_CONSTANT_AIR * temperatureK)
  };
}

export function dynamicPressurePa(densityKgM3: number, velocityMs: number): number {
  return 0.5 * densityKgM3 * velocityMs * velocityMs;
}
