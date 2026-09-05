"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, type ReactNode } from "react";
import type { Config, Data, Layout } from "plotly.js";
import { SiteNav } from "@/components/SiteNav";
import { TrajectoryView } from "@/components/TrajectoryView";
import { formatCompact, formatDuration, formatNumber } from "@/lib/marlin/format";
import { DEFAULT_MISSION, OUTPUT_OPTIONS, type OutputOptionId, VEHICLE_PRESETS } from "@/lib/marlin/presets";
import { runMission } from "@/lib/marlin/simulator";
import type { MissionConfig, SimulationResult, VehicleConfig } from "@/lib/marlin/types";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const COLORS = ["#4fd1c5", "#63b3ed", "#f6ad55", "#fc8181"];
const PLOT_CONFIG: Partial<Config> = { displayModeBar: false, responsive: true };

export default function Home() {
  const [vehicles, setVehicles] = useState<VehicleConfig[]>(VEHICLE_PRESETS);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>(
    VEHICLE_PRESETS.map((vehicle) => vehicle.id)
  );
  const [activeVehicleId, setActiveVehicleId] = useState(VEHICLE_PRESETS[1].id);
  const [mission, setMission] = useState<MissionConfig>(DEFAULT_MISSION);
  const [selectedOutputs, setSelectedOutputs] = useState<OutputOptionId[]>(
    OUTPUT_OPTIONS.map((option) => option.id)
  );

  const selectedVehicles = vehicles.filter((vehicle) => selectedVehicleIds.includes(vehicle.id));
  const activeVehicle = vehicles.find((vehicle) => vehicle.id === activeVehicleId) ?? vehicles[0];
  const results = useMemo(
    () => selectedVehicles.map((vehicle) => runMission(vehicle, mission)),
    [mission, selectedVehicles]
  );

  function updateMission<Key extends keyof MissionConfig>(key: Key, value: MissionConfig[Key]) {
    setMission((current) => ({ ...current, [key]: value }));
  }

  function updateActiveVehicle<Key extends keyof VehicleConfig>(key: Key, value: VehicleConfig[Key]) {
    setVehicles((currentVehicles) =>
      currentVehicles.map((vehicle) =>
        vehicle.id === activeVehicle.id ? { ...vehicle, [key]: value } : vehicle
      )
    );
  }

  function updateActiveVehicleThermal(key: keyof VehicleConfig["thermal"], value: number) {
    setVehicles((currentVehicles) =>
      currentVehicles.map((vehicle) =>
        vehicle.id === activeVehicle.id
          ? { ...vehicle, thermal: { ...vehicle.thermal, [key]: value } }
          : vehicle
      )
    );
  }

  function toggleVehicle(vehicleId: string) {
    setSelectedVehicleIds((current) => {
      if (current.includes(vehicleId)) {
        return current.length === 1 ? current : current.filter((id) => id !== vehicleId);
      }
      return [...current, vehicleId];
    });
  }

  function toggleOutput(outputId: OutputOptionId) {
    setSelectedOutputs((current) =>
      current.includes(outputId)
        ? current.filter((id) => id !== outputId)
        : [...current, outputId]
    );
  }

  return (
    <main className="app-shell">
      <SiteNav current="marlin" />
      <section className="hero">
        <div className="hero-card">
          <p className="eyebrow">STRIDE / Marlin prototype</p>
          <h1>Hypersonic mission design playground</h1>
          <p className="lede">
            Compare generic rocket-boosted re-entry vehicles across boost, coast, entry, glide,
            and terminal energy-management phases. This first prototype emphasizes transparent
            system-level trends rather than component CFD or operational guidance.
          </p>
          <div className="hero-actions">
            <span className="pill">Rocket + aerodynamic glide only</span>
            <span className="pill">Point-mass trajectory model</span>
            <span className="pill">Thermal / q / g constraints</span>
            <span className="pill">Plotly + Three.js interface</span>
          </div>
        </div>

        <aside className="hero-aside panel">
          <div>
            <p className="eyebrow">Scope guardrail</p>
            <p className="disclaimer">
              Marlin uses simplified public-domain approximations for conceptual education and
              research trade-space exploration. It does not model targeting, weapon effects,
              flight certification, or validated vehicle performance.
            </p>
          </div>
          <div className="phase-timeline">
            {["boost", "coast", "entry", "glide", "terminal"].map((phase) => (
              <span className="phase-pill" key={phase}>
                {phase}
              </span>
            ))}
          </div>
        </aside>
      </section>

      <section className="dashboard">
        <aside className="controls">
          <Panel title="Compare vehicles">
            <div className="checkbox-grid">
              {vehicles.map((vehicle) => (
                <label className="checkbox-row" key={vehicle.id}>
                  <input
                    type="checkbox"
                    checked={selectedVehicleIds.includes(vehicle.id)}
                    onChange={() => toggleVehicle(vehicle.id)}
                  />
                  <span>{vehicle.name}</span>
                </label>
              ))}
            </div>
          </Panel>

          <Panel title="Mission setup">
            <div className="field-stack">
              <Slider
                label="Boost thrust"
                value={mission.boostThrustN / 1000000}
                min={0.35}
                max={2.4}
                step={0.05}
                suffix="MN"
                onChange={(value) => updateMission("boostThrustN", value * 1000000)}
              />
              <Slider
                label="Boost burn"
                value={mission.boostBurnSeconds}
                min={40}
                max={180}
                step={4}
                suffix="s"
                onChange={(value) => updateMission("boostBurnSeconds", value)}
              />
              <Slider
                label="Rocket Isp"
                value={mission.rocketIspSeconds}
                min={240}
                max={390}
                step={5}
                suffix="s"
                onChange={(value) => updateMission("rocketIspSeconds", value)}
              />
              <Slider
                label="Launch angle"
                value={mission.launchAngleDeg}
                min={35}
                max={75}
                step={1}
                suffix="deg"
                onChange={(value) => updateMission("launchAngleDeg", value)}
              />
              <Slider
                label="Entry interface"
                value={mission.entryInterfaceAltitudeM / 1000}
                min={60}
                max={110}
                step={2}
                suffix="km"
                onChange={(value) => updateMission("entryInterfaceAltitudeM", value * 1000)}
              />
            </div>
          </Panel>

          <Panel title="Vehicle tuning">
            <div className="field-stack">
              <div className="select-row">
                <label htmlFor="activeVehicle">Edit vehicle preset</label>
                <select
                  id="activeVehicle"
                  value={activeVehicle.id}
                  onChange={(event) => setActiveVehicleId(event.target.value)}
                >
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.name}
                    </option>
                  ))}
                </select>
              </div>
              <Slider
                label="Lift-to-drag"
                value={activeVehicle.liftToDrag}
                min={0.05}
                max={2.6}
                step={0.05}
                onChange={(value) => updateActiveVehicle("liftToDrag", value)}
              />
              <Slider
                label="Drag coefficient"
                value={activeVehicle.dragCoefficient}
                min={0.22}
                max={1.35}
                step={0.01}
                onChange={(value) => updateActiveVehicle("dragCoefficient", value)}
              />
              <Slider
                label="Propellant mass"
                value={activeVehicle.propellantMassKg / 1000}
                min={1}
                max={35}
                step={0.25}
                suffix="t"
                onChange={(value) => updateActiveVehicle("propellantMassKg", value * 1000)}
              />
              <Slider
                label="Bank angle"
                value={activeVehicle.bankAngleDeg}
                min={0}
                max={70}
                step={1}
                suffix="deg"
                onChange={(value) => updateActiveVehicle("bankAngleDeg", value)}
              />
              <Slider
                label="Max dynamic pressure"
                value={activeVehicle.thermal.maxDynamicPressurePa / 1000}
                min={25}
                max={120}
                step={5}
                suffix="kPa"
                onChange={(value) => updateActiveVehicleThermal("maxDynamicPressurePa", value * 1000)}
              />
            </div>
          </Panel>

          <Panel title="Visible outputs">
            <div className="checkbox-grid">
              {OUTPUT_OPTIONS.map((option) => (
                <label className="checkbox-row" key={option.id}>
                  <input
                    type="checkbox"
                    checked={selectedOutputs.includes(option.id)}
                    onChange={() => toggleOutput(option.id)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </Panel>
        </aside>

        <div className="main-column">
          <MetricGrid results={results} />

          <Panel title="Constraint status">
            <div className="constraint-list">
              {results.map((result) => (
                <div className="constraint-item" key={result.vehicle.id}>
                  <div>
                    <strong>{result.vehicle.name}</strong>
                    <p className="disclaimer">
                      Margin {formatNumber(result.constraints.reusabilityMarginPercent, 1)}%,
                      TPS estimate {formatNumber(result.constraints.thermalProtectionMassKg, 0)} kg
                    </p>
                  </div>
                  <span
                    className={`constraint-status ${
                      result.constraints.violations.length ? "warning" : "clean"
                    }`}
                  >
                    {result.constraints.violations.length
                      ? result.constraints.violations.join(", ")
                      : "within limits"}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="3D trajectory comparison">
            <TrajectoryView results={results} />
          </Panel>

          <PlotGallery results={results} selectedOutputs={selectedOutputs} />

          <Panel title="Phase transition markers">
            <div className="phase-timeline">
              {results[0]?.markers.map((marker, index) => (
                <span className="phase-pill" key={`${marker.phase}-${index}`}>
                  {marker.phase}: {formatDuration(marker.timeSeconds)} /{" "}
                  {formatNumber(marker.altitudeM / 1000, 0)} km
                </span>
              ))}
            </div>
          </Panel>

          <Panel title="Model assumptions">
            <div className="assumptions">
              <div className="assumption-card">
                Uses a simplified point-mass trajectory with drag, lift-to-drag, rocket thrust, and
                gravity. Results are trend indicators, not validated performance predictions.
              </div>
              <div className="assumption-card">
                Heating is estimated with a Sutton-Graves-style trend correlation and configurable
                vehicle thermal limits. TPS mass is a tunable conceptual correlation.
              </div>
              <div className="assumption-card">
                Current propulsion scope is rocket boost plus aerodynamic glide. TBCC, RBCC,
                ramjet, and scramjet mode envelopes are reserved for later Marlin milestones.
              </div>
            </div>
          </Panel>
        </div>
      </section>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix = "",
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="slider-row">
      <label>
        {label}
        <span className="slider-meta">
          <span>
            {formatNumber(value, step < 1 ? 2 : 0)} {suffix}
          </span>
          <span>
            {formatNumber(min, step < 1 ? 2 : 0)}-{formatNumber(max, step < 1 ? 2 : 0)} {suffix}
          </span>
        </span>
      </label>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function MetricGrid({ results }: { results: SimulationResult[] }) {
  return (
    <div className="metrics-grid">
      {results.flatMap((result) => [
        <MetricCard
          key={`${result.vehicle.id}-range`}
          label={`${result.vehicle.name} range`}
          value={`${formatNumber(result.summary.downrangeKm, 0)} km`}
          detail={`${formatNumber(result.summary.crossrangeKm, 0)} km cross-range`}
        />,
        <MetricCard
          key={`${result.vehicle.id}-mach`}
          label="Peak Mach"
          value={`M ${formatNumber(result.constraints.peakMach, 1)}`}
          detail={`${formatNumber(result.summary.finalVelocityMs, 0)} m/s terminal state`}
        />,
        <MetricCard
          key={`${result.vehicle.id}-heat`}
          label="Peak heating"
          value={`${formatNumber(result.constraints.peakHeatingRateWm2 / 1000000, 2)} MW/m2`}
          detail={`${formatCompact(result.constraints.totalHeatLoadJm2)} J/m2 heat load`}
        />,
        <MetricCard
          key={`${result.vehicle.id}-q`}
          label="Peak q / g"
          value={`${formatNumber(result.constraints.peakDynamicPressurePa / 1000, 1)} kPa`}
          detail={`${formatNumber(result.constraints.peakGLoad, 1)} g max acceleration`}
        />
      ])}
    </div>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="metric-card">
      <strong>{label}</strong>
      <span>{value}</span>
      <small>{detail}</small>
    </article>
  );
}

function PlotGallery({
  results,
  selectedOutputs
}: {
  results: SimulationResult[];
  selectedOutputs: OutputOptionId[];
}) {
  return (
    <div className="plot-grid">
      {selectedOutputs.includes("altitudeMach") && (
        <PlotCard
          title="Altitude and Mach"
          traces={[
            ...lineTraces(results, "altitudeM", "altitude km", 1000),
            ...lineTraces(results, "mach", "Mach", 1, "dot")
          ]}
          yTitle="km / Mach"
        />
      )}
      {selectedOutputs.includes("velocity") && (
        <PlotCard
          title="Velocity"
          traces={lineTraces(results, "velocityMs", "velocity m/s")}
          yTitle="m/s"
        />
      )}
      {selectedOutputs.includes("dynamicPressure") && (
        <PlotCard
          title="Dynamic pressure"
          traces={lineTraces(results, "dynamicPressurePa", "q kPa", 1000)}
          yTitle="kPa"
        />
      )}
      {selectedOutputs.includes("heating") && (
        <PlotCard
          title="Heating rate and total heat load"
          traces={[
            ...lineTraces(results, "heatingRateWm2", "heating MW/m2", 1000000),
            ...lineTraces(results, "heatLoadJm2", "heat load GJ/m2", 1000000000, "dot")
          ]}
          yTitle="MW/m2 / GJ/m2"
        />
      )}
      {selectedOutputs.includes("gLoad") && (
        <PlotCard title="Acceleration / g-load" traces={lineTraces(results, "gLoad", "g-load")} yTitle="g" />
      )}
      {selectedOutputs.includes("range") && (
        <PlotCard
          title="Downrange and cross-range"
          traces={[
            ...lineTraces(results, "downrangeM", "downrange km", 1000),
            ...lineTraces(results, "crossrangeM", "cross-range km", 1000, "dot")
          ]}
          yTitle="km"
          full
        />
      )}
    </div>
  );
}

function PlotCard({
  title,
  traces,
  yTitle,
  full = false
}: {
  title: string;
  traces: Data[];
  yTitle: string;
  full?: boolean;
}) {
  const layout: Partial<Layout> = {
    autosize: true,
    margin: { l: 54, r: 20, t: 12, b: 44 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(255,255,255,0.03)",
    font: { color: "#dce9fa" },
    xaxis: { title: { text: "time (s)" }, gridcolor: "rgba(255,255,255,0.08)" },
    yaxis: { title: { text: yTitle }, gridcolor: "rgba(255,255,255,0.08)" },
    legend: { orientation: "h", x: 0, y: 1.18 },
    height: full ? 420 : 340
  };

  return (
    <article className={`plot-card ${full ? "full" : ""}`}>
      <h3>{title}</h3>
      <Plot data={traces} layout={layout} config={PLOT_CONFIG} style={{ width: "100%", height: "100%" }} />
    </article>
  );
}

function lineTraces(
  results: SimulationResult[],
  field: keyof SimulationResult["points"][number],
  label: string,
  divisor = 1,
  dash: "solid" | "dot" = "solid"
): Data[] {
  return results.map((result, index) => ({
    x: result.points.map((point) => point.timeSeconds),
    y: result.points.map((point) => Number(point[field]) / divisor),
    name: `${result.vehicle.name} ${label}`,
    type: "scatter",
    mode: "lines",
    line: {
      color: COLORS[index % COLORS.length],
      width: dash === "solid" ? 3 : 2,
      dash
    }
  }));
}
