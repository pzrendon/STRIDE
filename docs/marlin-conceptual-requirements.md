# Marlin Conceptual Requirements and Product Specification

## 1. Product vision

Marlin is a mission-design and conceptual performance exploration tool for reusable hypersonic vehicles. It is part of the STRIDE toolkit and focuses on system-level questions: how vehicle class, trajectory, propulsion architecture, thermal constraints, and operating envelopes interact across a full mission profile.

The initial Marlin experience should feel like a public, game-like engineering playground while remaining useful to aerospace researchers performing early trade studies. It should prioritize transparent first-order physics, interactive comparison, and visual intuition over high-fidelity component simulation.

Marlin is not intended for operational mission planning, detailed propulsion design, weapons employment, targeting, flight certification, or component-level CFD.

## 2. Initial milestone

The first milestone has two deliverables:

1. A conceptual requirements/specification document defining Marlin's scope, users, workflows, modeling boundaries, and first prototype targets.
2. A clickable web app prototype with a physics model for full mission profile comparison of rocket-boosted hypersonic re-entry vehicle concepts.

The prototype should initially model combined rocket plus aerodynamic glide architectures only. Combined-cycle propulsion modes such as TBCC, RBCC, ramjet, and scramjet operation should be represented in the data model and UI roadmap, but not required for the first physics implementation.

## 3. Target users

### Primary users

- Aerospace researchers exploring conceptual mission and vehicle trade spaces.
- Students and educators learning how ascent, glide, entry, thermal limits, and energy management interact.
- Public technical users who want an approachable but physics-informed hypersonics playground.

### Secondary users

- Portfolio reviewers evaluating system-level aerospace software capability.
- Conceptual design teams comparing reusable vehicle architectures before higher-fidelity analysis.

## 4. Vehicle scope

Marlin should support the following vehicle families:

- Lifting-body hypersonic re-entry vehicles.
- Reusable spaceplane concepts.
- Capsules and blunt-body re-entry vehicles.

The first prototype should use simplified configurable vehicle archetypes rather than detailed geometry:

- Capsule / blunt body.
- Low-lift lifting body.
- High-lift reusable spaceplane.

Each archetype should expose editable parameters while providing safe defaults for public exploration.

## 5. Mission scope

Marlin should compare full mission profiles. The first version should support these phases:

1. Pre-reentry rocket boost/ascent.
2. Coast or exo-atmospheric transition.
3. Atmospheric entry interface.
4. Hypersonic glide and energy management.
5. Terminal atmospheric energy management.

Initial propulsion modeling should focus on rocket boost and optional terminal impulse/energy-management capability. Air-breathing propulsion modes can be reserved for later milestones.

## 6. Core user workflow

The intended workflow is mission-design oriented:

1. Choose or create a vehicle archetype.
2. Select a mission template.
3. Configure mass, aerodynamic, propulsion, and thermal parameters.
4. Run one or more mission simulations.
5. Compare outputs across vehicles or parameter sweeps.
6. Inspect trajectory, operating envelopes, constraints, and performance trends.
7. De-select outputs that are not relevant to the user's current trade study.

The UI should encourage iterative exploration: edit a parameter, rerun quickly, compare trends, and understand which constraint drove the result.

## 7. Core outputs

Users should be able to compare and selectively hide/show:

- Downrange distance.
- Cross-range distance.
- Peak Mach number.
- Mach profile over time.
- Altitude profile over time.
- Velocity profile over time.
- Dynamic pressure.
- Heating rate estimate.
- Integrated heat load estimate.
- Payload fraction.
- Propellant mass.
- Vehicle mass fraction.
- Mode or phase transition points.
- Specific impulse trend for active propulsion phases.
- Acceleration / g-load.
- Thermal protection mass estimate.
- Reusability margin.
- Constraint violations and active limiting factors.

Outputs should be visualized as both numeric summaries and plots. Plotly should be used for interactive engineering plots. Three.js can be used for visual trajectory or vehicle-state presentation where it adds clarity.

## 8. Initial physics model requirements

The first physics implementation should use first-order, transparent models suitable for conceptual exploration.

### Atmosphere

- Standard atmosphere approximation as a function of altitude.
- Speed of sound, density, temperature, and pressure.
- Dynamic pressure calculation.

### Vehicle dynamics

- Point-mass trajectory model.
- Configurable lift-to-drag ratio by vehicle archetype.
- Drag force based on dynamic pressure, reference area, and drag coefficient.
- Lift force based on dynamic pressure, reference area, and lift coefficient or L/D assumption.
- Simplified gravity model suitable for conceptual trajectory comparisons.

### Rocket boost

- Configurable thrust.
- Configurable specific impulse.
- Configurable propellant mass.
- Mass depletion during powered flight.
- Optional throttle schedule or simplified boost profile.

### Entry and glide

- Entry interface state definition.
- Angle-of-attack or commanded L/D proxy.
- Bank-angle or cross-range proxy for lifting vehicles.
- Energy management logic constrained by thermal, g-load, and dynamic-pressure limits.

### Thermal approximation

- Convective heating-rate approximation suitable for trend analysis.
- Integrated heat-load estimate.
- Thermal protection mass estimate as a configurable correlation.
- Reusability margin based on peak heating, total heat load, and configured material limits.

### Constraints

The simulation should track and report:

- Maximum dynamic pressure.
- Maximum heating rate.
- Maximum heat load.
- Maximum g-load.
- Maximum thermal protection margin.
- Minimum/maximum operating altitude by phase.
- Phase transition feasibility.

## 9. Mode and phase transition logic

Although the initial implementation focuses on rocket plus aerodynamic glide, Marlin should be structured around phase and mode transition logic from the start.

### Initial phase transitions

- Rocket boost cutoff.
- Coast-to-entry interface.
- Entry-to-glide.
- Glide-to-terminal energy management.

### Future propulsion mode transitions

Future versions should support:

- Turbojet/turbofan to ramjet transition.
- Ramjet to scramjet transition.
- Scramjet to rocket or glide transition.
- Rocket augmentation windows.
- Inlet operability limits.

### Transition constraints

Transitions should be constrained by:

- Mach number.
- Altitude.
- Dynamic pressure.
- Thermal limits.
- Propellant or energy state.
- Inlet operability for future air-breathing modes.

The user should eventually be able to choose between fixed transition rules and optimized transition scheduling.

## 10. Optimization requirements

Optimization should be a later capability, not required in the first clickable prototype. The architecture should leave room for:

- Maximizing range.
- Maximizing cross-range.
- Minimizing heat load.
- Minimizing propellant use.
- Maximizing payload fraction.
- Maintaining reusability margin.
- Finding feasible phase transition schedules.

Optimization outputs should explain the active constraints that shaped the result.

## 11. Web application requirements

Preferred stack:

- React.
- Next.js.
- Three.js for 3D visual context.
- Plotly for interactive plots.

The first clickable prototype should include:

- Mission setup panel.
- Vehicle parameter panel.
- Run/compare controls.
- Plot selection controls.
- Summary metrics cards.
- Constraint status panel.
- Mission phase timeline.
- At least one visual trajectory view.

The app should be usable without requiring local scientific software installation. If heavier solvers are introduced later, they should be isolated behind a clear API boundary.

## 12. Suggested data model

The first implementation should define structured objects for:

### Vehicle

- Name.
- Archetype.
- Dry mass.
- Propellant mass.
- Payload mass.
- Reference area.
- Lift coefficient model.
- Drag coefficient model.
- Lift-to-drag estimate.
- Thermal protection properties.
- Reusability limits.

### Propulsion system

- Name.
- Mode type.
- Thrust.
- Specific impulse.
- Propellant mass allocation.
- Operating Mach range.
- Operating altitude range.
- Dynamic-pressure limits.
- Thermal limits.

For the first prototype, the active propulsion mode is rocket only.

### Mission

- Name.
- Initial altitude.
- Initial velocity.
- Target entry interface.
- Boost profile.
- Coast settings.
- Entry settings.
- Glide settings.
- Terminal energy-management settings.

### Simulation result

- Time history.
- State history.
- Phase history.
- Constraint history.
- Summary metrics.
- Plot-ready derived quantities.

## 13. Public-facing safety and scope guardrails

Because hypersonic vehicle modeling can be dual-use, Marlin should remain explicitly conceptual and educational:

- Use simplified public-domain physics approximations.
- Avoid operational targeting, intercept, or weapons-effect modeling.
- Avoid guidance laws intended for real-world terminal targeting.
- Present results as approximate trends, not validated vehicle performance.
- Include clear disclaimers in the UI and documentation.
- Prefer generic archetypes and public reference concepts over sensitive or proprietary vehicle definitions.

## 14. First prototype acceptance criteria

The first clickable prototype should be considered successful when a user can:

1. Select at least three vehicle archetypes: capsule, lifting body, and reusable spaceplane.
2. Configure mass, aerodynamic, propulsion, and thermal parameters.
3. Run a full mission profile from rocket boost through terminal atmospheric energy management.
4. Compare at least two vehicles or mission configurations.
5. View selectable plots for altitude, Mach, velocity, dynamic pressure, heating rate, heat load, range, and g-load.
6. See phase transition points on plots and in a timeline.
7. See whether thermal, dynamic-pressure, or g-load constraints were violated.
8. Read model assumptions from within the app.

## 15. Open design questions

These questions should be answered before implementation of the clickable prototype:

- Should the first solver run entirely client-side in TypeScript, or should physics live behind a Python/FastAPI service?
- Should the initial trajectory model be 2D vertical-plane only, or include a simplified 3D cross-range model?
- Which public reference vehicle parameters should be used for default presets?
- How should thermal protection mass be estimated for capsules versus lifting bodies?
- What level of numerical integration accuracy is appropriate for interactive use?
- Should optimization be exposed in the first prototype as disabled UI scaffolding or omitted until the solver supports it?

## 16. Recommended build sequence

1. Define TypeScript schemas for vehicle, propulsion, mission, constraints, and simulation result objects.
2. Implement atmosphere and derived flight-state utilities.
3. Implement rocket boost mass and thrust propagation.
4. Implement simplified entry/glide trajectory propagation.
5. Add thermal and g-load constraint calculations.
6. Build the mission setup and comparison UI.
7. Add Plotly-based output plots and phase markers.
8. Add Three.js trajectory visualization.
9. Add assumption/disclaimer panels.
10. Add optimization experiments after the deterministic workflow is stable.

