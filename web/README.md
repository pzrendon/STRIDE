# STRIDE — Website

A static website for STRIDE (Supersonic+ Transport and Reusable Integrated
Design and Engineering). It presents the project and hosts an interactive
**Re-Entry Predictor (Sea Turtle)** that runs the trajectory simulation entirely
in the visitor's browser.

## Structure

```
web/
├── index.html      # landing page + interactive tool markup
├── styles.css      # dark aerospace theme
├── _headers        # security headers for Netlify / Cloudflare Pages
└── js/
    ├── sim.js      # physics engine (ported from the Python reference)
    ├── plot.js     # dependency-free canvas line charts
    ├── learn.js    # presets, glossary, study modules, run narratives
    └── app.js      # UI wiring, Learn/Research modes, export
```

Zero build step and zero third-party runtime dependencies — plain HTML, CSS,
and ES-module JavaScript.

### Learning & research UX

- **Learn mode** — guided presets, concept glossary, self-study modules, and a
  plain-language “what just happened” narrative after each run.
- **Research mode** — custom shield/chute diameter sweeps, targeting knobs, and
  CSV/JSON export of the parametric study.
- Inline field help and an assumptions panel document the first-order model.

## Run locally

Because it uses ES modules, open it through a local server (not `file://`):

```bash
# from the web/ folder
python -m http.server 8000
# then visit http://localhost:8000
```

## Deploy

Any static host works. Recommended (all free, HTTPS by default):

| Host | Notes |
| --- | --- |
| **Cloudflare Pages** | Best security story: honors `_headers`, free WAF, DDoS protection. |
| **Netlify** | Honors `_headers`; simple drag-and-drop or Git deploy. |
| **GitHub Pages** | Easiest from an existing repo; cannot set HTTP headers, so the CSP `<meta>` tag in `index.html` is the fallback. |

Point the host at this `web/` folder (or set it as the publish/output directory).

---

## Security

The architecture was chosen specifically to minimize risk.

### Why this design is the safe default

- **No backend, no database, no user accounts.** The simulation runs client-side,
  so there is no server to compromise, no injection surface, and no stored data
  to breach. The classic web attack classes (SQLi, SSRF, auth bypass, server
  RCE) don't apply because there is no server logic.
- **No third-party scripts.** The charting is hand-written on `<canvas>`, so
  there is no CDN/npm supply-chain exposure at runtime.
- **Output is rendered with `textContent`, never `innerHTML`.** User-entered
  numbers can never be interpreted as HTML/JS, which closes the DOM-XSS door.
- **Inputs are validated and clamped** (`app.js`) and the integration loop has a
  hard step cap (`sim.js`), so a hostile input set cannot freeze the tab.

### Layers already in place

1. **HTTPS/TLS** — automatic on all recommended hosts. Add HSTS (in `_headers`).
2. **Content-Security-Policy** — `default-src 'none'` with `'self'`-only scripts,
   styles, and connections. Set via header (`_headers`) and via `<meta>` fallback.
3. **Hardening headers** — `X-Content-Type-Options: nosniff`,
   `X-Frame-Options: DENY` / `frame-ancestors 'none'` (anti-clickjacking),
   `Referrer-Policy: no-referrer`, and a restrictive `Permissions-Policy`.

### If/when you add a backend later

The moment STRIDE gains server-side compute (heavy solvers), saved studies, or
accounts, the threat model changes. Then prioritize:

- **Input validation / schema validation** on every request (e.g. `zod`,
  `pydantic`).
- **Rate limiting and compute budgets** — expensive simulations are a DoS vector;
  cap iteration counts, time out long runs, and throttle per IP.
- **Managed authentication** (Auth0, Clerk, Supabase Auth) instead of rolling
  your own password/session handling.
- **Secrets management** — environment variables / a secrets manager, never in
  the repo. Add secret scanning (GitHub secret scanning, `gitleaks`).
- **Dependency scanning** — enable Dependabot / `npm audit` / `pip-audit`.
- **A WAF + DDoS protection** — Cloudflare in front of the origin.
- **Least-privilege CORS** — allow only your own origin(s).

### Recommended repo hygiene (do this now)

- Enable **Dependabot** and **secret scanning** on the GitHub repo.
- Enable **branch protection** on `main` (require PR review before merge).
- Keep the disclaimer visible (already in the footer): STRIDE is conceptual and
  not for safety-critical use.
