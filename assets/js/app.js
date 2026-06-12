/* ============================================================
   Lin Project Radar — app.js
   Radar rendering, theme switching, signal ledger,
   PCEIF decision card, audit export.
   Depends on (load order): data.js, decision.js, app.js
   ============================================================ */

(function () {
  "use strict";

  const SECTORS = {
    design:       { label: "DESIGN",       start: -90,  end: -18 },
    construction: { label: "CONSTRUCTION", start: -18,  end: 54  },
    combined:     { label: "COMBINED",     start: 54,   end: 126 }
  };

  const STATUS_COLOR = {
    green: "var(--clear-green)",
    amber: "var(--radar-amber)",
    red:   "var(--alarm-red)"
  };

  const SVG_NS = "http://www.w3.org/2000/svg";
  const CENTER = 200;          // viewBox is 400x400
  const R_MIN = 0.08 * 180;    // inner radius (health 100)
  const R_MAX = 0.92 * 180;    // outer radius (health 0)

  let selectedId = null;
  const decisionLog = [];

  /* ---------- small helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, attrs = {}) => {
    const node = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  };
  const reduceMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Stable angle within a sector from a hashed id (no per-render jitter)
  function hashAngle(project) {
    const sec = SECTORS[project.sector];
    let h = 0;
    for (let i = 0; i < project.id.length; i++) h = (h * 31 + project.id.charCodeAt(i)) >>> 0;
    const span = sec.end - sec.start;
    const frac = (h % 1000) / 1000;
    // keep blips off the exact sector boundaries
    return sec.start + span * (0.14 + 0.72 * frac);
  }

  function healthToRadius(health) {
    const clamped = Math.max(0, Math.min(100, health));
    return R_MIN + (R_MAX - R_MIN) * (1 - clamped / 100);
  }

  function polar(angleDeg, radius) {
    const a = (angleDeg * Math.PI) / 180;
    return { x: CENTER + radius * Math.cos(a), y: CENTER + radius * Math.sin(a) };
  }

  /* ---------- radar scope ---------- */
  function buildRadar() {
    const svg = $("#radar-svg");
    svg.innerHTML = "";

    // zone bands: green / amber / red-review / critical rim
    const bands = [
      { r: 0.30 * 180, fill: "var(--zone-green)" },
      { r: 0.55 * 180, fill: "var(--zone-amber)" },
      { r: 0.80 * 180, fill: "var(--zone-red)" },
      { r: 0.92 * 180, fill: "var(--zone-crit)" }
    ];
    // draw from outer to inner so inner sits on top
    for (let i = bands.length - 1; i >= 0; i--) {
      svg.appendChild(el("circle", {
        cx: CENTER, cy: CENTER, r: bands[i].r, fill: bands[i].fill,
        stroke: "var(--ring-line)", "stroke-width": "1"
      }));
    }
    // ring ticks
    [0.30, 0.55, 0.80].forEach((f) => {
      svg.appendChild(el("circle", {
        cx: CENTER, cy: CENTER, r: f * 180, fill: "none",
        stroke: "var(--ring-line)", "stroke-width": "1", "stroke-dasharray": "2 5"
      }));
    });

    // sector dividers + labels
    Object.values(SECTORS).forEach((sec) => {
      [sec.start, sec.end].forEach((ang) => {
        const p = polar(ang, R_MAX);
        svg.appendChild(el("line", {
          x1: CENTER, y1: CENTER, x2: p.x, y2: p.y,
          stroke: "var(--ring-line)", "stroke-width": "1"
        }));
      });
      const mid = (sec.start + sec.end) / 2;
      const lp = polar(mid, R_MAX + 14);
      const t = el("text", {
        x: lp.x, y: lp.y, "text-anchor": "middle", "dominant-baseline": "middle",
        class: "sector-label"
      });
      t.textContent = sec.label;
      svg.appendChild(t);
    });

    // sweep wedge
    if (!reduceMotion()) {
      const sweep = el("g", { class: "sweep" });
      const tip = polar(0, R_MAX);
      sweep.appendChild(el("path", {
        d: `M ${CENTER} ${CENTER} L ${tip.x} ${tip.y} A ${R_MAX} ${R_MAX} 0 0 1 ${polar(20, R_MAX).x} ${polar(20, R_MAX).y} Z`,
        fill: "var(--sweep-fill)"
      }));
      svg.appendChild(sweep);
    }

    // blips
    LIN_PROJECTS.forEach((p) => {
      const ang = hashAngle(p);
      const r = healthToRadius(p.health);
      const pos = polar(ang, r);
      const g = el("g", {
        class: "blip",
        tabindex: "0",
        role: "button",
        "aria-label": `${p.id} ${p.name}, health ${p.health}, status ${deriveHealthState(p)}`,
        "data-id": p.id
      });

      const status = deriveHealthState(p).toLowerCase().replace("-review", "");
      const color =
        status === "green" ? STATUS_COLOR.green :
        status === "amber" ? STATUS_COLOR.amber : STATUS_COLOR.red;

      const ring = el("circle", {
        cx: pos.x, cy: pos.y, r: 11, fill: "none",
        stroke: "var(--phosphor)", "stroke-width": "2",
        class: "blip-ring", opacity: "0"
      });
      const dot = el("circle", {
        cx: pos.x, cy: pos.y, r: 6, fill: color, class: "blip-dot"
      });
      const label = el("text", {
        x: pos.x + 13, y: pos.y + 4, class: "blip-label"
      });
      label.textContent = p.id;

      g.appendChild(ring);
      g.appendChild(dot);
      g.appendChild(label);

      const choose = () => selectProject(p.id);
      g.addEventListener("click", choose);
      g.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(); }
      });

      svg.appendChild(g);
    });

    highlightBlip();
  }

  function highlightBlip() {
    document.querySelectorAll(".blip").forEach((b) => {
      const on = b.getAttribute("data-id") === selectedId;
      b.classList.toggle("selected", on);
      const ring = b.querySelector(".blip-ring");
      if (ring) ring.setAttribute("opacity", on ? "1" : "0");
    });
  }

  /* ---------- accessible fallback list ---------- */
  function buildFallbackList() {
    const ul = $("#project-list");
    ul.innerHTML = "";
    LIN_PROJECTS.forEach((p) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.className = "list-item";
      btn.setAttribute("data-id", p.id);
      const state = deriveHealthState(p);
      btn.innerHTML =
        `<span class="li-code">${p.id}</span>` +
        `<span class="li-name">${p.name}</span>` +
        `<span class="li-state state-${state.toLowerCase().replace("-review","")}">${state}</span>`;
      btn.addEventListener("click", () => selectProject(p.id));
      li.appendChild(btn);
      ul.appendChild(li);
    });
  }

  function highlightListItem() {
    document.querySelectorAll(".list-item").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-id") === selectedId);
    });
  }

  /* ---------- signal ledger ---------- */
  function statusPill(status) {
    const map = { green: "Green", amber: "Amber", red: "Red" };
    return `<span class="pill pill-${status}">${map[status] || status}</span>`;
  }

  function renderLedger(p) {
    const s = p.signals;
    const conflict = classifyConflict(p);

    const rows = [
      {
        name: "EVM cost / schedule", method: "Earned Value Management",
        status: s.evm.status,
        metric: `CPI ${s.evm.cpi.toFixed(2)} · SPI ${s.evm.spi.toFixed(2)}`,
        detail: `Data date ${s.evm.dataDate}`
      },
      {
        name: "Probabilistic forecast", method: `Monte Carlo · ${s.mc.iterations.toLocaleString()} iter`,
        status: s.mc.status,
        metric: `P80 EAC +${s.mc.p80eacOverrunPct.toFixed(1)}% · P(delay) ${s.mc.pMilestoneDelay.toFixed(2)}`,
        detail: "Percentile exposure on cost and milestone finish"
      },
      {
        name: "Anomaly / trend", method: "SPC / CUSUM",
        status: s.cusum.status,
        metric: `${s.cusum.metric} drift ${s.cusum.drift.toFixed(1)} / ${s.cusum.threshold.toFixed(1)}`,
        detail: s.cusum.breached ? "Threshold breached" : "Within control limits"
      },
      {
        name: "Document risk", method: "Keyword / rule extraction",
        status: s.doc.status,
        metric: `Risk score ${s.doc.score.toFixed(2)}`,
        detail: `<span class="src">${s.doc.source}</span><span class="excerpt">“${s.doc.excerpt}”</span>`
      }
    ];

    const conflictClass =
      conflict === "Agreement — low risk" ? "conflict-calm" : "conflict-alert";

    $("#ledger").innerHTML =
      `<div class="ledger-head">
         <div>
           <p class="eyebrow">Signal ledger</p>
           <h2>${p.id}</h2>
           <p class="ledger-sub">${p.name}</p>
         </div>
       </div>
       <div class="conflict-banner ${conflictClass}">
         <span class="conflict-label">Signal conflict</span>
         <span class="conflict-value">${conflict}</span>
       </div>
       <div class="signal-rows">` +
      rows.map((r) => `
        <div class="signal-row">
          <div class="sig-top">
            <span class="sig-name">${r.name}</span>
            ${statusPill(r.status)}
          </div>
          <div class="sig-metric">${r.metric}</div>
          <div class="sig-meta"><span class="sig-method">${r.method}</span></div>
          <div class="sig-detail">${r.detail}</div>
        </div>`).join("") +
      `</div>`;
  }

  /* ---------- decision card ---------- */
  function renderDecisionCard(p) {
    const d = deriveDecision(p);
    const stateClass = d.healthState.toLowerCase().replace("-review", "");

    const fairnessBlock = d.fairnessGateRequired
      ? `<label class="fairness-gate">
           <input type="checkbox" id="fairness-check" />
           <span>Contractor response opportunity will be provided before any formal action.
           Required before this decision can be recorded.</span>
         </label>`
      : "";

    $("#decision-card").innerHTML =
      `<div class="dc-head">
         <div>
           <p class="eyebrow">PCEIF governance decision</p>
           <h2>Recommended action</h2>
         </div>
         <span class="state-badge state-${stateClass}">${d.healthState}</span>
       </div>
       <div class="dc-grid">
         <div class="dc-field"><span class="dc-label">Conflict</span><span class="dc-value">${d.conflictType}</span></div>
         <div class="dc-field"><span class="dc-label">Authority</span><span class="dc-value">${d.authority}</span></div>
         <div class="dc-field dc-wide"><span class="dc-label">Recommended action</span><span class="dc-value">${d.action}</span></div>
         <div class="dc-field dc-wide"><span class="dc-label">Documentation required</span><span class="dc-value">${d.documentation}</span></div>
       </div>
       ${fairnessBlock}
       <label class="rationale-label" for="rationale">Reviewer rationale <span class="req">(required, min 20 characters)</span></label>
       <textarea id="rationale" placeholder="State why this action is taken, deferred, or overridden. Recorded to the audit log."></textarea>
       <div class="dc-actions">
         <button id="record-btn" class="btn primary" disabled>Record decision</button>
         <button id="export-btn" class="btn">Export audit JSON</button>
       </div>
       <p class="dc-note">Recommendation only — a named human reviewer records the decision. The recommendation does not trigger any action on its own.</p>`;

    wireDecisionControls(p, d);
  }

  function wireDecisionControls(p, d) {
    const rationale = $("#rationale");
    const recordBtn = $("#record-btn");
    const fairnessCheck = $("#fairness-check"); // may be null

    const evaluate = () => {
      const longEnough = rationale.value.trim().length >= 20;
      const fairnessOk = !d.fairnessGateRequired || (fairnessCheck && fairnessCheck.checked);
      recordBtn.disabled = !(longEnough && fairnessOk);
    };

    rationale.addEventListener("input", evaluate);
    if (fairnessCheck) fairnessCheck.addEventListener("change", evaluate);

    recordBtn.addEventListener("click", () => {
      const entry = {
        project: p.id,
        state: d.healthState,
        action: d.action,
        rationale: rationale.value.trim(),
        fairnessAcknowledged: d.fairnessGateRequired ? fairnessCheck.checked : null,
        recordedAt: new Date().toISOString()
      };
      decisionLog.unshift(entry);
      renderDecisionLog();
      rationale.value = "";
      if (fairnessCheck) fairnessCheck.checked = false;
      evaluate();
    });

    $("#export-btn").addEventListener("click", () => {
      const reviewerInput = {
        rationale: rationale.value.trim() || "(not recorded at export time)",
        fairnessAcknowledged: fairnessCheck ? fairnessCheck.checked : null,
        recordedAt: new Date().toISOString()
      };
      const record = buildAuditRecord(p, d, reviewerInput);
      const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit_${p.id}_${p.reportingPeriod}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }

  function renderDecisionLog() {
    const wrap = $("#decision-log");
    if (!decisionLog.length) {
      wrap.innerHTML = `<p class="log-empty">No decisions recorded this session.</p>`;
      return;
    }
    wrap.innerHTML =
      `<p class="eyebrow">Decision log (this session)</p>` +
      decisionLog.map((e) => `
        <div class="log-entry">
          <div class="log-top"><span class="log-proj">${e.project}</span><span class="log-state state-${e.state.toLowerCase().replace("-review","")}">${e.state}</span></div>
          <div class="log-action">${e.action}</div>
          <div class="log-rationale">“${e.rationale}”</div>
          <div class="log-time">${new Date(e.recordedAt).toLocaleString()}${e.fairnessAcknowledged ? " · fairness gate acknowledged" : ""}</div>
        </div>`).join("");
  }

  /* ---------- selection orchestration ---------- */
  function selectProject(id) {
    selectedId = id;
    const p = LIN_PROJECTS.find((x) => x.id === id);
    if (!p) return;
    highlightBlip();
    highlightListItem();
    renderLedger(p);
    renderDecisionCard(p);
  }

  /* ---------- theme switch ---------- */
  function applyTheme(theme) {
    document.body.dataset.theme = theme;
    document.querySelectorAll("[data-set-theme]").forEach((b) =>
      b.classList.toggle("active", b.dataset.setTheme === theme)
    );
    try { localStorage.setItem("lin-radar-theme", theme); } catch (e) {}
  }

  /* ---------- clock ---------- */
  function startClock() {
    const node = $("#utc-clock");
    const tick = () => {
      const d = new Date();
      node.textContent = d.toISOString().slice(11, 19) + " UTC";
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- init ---------- */
  function init() {
    document.querySelectorAll("[data-set-theme]").forEach((b) =>
      b.addEventListener("click", () => applyTheme(b.dataset.setTheme))
    );
    let saved = "clean";
    try { saved = localStorage.getItem("lin-radar-theme") || "clean"; } catch (e) {}
    applyTheme(saved);

    buildRadar();
    buildFallbackList();
    renderDecisionLog();
    startClock();

    // default selection: the flagship red-review fairness case
    selectProject("SYN-CON-005");

    // rebuild radar geometry on resize-driven motion-pref changes
    window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener?.("change", buildRadar);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
