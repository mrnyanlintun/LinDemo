/* ============================================================
   Lin Project Radar — deepdive.js
   Per-project deep-dive panels for the Project Detail page,
   matching the depth of the old HUD per-module views:
     chart + "why" metric grid + reasoning bullets + RULE line.

   Every chart is an ILLUSTRATIVE view derived deterministically
   from that project's synthetic data — never live or validated
   model output. Module 05 reads decision.js output directly;
   no governance rules are duplicated here.
   ============================================================ */

(function () {
  "use strict";

  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const COLOR = {
    green: "var(--clear-green)",
    amber: "var(--radar-amber)",
    red:   "var(--alarm-red)"
  };
  const cls = (s) => String(s).toLowerCase().replace("-review", "");

  /* ---------- HUD-style building blocks ---------- */

  function verdict(label, status) {
    const c = cls(status);
    return `<span class="dd-verdict status-${c}"><i></i>${esc(label)}: ${esc(String(status).toUpperCase())}</span>`;
  }

  function metricBox(label, value, status) {
    const c = cls(status);
    return `<div class="dd-metric status-${c}"><span>${esc(label)}</span><strong>${esc(value)}</strong><em>${esc(String(status).toUpperCase())}</em></div>`;
  }

  function reasons(items, status) {
    return `<ul class="dd-reasons" style="--dd-color:${COLOR[cls(status)]}">${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
  }

  function rule(text) {
    return `<div class="dd-rule"><strong>Rule:</strong> ${esc(text)}</div>`;
  }

  function note(text) {
    return `<p class="dd-chart-note">${esc(text)}</p>`;
  }

  function panel(num, title, status, inner) {
    const c = cls(status);
    return `<section class="panel dd-panel status-${c}" aria-label="Module ${num} deep dive">
      <div class="dd-head"><b>Why Module ${num} (${esc(title)}) is ${esc(String(status).toUpperCase())}</b>${verdict(title, status)}</div>
      ${inner}
    </section>`;
  }

  /* ---------- charts (pure SVG, theme tokens, deterministic) ---------- */

  const W = 540;

  function svgo(h, label) {
    return `<svg viewBox="0 0 ${W} ${h}" class="mod-chart" role="img" aria-label="${esc(label)}">`;
  }

  /* Module 01: Monte Carlo outcome distribution with P50 / P80 markers,
     like the HUD's forecast area chart. x = EAC overrun %, deterministic
     gaussian shaped from the project's P80 figure. */
  function mcChart(p) {
    const h = 200, pad = 40, base = h - 32;
    const p80 = p.signals.mc.p80eacOverrunPct;
    const sigma = Math.max(1.6, Math.abs(p80) / 1.6);
    const p50 = p80 - 0.84 * sigma;                 // z(0.80) ≈ 0.84
    const xMin = p50 - 3 * sigma, xMax = p50 + 3.4 * sigma;
    const sx = (v) => pad + ((v - xMin) / (xMax - xMin)) * (W - pad - 18);
    const c = COLOR[p.signals.mc.status];

    let area = `M ${sx(xMin)} ${base} `;
    for (let i = 0; i <= 60; i++) {
      const v = xMin + (i / 60) * (xMax - xMin);
      const y = base - Math.exp(-((v - p50) ** 2) / (2 * sigma * sigma)) * (base - 22);
      area += `L ${sx(v).toFixed(1)} ${y.toFixed(1)} `;
    }
    area += `L ${sx(xMax)} ${base} Z`;

    const mark = (v, label, strong) =>
      `<line x1="${sx(v)}" y1="18" x2="${sx(v)}" y2="${base}" stroke="${strong ? c : "var(--ring-line)"}" stroke-width="${strong ? 1.6 : 1.2}" stroke-dasharray="${strong ? "none" : "4 3"}"></line>` +
      `<text x="${sx(v) + 4}" y="${strong ? 16 : 30}" class="mod-axis" fill="${strong ? c : "var(--muted)"}">${esc(label)}</text>`;

    return svgo(h, "Illustrative Monte Carlo EAC distribution with P50 and P80 markers") +
      `<line x1="${pad}" y1="${base}" x2="${W - 12}" y2="${base}" stroke="var(--ring-line)"></line>` +
      `<path d="${area}" fill="${c}" opacity="0.18" stroke="${c}" stroke-width="1.5"></path>` +
      mark(p50, `P50 ${p50 >= 0 ? "+" : ""}${p50.toFixed(1)}%`, false) +
      mark(p80, `P80 ${p80 >= 0 ? "+" : ""}${p80.toFixed(1)}%`, true) +
      mark(0, "baseline 0%", false) +
      `<text x="${W - 14}" y="${h - 8}" text-anchor="end" class="mod-axis">EAC overrun vs baseline (%) →</text>` +
      "</svg>";
  }

  /* Module 02: CUSUM control chart — 12 synthetic periods easing to the
     current drift, with the control threshold band, like the HUD chart. */
  function cusumChart(p) {
    const h = 190, pad = 40, base = h - 30;
    const drift = p.signals.cusum.drift, thr = p.signals.cusum.threshold;
    const yMax = Math.max(thr * 1.35, drift * 1.15);
    const sx = (i) => pad + (i / 11) * (W - pad - 20);
    const sy = (v) => base - (v / yMax) * (base - 18);
    const c = p.signals.cusum.breached ? COLOR.red : COLOR[p.signals.cusum.status];

    let pts = "";
    for (let i = 0; i < 12; i++) {
      const t = i / 11;
      const v = drift * (t * t * (3 - 2 * t)) + 0.18 * Math.sin(i * 2.1) * Math.min(1, drift);
      pts += `${sx(i).toFixed(1)},${sy(Math.max(0, v)).toFixed(1)} `;
    }

    return svgo(h, "Illustrative CUSUM drift trend against the control threshold") +
      // within-control band
      `<rect x="${pad}" y="${sy(thr)}" width="${W - pad - 20}" height="${base - sy(thr)}" fill="var(--zone-green)"></rect>` +
      `<line x1="${pad}" y1="${base}" x2="${W - 12}" y2="${base}" stroke="var(--ring-line)"></line>` +
      `<line x1="${pad}" y1="18" x2="${pad}" y2="${base}" stroke="var(--ring-line)"></line>` +
      `<line x1="${pad}" y1="${sy(thr)}" x2="${W - 20}" y2="${sy(thr)}" stroke="${COLOR.red}" stroke-width="1.4" stroke-dasharray="5 4"></line>` +
      `<text x="${W - 22}" y="${sy(thr) - 5}" text-anchor="end" class="mod-axis" fill="${COLOR.red}">control threshold ${thr.toFixed(1)}</text>` +
      `<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="2"></polyline>` +
      `<circle cx="${sx(11)}" cy="${sy(drift)}" r="4.5" fill="${c}"></circle>` +
      `<text x="${sx(11) - 6}" y="${sy(drift) - 9}" text-anchor="end" class="mod-axis" fill="${c}">drift ${drift.toFixed(1)}${p.signals.cusum.breached ? " ⚑ BREACH" : ""}</text>` +
      `<text x="${W - 14}" y="${h - 6}" text-anchor="end" class="mod-axis">reporting periods →</text>` +
      "</svg>";
  }

  /* Module 03: document-risk score gauge with amber/red thresholds. */
  function docChart(p) {
    const h = 96, pad = 40, barY = 34, barH = 18;
    const span = W - pad - 24;
    const score = p.signals.doc.score;
    const sx = (v) => pad + v * span;
    const c = COLOR[p.signals.doc.status];
    return svgo(h, "Illustrative document-risk score gauge") +
      `<rect x="${pad}" y="${barY}" width="${span}" height="${barH}" rx="4" fill="var(--surface-soft)" stroke="var(--ring-line)"></rect>` +
      `<rect x="${pad}" y="${barY}" width="${(sx(score) - pad).toFixed(1)}" height="${barH}" rx="4" fill="${c}" opacity="0.55"></rect>` +
      [[0.30, "amber ≥ 0.30", COLOR.amber], [0.70, "red ≥ 0.70", COLOR.red]].map(([v, lab, col]) =>
        `<line x1="${sx(v)}" y1="${barY - 8}" x2="${sx(v)}" y2="${barY + barH + 8}" stroke="${col}" stroke-width="1.3" stroke-dasharray="4 3"></line>` +
        `<text x="${sx(v) + 3}" y="${barY - 12}" class="mod-axis" fill="${col}">${lab}</text>`).join("") +
      `<circle cx="${sx(score)}" cy="${barY + barH / 2}" r="6" fill="${c}" stroke="var(--text)" stroke-width="1"></circle>` +
      `<text x="${sx(score)}" y="${barY + barH + 22}" text-anchor="middle" class="mod-axis" fill="${c}">score ${score.toFixed(2)}</text>` +
      "</svg>";
  }

  /* Module 04: signal agreement map — four signal nodes colored by status,
     like the HUD's conflict lens. */
  function synthChart(p) {
    const h = 150;
    const s = p.signals;
    const nodes = [
      ["EVM", s.evm.status], ["FORECAST", s.mc.status],
      ["CUSUM", s.cusum.status], ["DOC", s.doc.status]
    ];
    const cxs = [90, 215, 340, 465];
    return svgo(h, "Illustrative signal agreement map across the four signal classes") +
      nodes.map(([lab, st], i) =>
        (i < 3 ? `<line x1="${cxs[i] + 38}" y1="72" x2="${cxs[i + 1] - 38}" y2="72" stroke="var(--phosphor)" stroke-width="1.5" stroke-dasharray="6 5"></line>` : "") +
        `<circle cx="${cxs[i]}" cy="72" r="36" fill="none" stroke="${COLOR[st]}" stroke-width="2.5"></circle>` +
        `<text x="${cxs[i]}" y="69" text-anchor="middle" class="mod-axis" fill="var(--text)">${lab}</text>` +
        `<text x="${cxs[i]}" y="84" text-anchor="middle" class="mod-axis" fill="${COLOR[st]}">${st.toUpperCase()}</text>`
      ).join("") +
      "</svg>";
  }

  /* Module 05: governance decision path driven by decision.js output. */
  function abmChart(p, d) {
    const h = 132;
    const c = COLOR[cls(d.healthState)];
    const box = (x, w, l1, l2, col) =>
      `<rect x="${x}" y="34" width="${w}" height="58" rx="8" fill="none" stroke="${col}" stroke-width="2"></rect>` +
      `<text x="${x + w / 2}" y="58" text-anchor="middle" class="mod-axis" fill="var(--text)">${esc(l1)}</text>` +
      `<text x="${x + w / 2}" y="74" text-anchor="middle" class="mod-axis" fill="${col}">${esc(l2)}</text>`;
    const arrow = (x) => `<text x="${x}" y="68" text-anchor="middle" class="mod-axis" fill="var(--phosphor)">→</text>`;
    return svgo(h, "Illustrative governance decision path from decision.js output") +
      box(14, 130, "SIGNAL PACKAGE", "4 signal classes", "var(--phosphor)") + arrow(157) +
      box(172, 150, "CONFLICT", d.conflictType.length > 18 ? d.conflictType.slice(0, 17) + "…" : d.conflictType, c) + arrow(335) +
      box(350, 176, d.fairnessGateRequired ? "FAIRNESS GATE ⚑" : "RECOMMENDATION", d.healthState.toUpperCase(), c) +
      `<text x="${W / 2}" y="${h - 10}" text-anchor="middle" class="mod-axis">authority: ${esc(d.authority)}</text>` +
      "</svg>";
  }

  /* ---------- per-module status + reasoning ---------- */

  const ILLUS = "Illustrative view — derived from this project's synthetic data";

  function m01(p) {
    const e = p.signals.evm, m = p.signals.mc;
    const st = (e.status === "red" || m.status === "red") ? "red"
      : (e.status === "amber" || m.status === "amber") ? "amber" : "green";
    const cpiS = e.cpi < 0.90 ? "red" : e.cpi < 0.95 ? "amber" : "green";
    const spiS = e.spi < 0.85 ? "red" : e.spi < 0.95 ? "amber" : "green";
    const p80S = m.p80eacOverrunPct >= 10 ? "red" : m.p80eacOverrunPct >= 5 ? "amber" : "green";
    const pdS  = m.pMilestoneDelay >= 0.60 ? "red" : m.pMilestoneDelay >= 0.30 ? "amber" : "green";
    const why = st === "red" ? [
      `CPI ${e.cpi.toFixed(2)} and SPI ${e.spi.toFixed(2)} are below control tolerance, so the earned-value trend is not only a forecast issue.`,
      `The P80 EAC sits ${m.p80eacOverrunPct >= 0 ? "+" : ""}${m.p80eacOverrunPct.toFixed(1)}% over baseline with a ${(m.pMilestoneDelay * 100).toFixed(0)}% probability of milestone delay — the conservative forecast is in recovery-review territory.`,
      `The distribution above shows the P50→P80 spread; the tail beyond P80 is the residual 20% risk the governance layer must own.`
    ] : st === "amber" ? [
      `At least one cost or schedule indicator is in the watch band: CPI ${e.cpi.toFixed(2)}, SPI ${e.spi.toFixed(2)}, P80 ${m.p80eacOverrunPct >= 0 ? "+" : ""}${m.p80eacOverrunPct.toFixed(1)}%.`,
      `The forecast remains manageable, but P(milestone delay) is ${(m.pMilestoneDelay * 100).toFixed(0)}%, which requires review before the next reporting cycle closes.`,
      `Amber means attention required — not immediate executive recovery action.`
    ] : [
      `CPI ${e.cpi.toFixed(2)} and SPI ${e.spi.toFixed(2)} remain inside normal monitoring tolerance for the current reporting cycle.`,
      `P80 EAC exposure is ${m.p80eacOverrunPct >= 0 ? "+" : ""}${m.p80eacOverrunPct.toFixed(1)}% with only a ${(m.pMilestoneDelay * 100).toFixed(0)}% delay probability, so the conservative outcome does not trigger recovery review.`,
      `Forecast and reported status agree — the distribution sits over the baseline.`
    ];
    return panel("01", "Hybrid Dynamic Simulation", st,
      note(`${ILLUS} — Monte Carlo EAC distribution, ${m.iterations.toLocaleString()} iterations`) +
      mcChart(p) +
      `<div class="dd-grid">${
        metricBox("CPI", e.cpi.toFixed(2), cpiS) +
        metricBox("SPI", e.spi.toFixed(2), spiS) +
        metricBox("P80 EAC Δ", `${m.p80eacOverrunPct >= 0 ? "+" : ""}${m.p80eacOverrunPct.toFixed(1)}%`, p80S) +
        metricBox("P(delay)", m.pMilestoneDelay.toFixed(2), pdS) +
        metricBox("Data date", e.dataDate, "green") +
        metricBox("Iterations", m.iterations.toLocaleString(), "green")
      }</div>` +
      reasons(why, st) +
      rule("GREEN if CPI/SPI ≥ 0.95 and P80 EAC within +5%; AMBER if one forecast indicator enters the watch range (CPI/SPI < 0.95, P80 +5–10%, P(delay) ≥ 0.30); RED if CPI/SPI < 0.90, P80 ≥ +10%, or P(delay) ≥ 0.60."));
  }

  function m02(p) {
    const cu = p.signals.cusum;
    const st = cu.breached ? "red" : cu.status;
    const why = cu.breached ? [
      `CUSUM drift ${cu.drift.toFixed(1)} exceeds the control threshold ${cu.threshold.toFixed(1)}, so the pattern is cumulative — not a one-period fluctuation.`,
      `The chart shows sustained accumulation across reporting periods rather than noise around the baseline.`,
      `A breach hands the question to the governance layer; the monitor itself never acts.`
    ] : st === "amber" ? [
      `CUSUM drift ${cu.drift.toFixed(1)} is inside the watch band — weakening, but the ${cu.threshold.toFixed(1)} threshold is not broken.`,
      `Amber prevents the team from waiting until the next full EVM variance becomes visible.`
    ] : [
      `CUSUM drift ${cu.drift.toFixed(1)} on ${cu.metric} stays well below the ${cu.threshold.toFixed(1)} control threshold.`,
      `No control-limit breach is present in the trend; the anomaly monitor agrees with routine reporting cadence.`
    ];
    return panel("02", "SPC / CUSUM Anomaly Monitor", st,
      note(`${ILLUS} — cumulative ${cu.metric} drift vs control threshold`) +
      cusumChart(p) +
      `<div class="dd-grid">${
        metricBox("CUSUM drift", cu.drift.toFixed(1), st) +
        metricBox("Threshold", cu.threshold.toFixed(1), "green") +
        metricBox("Breached", cu.breached ? "YES" : "NO", cu.breached ? "red" : "green") +
        metricBox("Monitored", cu.metric, "green")
      }</div>` +
      reasons(why, st) +
      rule("GREEN if cumulative drift is below watch level; AMBER if drift approaches the control limit; RED if CUSUM breaches the threshold (≥ 5.0)."));
  }

  function m03(p) {
    const d = p.signals.doc;
    const st = d.status;
    const why = st === "red" ? [
      `Document risk score ${d.score.toFixed(2)} is at or above the 0.70 red threshold — the text evidence itself can justify escalation before the next cost report reflects it.`,
      `Source: ${d.source}. The extracted language points to cost/schedule/scope impact rather than routine correspondence.`,
      `Evidence excerpt: “${d.excerpt}”`
    ] : st === "amber" ? [
      `Document risk score ${d.score.toFixed(2)} sits in the 0.30–0.70 watch band; impact language is reviewable rather than conclusive.`,
      `Source: ${d.source}.`,
      `Evidence excerpt: “${d.excerpt}”`
    ] : [
      `Document risk score ${d.score.toFixed(2)} is below the 0.30 watch threshold — records are routine for this reporting cycle.`,
      `The document trail supports the quantitative forecast rather than contradicting it.`
    ];
    return panel("03", "Document-Risk Extraction", st,
      note(`${ILLUS} — keyword/rule risk score against thresholds`) +
      docChart(p) +
      `<div class="dd-grid">${
        metricBox("Risk score", d.score.toFixed(2), st) +
        metricBox("Status", st.toUpperCase(), st) +
        metricBox("Source", d.source.length > 22 ? d.source.slice(0, 21) + "…" : d.source, "green")
      }</div>` +
      reasons(why, st) +
      rule("GREEN if score < 0.30 (routine language); AMBER if 0.30–0.70 (possible cost/schedule/scope impact); RED if ≥ 0.70 (high-impact language converging across records)."));
  }

  function m04(p) {
    const conflict = classifyConflict(p);
    const s = p.signals;
    const statuses = [s.evm.status, s.mc.status, s.cusum.status, s.doc.status];
    const redN = statuses.filter((x) => x === "red").length;
    const ambN = statuses.filter((x) => x === "amber").length;
    const st = redN >= 2 ? "red" : (redN || ambN) ? "amber" : "green";
    const why = conflict === "Agreement — low risk" ? [
      `All four signal classes are green and aligned — there is no disagreement to surface.`,
      `Agreement is itself recorded: the decision card still logs the evidence package for auditability.`
    ] : [
      `Conflict type “${conflict}”: ${redN} red and ${ambN} amber signal class(es) against ${4 - redN - ambN} green.`,
      `PCEIF surfaces this disagreement instead of averaging it away — the gap between signal classes is the finding.`,
      `The classification feeds Module 05, which maps it to an action and an authority.`
    ];
    return panel("04", "Signal Synthesis", st,
      note(`${ILLUS} — agreement map across the four signal classes`) +
      synthChart(p) +
      `<div class="dd-grid">${
        metricBox("Conflict", conflict.length > 20 ? conflict.slice(0, 19) + "…" : conflict, st) +
        metricBox("Red signals", String(redN), redN ? "red" : "green") +
        metricBox("Amber signals", String(ambN), ambN ? "amber" : "green") +
        metricBox("Aligned", redN + ambN === 0 ? "YES" : "NO", redN + ambN === 0 ? "green" : "amber")
      }</div>` +
      reasons(why, st) +
      rule("Precedence: multi-signal red-review ▸ anomaly without narrative ▸ forecast ahead of status ▸ leading document risk ▸ agreement ▸ mixed early warning (classifyConflict in decision.js)."));
  }

  function m05(p) {
    // All values below come straight from decision.js — no duplicated rules.
    const d = deriveDecision(p);
    const st = cls(d.healthState);
    const why = [
      `decision.js derives state “${d.healthState}” with conflict “${d.conflictType}” for this project.`,
      `Recommended action: ${d.action}`,
      `Authority entitled to act: ${d.authority}. Documentation required: ${d.documentation}`,
      d.fairnessGateRequired
        ? "Fairness gate REQUIRED: contractor response opportunity must be acknowledged before any formal action — recording is blocked until then."
        : "No fairness gate is required for this state/sensitivity combination."
    ];
    return panel("05", "ABM Governance Layer", st,
      note(`${ILLUS} — decision path computed live by decision.js`) +
      abmChart(p, d) +
      `<div class="dd-grid">${
        metricBox("Derived state", d.healthState, st) +
        metricBox("Fairness gate", d.fairnessGateRequired ? "REQUIRED" : "Not required", d.fairnessGateRequired ? "red" : "green") +
        metricBox("Conflict", d.conflictType.length > 20 ? d.conflictType.slice(0, 19) + "…" : d.conflictType, st) +
        metricBox("Sector", p.sector === "combined" ? "Hybrid" : p.sector, "green")
      }</div>` +
      reasons(why, st) +
      rule("GREEN → routine monitoring (PM/Controls); AMBER → early-warning review (PM + Controls lead); RED-REVIEW when ≥2 red signals or CUSUM breach + red forecast (Program director/PMO); fairness-sensitive red-reviews additionally require the contractor fairness gate (deriveDecision in decision.js)."));
  }

  /* ---------- entry point ---------- */

  function render(project, root) {
    if (!root) return;
    root.innerHTML =
      `<p class="mod-banner">All charts below are <strong>illustrative views derived from this project's synthetic data</strong> — they are not live or validated model output.</p>` +
      m01(project) + m02(project) + m03(project) + m04(project) + m05(project);
  }

  window.LinDeepDive = { render };
})();
