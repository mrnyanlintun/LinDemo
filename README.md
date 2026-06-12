# Lin Project Radar

A static, single-purpose demonstration website for **PCEIF** — the Public Capital
EVM Intelligence Framework — developed as part of a Doctor of Engineering praxis
(The George Washington University, Engineering Management).

## What it demonstrates

How a project's multi-model signals become a **governed management decision**:

| Signal | Method |
|---|---|
| EVM | Earned Value Management (CPI / SPI vs. baseline) |
| Monte Carlo | P80 EAC overrun and milestone-delay probability (5,000 iterations) |
| CUSUM / SPC | Cumulative-sum drift detection against a control threshold |
| Document risk | RFI / submittal evidence scoring with source excerpts |

The radar scope encodes the portfolio: **distance from center = drift from
baseline**, **angle = delivery sector** (Design / Construction / Combined).
Selecting a blip loads the signal ledger and the PCEIF decision card, which
derives a recommended action, the responsible authority, and the required
documentation from explicit, readable rules in
[`assets/js/decision.js`](assets/js/decision.js).

When a red-review implicates delivery responsibility, a **contractor fairness
gate** appears as a mandatory workflow step: the reviewer must acknowledge that
a contractor response opportunity will be provided before any formal action.
Recorded decisions (with reviewer rationale and ISO timestamp) can be exported
as audit JSON.

## Academic boundary

- **All data is synthetic.** No real project, agency, employer, contractor, or
  vendor is represented. Project codes follow the `SYN-*` convention.
- **No predictive-accuracy validation has been performed.** The decision rules
  are illustrative of the framework's structure, not validated thresholds.
- **Human approval is required for every action.** The system recommends and
  records; it does not decide.
- This is **not a production system**.

## Architecture

Pure static HTML/CSS/JS. No build step, no backend, no LLM calls, no analytics,
no external JS dependencies. The only external resource is Google Fonts.

```
index.html
assets/css/radar.css      — aviation-console theme
assets/js/data.js         — synthetic project roster
assets/js/decision.js     — PCEIF decision rules (pure functions, no DOM)
assets/js/app.js          — radar rendering, interactions, audit export
```

## Run locally

Open `index.html` directly in a browser (`file://` works) or serve the folder:

```
python -m http.server 8000
```

## Deploy to GitHub Pages

1. Push this repository to GitHub.
2. Settings → Pages → Source: *Deploy from a branch* → select the branch and `/ (root)`.
3. All asset paths are relative, so the site works from a project subpath
   (e.g. `https://<user>.github.io/<repo>/`) without configuration.
