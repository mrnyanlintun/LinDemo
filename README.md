# Lin Project Radar

A static, single-purpose demonstration website for **PCEIF** — the Public Capital
EVM Intelligence Framework — developed as part of a Doctor of Engineering praxis
(The George Washington University, Engineering Management).

## What it demonstrates

PCEIF is a signal-to-action governance framework for public AEC capital programs.
This site shows the workflow it governs: how a synthetic project's multi-model
signals become a **governed management decision** with explicit authority,
documentation, and a contractor fairness gate.

The **radar scope is the interface**, not decoration:

- **Distance from center** = drift from baseline (healthy projects sit near
  center; deteriorating ones drift toward the red rim).
- **Angle** = delivery sector (Design / Construction / Combined).
- **Blip color** = derived health state (Green / Amber / Red-review).

Select any project (on the scope or in the equivalent list) to see:

1. **Signal ledger** — EVM, Monte Carlo forecast, SPC/CUSUM anomaly, and
   document-risk signals, each with status, key metric, method, and evidence.
2. **Signal-conflict classification** — disagreement between signal classes is
   surfaced, not averaged away.
3. **PCEIF governance decision card** — derived health state, recommended action,
   authority role, documentation required, and (where applicable) a contractor
   fairness gate that **blocks recording** until contractor response opportunity
   is acknowledged. A named reviewer must enter a rationale before any decision
   is recorded.
4. **Audit export** — downloads a JSON record of the signal package, derived
   decision, reviewer rationale, fairness acknowledgement, and timestamp.

## The decision logic is the point

`assets/js/decision.js` contains the PCEIF Layer-2 rules as pure, commented
functions with no DOM dependencies. This is deliberate: the governance logic is
explicit, readable rules — not model output and not informal judgment.

## Themes

Three visual systems over the same structure, switchable in the top bar:
**Clean** (audit matrix, default), **Aviation** (blueprint), **Digital Twin**
(industrial). Theme preference persists in `localStorage`.

## Boundaries

- **Synthetic demonstration data only.** No real project, agency, employer,
  contractor, or vendor is referenced.
- **No backend, no LLM calls, no analytics, no tracking.** Pure static
  HTML/CSS/JS. The only external resource is Google Fonts.
- Not a validated production system: it does not validate predictive accuracy,
  diagnose live projects, or issue contractual direction. Every recommended
  action requires named human approval before it is recorded.

## Structure

```
index.html
assets/css/radar.css      visual system + three themes
assets/js/data.js         synthetic project portfolio
assets/js/decision.js     PCEIF governance rules (pure functions)
assets/js/app.js          radar rendering, ledger, decision card, audit export
```

## Run / deploy

Open `index.html` directly (works from `file://`), or serve the folder. For
GitHub Pages, push to the configured branch with a `.nojekyll` file present;
all paths are relative so it works under a project subpath.

---

PCEIF L2-v0.5-demo
