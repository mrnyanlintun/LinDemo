/* app.js — Lin Project Radar: radar rendering, interactions, audit export
 * PCEIF L2-v0.5-demo — Synthetic demonstration data only
 */

// ── Constants ────────────────────────────────────────────────────────────────

const SECTOR_BOUNDS = {
  design:       { start: -90, end: 30 },   // top-left arc
  construction: { start: 30,  end: 150 },  // right arc
  combined:     { start: 150, end: 270 }   // bottom-left arc (=–90)
};

// Radius mapping: health 100 → 8%, health 0 → 92% of radar radius
function healthToRadius(health, radarR) {
  const pct = 0.08 + (1 - health / 100) * 0.84;
  return radarR * pct;
}

// Stable per-project angle within its sector (hash on id, no randomness)
function projectAngle(project) {
  const { start, end } = SECTOR_BOUNDS[project.sector];
  let hash = 0;
  for (let i = 0; i < project.id.length; i++) hash = (hash * 31 + project.id.charCodeAt(i)) & 0xffffff;
  const frac = (hash % 1000) / 1000;
  // Keep 15% padding from sector edges so blips don't overlap dividers
  const inner = start + (end - start) * 0.15;
  const outer = end - (end - start) * 0.15;
  return inner + frac * (outer - inner);
}

// Polar → Cartesian (angle in degrees, 0° = right, CCW positive)
function polar(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

const STATUS_COLOR = { green: "#3fd68f", amber: "#ffaa3d", red: "#ff5d52" };

// ── State ────────────────────────────────────────────────────────────────────

let selectedProject = null;
let decisionLog = [];

// ── UTC Clock ────────────────────────────────────────────────────────────────

function startClock() {
  const el = document.getElementById("utc-clock");
  function tick() {
    const now = new Date();
    el.textContent = now.toUTCString().replace("GMT", "UTC").slice(5, 25);
  }
  tick();
  setInterval(tick, 1000);
}

// ── Radar SVG ────────────────────────────────────────────────────────────────

function buildRadar() {
  const svg = document.getElementById("radar-svg");
  const W = svg.viewBox.baseVal.width;
  const H = svg.viewBox.baseVal.height;
  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) * 0.44;

  // Zone fills (green / amber / red / critical)
  const zones = [
    { r: R,       color: "rgba(255,93,82,0.08)"  },  // critical rim
    { r: R * 0.72, color: "rgba(255,170,61,0.07)" }, // red-review
    { r: R * 0.48, color: "rgba(255,170,61,0.05)" }, // amber
    { r: R * 0.28, color: "rgba(63,214,143,0.06)" }  // green
  ];
  zones.forEach(z => {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", cx); c.setAttribute("cy", cy); c.setAttribute("r", z.r);
    c.setAttribute("fill", z.color); c.setAttribute("stroke", "none");
    svg.appendChild(c);
  });

  // Ring lines
  [0.28, 0.48, 0.72, 1.0].forEach(f => {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", cx); c.setAttribute("cy", cy); c.setAttribute("r", R * f);
    c.setAttribute("fill", "none");
    c.setAttribute("stroke", f === 1.0 ? "rgba(53,214,232,0.3)" : "rgba(53,214,232,0.12)");
    c.setAttribute("stroke-width", "1");
    svg.appendChild(c);
  });

  // Zone labels
  const zoneLabels = [
    { r: R * 0.14, label: "GREEN", color: "#3fd68f" },
    { r: R * 0.38, label: "AMBER", color: "#ffaa3d" },
    { r: R * 0.60, label: "RED-REVIEW", color: "#ff5d52" },
    { r: R * 0.86, label: "CRITICAL", color: "#ff5d52" }
  ];
  zoneLabels.forEach(({ r, label, color }) => {
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", cx); t.setAttribute("y", cy - r + 4);
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("fill", color); t.setAttribute("opacity", "0.45");
    t.setAttribute("font-size", "8"); t.setAttribute("font-family", "IBM Plex Mono, monospace");
    t.setAttribute("letter-spacing", "1");
    t.textContent = label;
    svg.appendChild(t);
  });

  // Sector dividers and labels
  const dividerAngles = [-90, 30, 150, 270];
  dividerAngles.forEach(a => {
    const p = polar(cx, cy, R, a);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", cx); line.setAttribute("y1", cy);
    line.setAttribute("x2", p.x); line.setAttribute("y2", p.y);
    line.setAttribute("stroke", "rgba(53,214,232,0.18)"); line.setAttribute("stroke-width", "1");
    svg.appendChild(line);
  });

  const sectorLabelAngles = { design: -30, construction: 90, combined: 210 };
  const sectorNames = { design: "DESIGN", construction: "CONSTRUCTION", combined: "COMBINED" };
  Object.entries(sectorLabelAngles).forEach(([sec, ang]) => {
    const lp = polar(cx, cy, R * 1.07, ang);
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", lp.x); t.setAttribute("y", lp.y + 4);
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("fill", "rgba(143,176,196,0.6)");
    t.setAttribute("font-size", "7.5"); t.setAttribute("font-family", "Archivo, sans-serif");
    t.setAttribute("letter-spacing", "1.5");
    t.textContent = sectorNames[sec];
    svg.appendChild(t);
  });

  // Blips
  LIN_PROJECTS.forEach(project => {
    const angle = projectAngle(project);
    const r = healthToRadius(project.health, R);
    const { x, y } = polar(cx, cy, r, angle);
    const color = STATUS_COLOR[project.signals.evm.status] || "#8fb0c4";

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "blip");
    g.setAttribute("data-id", project.id);
    g.setAttribute("tabindex", "0");
    g.setAttribute("role", "button");
    g.setAttribute("aria-label", `${project.id}: ${project.name}, health ${project.health}`);

    // Sweep-brightening pulse ring (hidden by default, shown via CSS animation)
    const pulseRing = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    pulseRing.setAttribute("class", "blip-pulse");
    pulseRing.setAttribute("cx", x); pulseRing.setAttribute("cy", y); pulseRing.setAttribute("r", 10);
    pulseRing.setAttribute("fill", "none");
    pulseRing.setAttribute("stroke", color); pulseRing.setAttribute("stroke-width", "1.5");
    pulseRing.setAttribute("opacity", "0");

    // Selection ring (shown when selected)
    const selRing = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    selRing.setAttribute("class", "blip-sel-ring");
    selRing.setAttribute("cx", x); selRing.setAttribute("cy", y); selRing.setAttribute("r", 9);
    selRing.setAttribute("fill", "none");
    selRing.setAttribute("stroke", "#35d6e8"); selRing.setAttribute("stroke-width", "1.5");
    selRing.setAttribute("opacity", "0");

    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("class", "blip-dot");
    dot.setAttribute("cx", x); dot.setAttribute("cy", y); dot.setAttribute("r", 5);
    dot.setAttribute("fill", color);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", x + 8); label.setAttribute("y", y + 4);
    label.setAttribute("fill", "#eef7fb"); label.setAttribute("opacity", "0.8");
    label.setAttribute("font-size", "7"); label.setAttribute("font-family", "IBM Plex Mono, monospace");
    label.textContent = project.id;

    // Store sweep delay as CSS custom property based on angle (0–360)
    const normalizedAngle = ((angle % 360) + 360) % 360;
    const sweepDelay = -(normalizedAngle / 360) * 6; // 6s sweep period
    g.style.setProperty("--sweep-delay", `${sweepDelay}s`);

    g.appendChild(pulseRing);
    g.appendChild(selRing);
    g.appendChild(dot);
    g.appendChild(label);

    g.addEventListener("click", () => selectProject(project.id));
    g.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectProject(project.id); }
    });

    svg.appendChild(g);
  });

  // Center crosshair
  ["h", "v"].forEach(dir => {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    if (dir === "h") { line.setAttribute("x1", cx-8); line.setAttribute("y1", cy); line.setAttribute("x2", cx+8); line.setAttribute("y2", cy); }
    else             { line.setAttribute("x1", cx); line.setAttribute("y1", cy-8); line.setAttribute("x2", cx); line.setAttribute("y2", cy+8); }
    line.setAttribute("stroke", "rgba(53,214,232,0.4)"); line.setAttribute("stroke-width", "1");
    svg.appendChild(line);
  });
}

// ── Fallback project list (accessibility) ────────────────────────────────────

function buildFallbackList() {
  const ul = document.getElementById("project-fallback-list");
  LIN_PROJECTS.forEach(p => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.className = "fallback-btn";
    btn.dataset.id = p.id;
    const dot = document.createElement("span");
    dot.className = "status-dot";
    dot.style.background = STATUS_COLOR[p.signals.evm.status];
    btn.appendChild(dot);
    btn.appendChild(document.createTextNode(`${p.id} — ${p.name}`));
    btn.addEventListener("click", () => selectProject(p.id));
    li.appendChild(btn);
    ul.appendChild(li);
  });
}

// ── Project selection ────────────────────────────────────────────────────────

function selectProject(id) {
  selectedProject = LIN_PROJECTS.find(p => p.id === id);
  if (!selectedProject) return;

  // Update blip selection rings
  document.querySelectorAll(".blip").forEach(g => {
    const ring = g.querySelector(".blip-sel-ring");
    ring.setAttribute("opacity", g.dataset.id === id ? "1" : "0");
  });

  // Update fallback list
  document.querySelectorAll(".fallback-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.id === id);
    btn.setAttribute("aria-pressed", btn.dataset.id === id ? "true" : "false");
  });

  renderLedger(selectedProject);
  renderDecisionCard(selectedProject);

  // Announce to screen readers
  const live = document.getElementById("ledger-live");
  live.textContent = `Selected: ${selectedProject.id}, ${selectedProject.name}`;
}

// ── Signal Ledger ────────────────────────────────────────────────────────────

function signalRow(label, signal, methodName, extraMetric) {
  const pill = `<span class="status-pill status-${signal.status}">${signal.status.toUpperCase()}</span>`;
  return `
    <div class="signal-row">
      <div class="signal-label">${label}</div>
      <div class="signal-status">${pill}</div>
      <div class="signal-metric mono">${extraMetric}</div>
      <div class="signal-method muted">${methodName}</div>
    </div>`;
}

function renderLedger(project) {
  const { signals } = project;
  const decision = deriveDecision(project);

  const conflictBanner = decision.conflictType !== "Agreement — low risk"
    ? `<div class="conflict-banner conflict-${decision.healthState}" role="alert">
         <span class="conflict-icon">⚑</span>
         <span class="conflict-label">${decision.conflictType}</span>
       </div>`
    : "";

  document.getElementById("ledger-region").innerHTML = `
    <div class="ledger-header">
      <span class="mono muted">${project.id}</span>
      <span class="ledger-name">${project.name}</span>
      <span class="mono muted">${project.reportingPeriod}</span>
    </div>
    ${conflictBanner}
    <div class="signal-table">
      ${signalRow("EVM", signals.evm, "Earned Value Management",
          `CPI ${signals.evm.cpi.toFixed(2)} / SPI ${signals.evm.spi.toFixed(2)}`)}
      ${signalRow("Monte Carlo", signals.mc, `${signals.mc.iterations.toLocaleString()} iterations`,
          `P80 overrun ${signals.mc.p80eacOverrunPct > 0 ? "+" : ""}${signals.mc.p80eacOverrunPct.toFixed(1)}%`)}
      ${signalRow("CUSUM / SPC", signals.cusum, "Cumulative Sum drift",
          `Drift ${signals.cusum.drift.toFixed(1)} (thresh ${signals.cusum.threshold.toFixed(1)})${signals.cusum.breached ? " ⚠ BREACH" : ""}`)}
      ${signalRow("Document Risk", signals.doc, `Source: ${signals.doc.source}`,
          `Score ${signals.doc.score.toFixed(2)}`)}
    </div>
    <div class="doc-excerpt">
      <span class="muted mono" style="font-size:0.7rem">DOC EXCERPT —</span>
      <span class="doc-text">${signals.doc.excerpt}</span>
    </div>
    <div class="health-bar-wrap">
      <span class="muted" style="font-size:0.75rem">COMPOSITE HEALTH</span>
      <div class="health-bar"><div class="health-fill" style="width:${project.health}%;background:${STATUS_COLOR[decision.healthState]}"></div></div>
      <span class="mono" style="font-size:0.8rem">${project.health}</span>
    </div>
  `;
}

// ── Decision Card ────────────────────────────────────────────────────────────

function renderDecisionCard(project) {
  const decision = deriveDecision(project);
  const card = document.getElementById("decision-card");

  const stateClass = `state-${decision.healthState}`;
  const docList = decision.documentation.map(d => `<li>${d}</li>`).join("");

  const fairnessGateHtml = decision.fairnessGateRequired ? `
    <div class="fairness-gate" role="group" aria-labelledby="fg-label">
      <div class="fairness-gate-header" id="fg-label">
        <span class="fg-icon">⚖</span>
        <strong>Fairness Gate — Required Before Formal Action</strong>
      </div>
      <label class="fg-check-label">
        <input type="checkbox" id="fg-checkbox" />
        Contractor response opportunity will be provided before any formal contractual action is taken.
      </label>
    </div>` : "";

  card.innerHTML = `
    <div class="decision-top">
      <div class="decision-state ${stateClass}">
        <span class="decision-state-label">DERIVED STATE</span>
        <span class="decision-state-value">${decision.healthState.toUpperCase().replace("-", " ")}</span>
      </div>
      <div class="decision-authority">
        <span class="muted" style="font-size:0.7rem;letter-spacing:1px">AUTHORITY</span>
        <span class="decision-authority-value">${decision.authority}</span>
      </div>
    </div>

    <div class="decision-action">
      <p class="decision-action-label muted">RECOMMENDED ACTION</p>
      <p class="decision-action-text">${decision.action}</p>
    </div>

    <div class="decision-docs">
      <p class="muted" style="font-size:0.72rem;letter-spacing:1px;margin-bottom:6px">DOCUMENTATION REQUIRED</p>
      <ul class="doc-list">${docList}</ul>
    </div>

    ${fairnessGateHtml}

    <div class="decision-record">
      <label for="rationale-input" class="rationale-label">Reviewer rationale (required, min 20 chars)</label>
      <textarea id="rationale-input" class="rationale-textarea"
        placeholder="Describe the basis for the decision taken, any deviations from the recommended action, and the next review date…"
        aria-required="true"></textarea>
      <div class="record-actions">
        <button id="record-btn" class="record-btn" disabled>Record decision</button>
        <button id="export-btn" class="export-btn" ${decisionLog.length === 0 ? "disabled" : ""}>Export audit JSON</button>
      </div>
    </div>

    <div id="decision-log-section" class="decision-log-section" ${decisionLog.length === 0 ? 'style="display:none"' : ""}>
      <p class="muted" style="font-size:0.72rem;letter-spacing:1px;margin-bottom:8px">DECISION LOG</p>
      <div id="decision-log-entries"></div>
    </div>
  `;

  renderDecisionLog();
  wireDecisionCard(project, decision);
}

function wireDecisionCard(project, decision) {
  const rationale = document.getElementById("rationale-input");
  const recordBtn = document.getElementById("record-btn");
  const exportBtn = document.getElementById("export-btn");
  const fgCheck = document.getElementById("fg-checkbox");

  function updateRecordBtn() {
    const rationaleOk = rationale.value.trim().length >= 20;
    const fairnessOk = !decision.fairnessGateRequired || (fgCheck && fgCheck.checked);
    recordBtn.disabled = !(rationaleOk && fairnessOk);
  }

  rationale.addEventListener("input", updateRecordBtn);
  if (fgCheck) fgCheck.addEventListener("change", updateRecordBtn);

  recordBtn.addEventListener("click", () => {
    const entry = {
      projectId: project.id,
      projectName: project.name,
      reportingPeriod: project.reportingPeriod,
      signals: project.signals,
      decision: {
        healthState: decision.healthState,
        conflictType: decision.conflictType,
        action: decision.action,
        authority: decision.authority,
        documentation: decision.documentation
      },
      fairnessGateRequired: decision.fairnessGateRequired,
      fairnessGateAcknowledged: decision.fairnessGateRequired ? (fgCheck && fgCheck.checked) : null,
      reviewerRationale: rationale.value.trim(),
      isoTimestamp: new Date().toISOString(),
      pceif_version: PCEIF_VERSION,
      data_boundary: DATA_BOUNDARY
    };
    decisionLog.push(entry);
    rationale.value = "";
    if (fgCheck) fgCheck.checked = false;
    updateRecordBtn();
    renderDecisionLog();
    document.getElementById("decision-log-section").style.display = "";
    if (exportBtn) exportBtn.disabled = false;
  });

  if (exportBtn) {
    exportBtn.addEventListener("click", exportAuditJson);
  }
}

function renderDecisionLog() {
  const container = document.getElementById("decision-log-entries");
  if (!container) return;
  container.innerHTML = "";
  const section = document.getElementById("decision-log-section");
  if (decisionLog.length === 0) { if (section) section.style.display = "none"; return; }
  if (section) section.style.display = "";

  [...decisionLog].reverse().forEach((entry, i) => {
    const div = document.createElement("div");
    div.className = "log-entry";
    div.innerHTML = `
      <span class="mono muted" style="font-size:0.7rem">${entry.isoTimestamp}</span>
      <span class="mono" style="font-size:0.78rem;margin-left:8px">${entry.projectId}</span>
      <span class="status-pill status-${entry.decision.healthState}" style="margin-left:8px">${entry.decision.healthState.toUpperCase()}</span>
      <div style="margin-top:4px;font-size:0.8rem;color:#c4dbe8">${entry.reviewerRationale}</div>
      ${entry.fairnessGateRequired ? '<div class="fg-ack-note">⚖ Fairness gate acknowledged</div>' : ""}
    `;
    container.appendChild(div);
  });
}

function exportAuditJson() {
  const json = JSON.stringify(decisionLog, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lin-pceif-audit-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  startClock();
  buildRadar();
  buildFallbackList();
  // Select first project by default
  selectProject(LIN_PROJECTS[0].id);
});
