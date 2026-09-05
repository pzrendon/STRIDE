#Post-Undergraduate-Interests-Projects

STRIDE: Supersonic+ Transport and Reusable Integrated Design and Engineering

STRIDE is an evolving aerospace engineering toolkit focused on the conceptual design and analysis of supersonic and hypersonic transport systems with an emphasis on reusable integrated engine architectures and trajectory analysis.

The goal of STRIDE is to provide a modular, extensible set of tools that support early stage trade studies, system level understanding, and design iteration for advanced air and space vehicles including spaceplanes, combined cycle propulsion systems, and reusable first stage launch platforms.

Project Vision: Modern high speed flight systems sit at the intersection of propulsion, aerodynamics, structures, and mission design. STRIDE is intended to bridge these domains by offering a unified environment for exploring how engine design choices interact with vehicle performance and flight trajectories across ascent, cruise, and entry. STRIDE is not a single monolithic solver. It is a growing collection of interoperable tools designed to scale from simple parametric studies to more detailed system level analyses.

Core Focus Areas
1. Re-Entry Predictor (aka Sea Turtle): Trajectory solvers and mission level tools for ascent, boost, cruise, and entry profiles. This includes mass fraction sensitivity, energy management, and guidance level trade studies suitable for reusable launch and high speed transport concepts.
2. Integrated Engine Design (aka Marlin): Tools for modeling and comparing reusable propulsion concepts including turbo based combined cycle, ramjet and scramjet assisted systems, and rocket augmented architectures. Emphasis is placed on mode transition logic, operating envelopes, and system level performance trends rather than component level CFD.
3. System Level Trade Studies (aka Dolphin): Parametric analysis tools to explore how propulsion choices, vehicle mass properties, and mission requirements interact. STRIDE is designed to support rapid iteration during the conceptual and preliminary design phases.
4. Part 450 Mission Safety (Sea Turtle + licensing workbook): An engineering-oriented flight-safety and evidence-traceability module. It connects Sea Turtle reentry trajectories to hazards, off-nominal cases, conceptual public-risk bookkeeping, and a Part 450 compliance matrix. It does not produce an FAA license application.

Current Status: STRIDE is under active development and should be considered an early stage research and engineering project. Initial efforts are focused on building a robust foundation for trajectory analysis and propulsion performance modeling, with additional capabilities added incrementally. The architecture is intentionally modular to allow future expansion into areas such as thermal constraints, reentry heating approximations, and high level structural mass estimation.

Design Philosophy
Physics informed first order models over black box solvers
Transparency and clarity in assumptions
Modular design for easy extension and reuse
Emphasis on insight and trade space exploration
STRIDE is intended to complement higher fidelity tools, not replace them.

Intended Use
STRIDE is suitable for:
- Conceptual vehicle design studies
- Propulsion and mission trade analysis
- Educational and research projects
- Demonstrating system level aerospace engineering capability
It is not intended for flight certification, FAA Part 450 licensing, or detailed component design.

Planned and potential features include:
1. Multi phase trajectory solvers for reusable systems
2. Integrated propulsion mode scheduling
3. Mass and performance sensitivity analysis
4. Thermal and reentry constraint approximations
5. Visualization tools for trajectories and design trade spaces
The roadmap will evolve as the project matures.

Milestone Documents
- [Marlin Conceptual Requirements and Product Specification](docs/marlin-conceptual-requirements.md): Defines the initial mission-design workflow, vehicle scope, physics-model boundaries, outputs, and clickable prototype acceptance criteria for Marlin.
- [Part 450 Mission Safety Module](docs/part450-mission-safety.md): How the Sea Turtle trajectory library is wired to a Part 450-oriented hazard / risk / evidence workbook, what is actually calculated, and what is still a placeholder.

Live site (GitHub Pages)
- [STRIDE website](https://pzrendon.github.io/STRIDE/) — Sea Turtle Re-Entry Predictor
- [Part 450 workbook](https://pzrendon.github.io/STRIDE/part450.html) — mission-safety dashboard (deploys from `main`)

Where each tool lives
- The **Sea Turtle Re-Entry Predictor** and the **Part 450 mission-safety workbook** are the live product. They ship from the static `web/` folder that GitHub Pages deploys, and `web/` is the single source of truth for their physics (`web/js/sim.js`) and analysis (`web/js/part450.js`). Preview locally with any static server:
  ```bash
  cd web && python -m http.server 8000   # then open http://localhost:8000
  ```
- The root-level **Next.js prototype is Marlin only** (rocket + aerodynamic glide playground). It does not deploy to GitHub Pages.
  - Run `npm install` and `npm run dev`, then open `/` for Marlin.
  - Run `npm run build` to type-check and build the prototype.
- Run `npm test` for the automated tests. These now exercise the shipped `web/js` Sea Turtle + Part 450 modules directly (see `tests/web/`).


Disclaimer
STRIDE is a personal engineering project developed for under personal learning interests, career outlooks and conceptual purposes only. Results should not be used for operational or safety critical applications.
