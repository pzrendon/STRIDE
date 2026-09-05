import type { GeographicDataset, PopulationCell } from "./types";

/**
 * No downloads. If someone later wants census rasters or FAA airport
 * databases, drop a user-provided file behind this interface instead of
 * fetching it inside the library.
 */
export function emptyGeographicDataset(id = "empty"): GeographicDataset {
  return {
    id,
    kind: "user_provided",
    notes: "Empty dataset. Fill population / airports / routes from a local file.",
    population: [],
    airports: [],
    airways: [],
    maritimeRoutes: [],
    protectedAreas: []
  };
}

/**
 * Coarse synthetic grid around a Florida recovery site. Numbers are made up
 * for software testing — they are not census data.
 */
export function syntheticFloridaRecoveryGeography(): GeographicDataset {
  const population: PopulationCell[] = [];
  let n = 0;

  for (let lat = 26.5; lat <= 30.5; lat += 0.5) {
    for (let lon = -82.5; lon <= -79.0; lon += 0.5) {
      n += 1;
      const inland = lon > -81.0 && lat > 27.2 && lat < 29.8;
      const coastal = lon > -81.4 && lon <= -80.3;
      const ocean = lon <= -80.4 && !inland;
      let people = 40;
      if (inland) people = 18000;
      else if (coastal) people = 6500;
      if (ocean) people = 12;
      // A couple of "town" spikes so individual-risk has something to chew on.
      if (Math.abs(lat - 28.4) < 0.3 && Math.abs(lon - -80.6) < 0.3) people = 22000;

      population.push({
        id: `POP-${n}`,
        latitudeDeg: lat,
        longitudeDeg: lon,
        halfWidthDeg: 0.25,
        halfHeightDeg: 0.25,
        population: people
      });
    }
  }

  return {
    id: "synthetic-florida-recovery",
    kind: "synthetic",
    notes: "Synthetic test population only. Not census, not LandScan, not for licensing.",
    population,
    airports: [
      { id: "XMR", name: "Synthetic Cape runway (placeholder)", latitudeDeg: 28.47, longitudeDeg: -80.57 }
    ],
    airways: [],
    maritimeRoutes: [
      [
        { name: "synthetic-sea-lane-w", latitudeDeg: 27.8, longitudeDeg: -80.9 },
        { name: "synthetic-sea-lane-e", latitudeDeg: 28.9, longitudeDeg: -79.6 }
      ]
    ],
    protectedAreas: []
  };
}

export function populationAt(dataset: GeographicDataset, lat: number, lon: number): PopulationCell | undefined {
  return dataset.population.find(
    (cell) =>
      Math.abs(cell.latitudeDeg - lat) <= cell.halfHeightDeg &&
      Math.abs(cell.longitudeDeg - lon) <= cell.halfWidthDeg
  );
}
