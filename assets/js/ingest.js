/* ============================================================
   Lin Project Radar — ingest.js
   Client-side create-project and document ingest. No backend,
   no NLP/LLM: ingest runs the same VISIBLE keyword rules as
   Module 03, shows which rule fired and the proposed signal
   delta, and requires human Approve/Reject before any project
   state changes. Every ingest event is logged.

   User-created projects and approved ingest deltas persist in
   localStorage. All data remains synthetic.
   ============================================================ */

(function () {
  "use strict";

  const STORE_PROJECTS = "lin-user-projects";
  const STORE_LOG = "lin-ingest-log";
  const STORE_ARCHIVED = "lin-archived-ids";

  /* Archived projects live here (out of LIN_PROJECTS, so they are off the
     radar and all active views) but remain fully recoverable. */
  window.LIN_ARCHIVED = [];

  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  /* ---------- visible ingest rules (same spirit as Module 03) ---------- */
  const INGEST_RULES = [
    { id: "R1-unresolved",  pattern: /unresolved|no committed date|outstanding/i,
      label: "Unresolved item language", scoreDelta: +0.15, healthDelta: -4 },
    { id: "R2-dispute",     pattern: /dispute|claim|contested|disagreement/i,
      label: "Dispute / claim language", scoreDelta: +0.25, healthDelta: -7 },
    { id: "R3-delay",       pattern: /delay|resequenc|slip|behind schedule|late/i,
      label: "Schedule-impact language", scoreDelta: +0.20, healthDelta: -5 },
    { id: "R4-rejected",    pattern: /rejected|resubmit|nonconform|deficien/i,
      label: "Rejection / rework language", scoreDelta: +0.20, healthDelta: -5 },
    { id: "R5-cost",        pattern: /overrun|cost growth|change order|escalation/i,
      label: "Cost-pressure language", scoreDelta: +0.20, healthDelta: -5 },
    { id: "R6-positive",    pattern: /\bresolved\b|\bclosed\b|on schedule|within budget|approved as submitted/i,
      label: "Favorable resolution language", scoreDelta: -0.15, healthDelta: +4 }
  ];

  const DOC_TYPES = ["RFI log", "Submittal notes", "QC comments", "Procurement notes", "Meeting minutes"];

  let pendingProposal = null;
  let ingestLog = [];
  try { ingestLog = JSON.parse(localStorage.getItem(STORE_LOG) || "[]"); } catch (e) { ingestLog = []; }

  /* ---------- persistence ---------- */

  function loadUserProjects() {
    try { return JSON.parse(localStorage.getItem(STORE_PROJECTS) || "[]"); } catch (e) { return []; }
  }
  function saveUserProjects(list) {
    try { localStorage.setItem(STORE_PROJECTS, JSON.stringify(list)); } catch (e) {}
  }
  function persistProject(p) {
    const list = loadUserProjects().filter((x) => x.id !== p.id);
    list.push(p);
    saveUserProjects(list);
  }
  function saveLog() {
    try { localStorage.setItem(STORE_LOG, JSON.stringify(ingestLog.slice(0, 80))); } catch (e) {}
  }

  function loadArchivedIds() {
    try { return JSON.parse(localStorage.getItem(STORE_ARCHIVED) || "[]"); } catch (e) { return []; }
  }
  function saveArchivedIds() {
    try { localStorage.setItem(STORE_ARCHIVED, JSON.stringify(LIN_ARCHIVED.map((p) => p.id))); } catch (e) {}
  }

  /* Merge persisted user projects into the in-memory portfolio at load,
     then pull archived projects out of the active list. */
  function mergeUserProjects() {
    loadUserProjects().forEach((saved) => {
      const i = LIN_PROJECTS.findIndex((p) => p.id === saved.id);
      if (i >= 0) LIN_PROJECTS[i] = saved; else LIN_PROJECTS.push(saved);
    });
    loadArchivedIds().forEach((id) => {
      const i = LIN_PROJECTS.findIndex((p) => p.id === id);
      if (i >= 0) LIN_ARCHIVED.push(LIN_PROJECTS.splice(i, 1)[0]);
    });
  }

  /* ---------- archive / restore ---------- */

  function archiveProject(id) {
    const i = LIN_PROJECTS.findIndex((p) => p.id === id);
    if (i < 0) return;
    LIN_ARCHIVED.push(LIN_PROJECTS.splice(i, 1)[0]);
    saveArchivedIds();
    logEvent(`ARCHIVED project ${id}. Removed from the portfolio and active views; recoverable on the Manage Projects page.`);
    if (window.LinApp) LinApp.refresh();
  }

  function restoreProject(id) {
    const i = LIN_ARCHIVED.findIndex((p) => p.id === id);
    if (i < 0) return;
    LIN_PROJECTS.push(LIN_ARCHIVED.splice(i, 1)[0]);
    saveArchivedIds();
    logEvent(`RESTORED project ${id} from archive. Back on the portfolio and in active views.`);
    if (window.LinApp) LinApp.refresh();
  }

  /* ---------- create project ---------- */

  const SECTOR_TOKEN = { design: "DES", construction: "CON", combined: "CMB" };

  function nextCode(sector) {
    const token = SECTOR_TOKEN[sector];
    let max = 0;
    LIN_PROJECTS.forEach((p) => {
      const m = p.id.match(new RegExp(`^SYN-${token}-(\\d{3})$`));
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return `SYN-${token}-${String(max + 1).padStart(3, "0")}`;
  }

  function createProject(name, sector) {
    const id = nextCode(sector);
    const project = {
      id,
      name: name,
      sector,
      health: 88,
      reportingPeriod: "2026-06",
      userCreated: true,
      signals: {
        evm:   { cpi: 1.00, spi: 1.00, status: "green", dataDate: "2026-06-01" },
        mc:    { p80eacOverrunPct: 2.0, pMilestoneDelay: 0.10, iterations: 5000, status: "green" },
        cusum: { metric: "SPI", drift: 0.5, threshold: 5.0, breached: false, status: "green" },
        doc:   { score: 0.10, status: "green", source: "(baseline — no documents ingested yet)",
                 excerpt: "Synthetic baseline: no document evidence ingested for this project yet." }
      },
      fairnessSensitive: false
    };
    LIN_PROJECTS.push(project);
    persistProject(project);
    logEvent(`Created project ${id} — ${name} (${sector}); baseline synthetic signals seeded.`);
    return project;
  }

  /* ---------- document ingest ---------- */

  function analyzeText(text) {
    const fired = [];
    let scoreDelta = 0, healthDelta = 0;
    INGEST_RULES.forEach((r) => {
      const m = text.match(r.pattern);
      if (m) {
        fired.push({ rule: r, match: m[0] });
        scoreDelta += r.scoreDelta;
        healthDelta += r.healthDelta;
      }
    });
    // first sentence containing any match becomes the evidence excerpt
    let excerpt = "";
    if (fired.length) {
      const sentences = text.split(/(?<=[.!?])\s+/);
      excerpt = sentences.find((s) => fired.some((f) => f.rule.pattern.test(s))) || sentences[0] || "";
      excerpt = excerpt.trim().slice(0, 220);
    }
    return { fired, scoreDelta, healthDelta, excerpt };
  }

  function docStatusFor(score) {
    return score >= 0.70 ? "red" : score >= 0.30 ? "amber" : "green";
  }

  function proposeIngest(projectId, docType, text) {
    const project = LIN_PROJECTS.find((p) => p.id === projectId);
    if (!project || !text.trim()) return null;
    const a = analyzeText(text);
    const newScore = Math.max(0, Math.min(1, project.signals.doc.score + a.scoreDelta));
    const newHealth = Math.max(0, Math.min(100, project.health + a.healthDelta));
    return {
      projectId, docType,
      fired: a.fired,
      excerpt: a.excerpt,
      from: { score: project.signals.doc.score, status: project.signals.doc.status, health: project.health },
      to:   { score: newScore, status: docStatusFor(newScore), health: newHealth },
      scoreDelta: a.scoreDelta, healthDelta: a.healthDelta
    };
  }

  function applyProposal(prop) {
    const project = LIN_PROJECTS.find((p) => p.id === prop.projectId);
    if (!project) return;
    project.signals.doc.score = prop.to.score;
    project.signals.doc.status = prop.to.status;
    project.signals.doc.source = `(ingested) ${prop.docType}`;
    if (prop.excerpt) project.signals.doc.excerpt = prop.excerpt;
    project.health = prop.to.health;
    persistProject(project);
  }

  function logEvent(msg) {
    ingestLog.unshift({ at: new Date().toISOString(), msg });
    saveLog();
    renderLog();
  }

  /* ---------- page rendering ---------- */

  function projectOptions() {
    return LIN_PROJECTS.map((p) => `<option value="${esc(p.id)}">${esc(p.id)} — ${esc(p.name)}</option>`).join("");
  }

  function renderLog() {
    const elLog = document.getElementById("ingest-log");
    if (!elLog) return;
    elLog.innerHTML = ingestLog.length
      ? ingestLog.slice(0, 25).map((e) =>
          `<div class="ig-log-entry"><span class="mod-mono">${esc(window.LinTZ ? LinTZ.format(e.at) : e.at)}</span> ${esc(e.msg)}</div>`).join("")
      : `<p class="kn-sub">No ingest events this browser yet.</p>`;
  }

  function renderProposal(prop) {
    const box = document.getElementById("ingest-result");
    if (!prop) {
      box.innerHTML = `<p class="kn-sub">No risk rules matched this text. No change proposed — nothing to approve.</p>`;
      return;
    }
    const firedHtml = prop.fired.length
      ? prop.fired.map((f) =>
          `<li><strong>${esc(f.rule.label)}</strong> <span class="mod-mono">(${esc(f.rule.id)})</span> — matched “${esc(f.match)}” → doc score ${f.rule.scoreDelta >= 0 ? "+" : ""}${f.rule.scoreDelta.toFixed(2)}, health ${f.rule.healthDelta >= 0 ? "+" : ""}${f.rule.healthDelta}</li>`).join("")
      : "<li>No rules fired.</li>";

    box.innerHTML =
      `<h3 class="kn-defterm">Proposed signal delta — human approval required</h3>
       <ul class="ig-fired">${firedHtml}</ul>
       <div class="ig-delta mod-mono">
         doc score ${prop.from.score.toFixed(2)} → <strong>${prop.to.score.toFixed(2)}</strong> (${esc(prop.from.status)} → <strong>${esc(prop.to.status)}</strong>) ·
         health ${prop.from.health} → <strong>${prop.to.health}</strong>
       </div>
       ${prop.excerpt ? `<p class="ig-excerpt">Evidence excerpt: “${esc(prop.excerpt)}”</p>` : ""}
       <div class="dc-actions">
         <button id="ingest-approve" class="btn primary">Approve — apply to project</button>
         <button id="ingest-reject" class="btn">Reject — discard</button>
       </div>
       <p class="dc-note">Nothing changes until Approve is clicked. This is the same human-review boundary as the decision card.</p>`;

    document.getElementById("ingest-approve").addEventListener("click", () => {
      applyProposal(prop);
      logEvent(`APPROVED ingest (${prop.docType}) on ${prop.projectId}: doc ${prop.from.score.toFixed(2)}→${prop.to.score.toFixed(2)}, health ${prop.from.health}→${prop.to.health}. Rules: ${prop.fired.map((f) => f.rule.id).join(", ") || "none"}.`);
      box.innerHTML = `<p class="kn-sub">Applied. The project has been re-plotted on the portfolio scope and re-run through the decision rules.</p>`;
      pendingProposal = null;
      if (window.LinApp) { LinApp.refresh(); LinApp.selectProject(prop.projectId); }
    });
    document.getElementById("ingest-reject").addEventListener("click", () => {
      logEvent(`REJECTED ingest (${prop.docType}) on ${prop.projectId}. No state change.`);
      box.innerHTML = `<p class="kn-sub">Proposal discarded. No project state was changed.</p>`;
      pendingProposal = null;
    });
  }

  function wireIngestControls() {
    document.getElementById("ig-file").addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => { document.getElementById("ig-text").value = String(reader.result || "").slice(0, 20000); };
      reader.readAsText(f);
    });

    document.getElementById("ig-run").addEventListener("click", () => {
      const projectId = document.getElementById("ig-project").value;
      const docType = document.getElementById("ig-doctype").value;
      const text = document.getElementById("ig-text").value;
      if (!text.trim()) {
        document.getElementById("ingest-result").innerHTML = `<p class="kn-sub">Paste or load some document text first.</p>`;
        return;
      }
      pendingProposal = proposeIngest(projectId, docType, text);
      logEvent(`Ran extraction (${docType}) on ${projectId}: ${pendingProposal && pendingProposal.fired.length ? pendingProposal.fired.length + " rule(s) fired — awaiting human review" : "no rules fired"}.`);
      renderProposal(pendingProposal && pendingProposal.fired.length ? pendingProposal : null);
    });
  }

  /* ---------- Manage Projects page ----------
     One page: create project, active/archived lifecycle, and document
     ingest scoped to the project selected here. */

  function renderManagePage() {
    const root = document.getElementById("manage-root");
    if (!root) return;

    const stateOf = (p) => deriveHealthState(p);
    const activeRows = LIN_PROJECTS.map((p) => {
      const state = stateOf(p);
      return `<div class="pr-row">
        <span class="pr-code">${esc(p.id)}</span>
        <span class="pr-name">${esc(p.name)}</span>
        <span class="li-state state-${state.toLowerCase().replace("-review", "")}">${esc(state)}</span>
        <span class="pr-actions">
          <button class="btn small" data-detail="${esc(p.id)}">Detail</button>
          <button class="btn small" data-ingest="${esc(p.id)}">Ingest doc</button>
          <button class="btn small" data-archive="${esc(p.id)}">Archive</button>
        </span>
      </div>`;
    }).join("");

    const archivedRows = LIN_ARCHIVED.map((p) =>
      `<div class="pr-row">
        <span class="pr-code">${esc(p.id)}</span>
        <span class="pr-name">${esc(p.name)}</span>
        <span class="pr-code">archived</span>
        <button class="btn small" data-restore="${esc(p.id)}">Restore</button>
      </div>`).join("");

    root.innerHTML =
      `<div class="kn-grid">
        <section class="panel">
          <p class="eyebrow">Create project</p>
          <h2 class="kn-h">New synthetic project</h2>
          <p class="kn-sub">Generates the next SYN code, seeds baseline synthetic signals, and plots it on the portfolio scope through the same decision.js rules. Persists in this browser only (localStorage).</p>
          <label class="rationale-label" for="np-name">Project name</label>
          <input id="np-name" class="ig-input" maxlength="80" placeholder="e.g. Concourse Wayfinding Refresh" />
          <label class="rationale-label" for="np-sector">Delivery type</label>
          <select id="np-sector" class="ig-input">
            <option value="design">Design</option>
            <option value="construction">Construction</option>
            <option value="combined">Hybrid</option>
          </select>
          <div class="dc-actions"><button id="np-create" class="btn primary">Create synthetic project</button></div>
          <p id="np-msg" class="kn-sub" aria-live="polite"></p>
        </section>

        <section class="panel">
          <p class="eyebrow">Active (${LIN_PROJECTS.length})</p>
          ${activeRows || `<p class="pr-empty">No active projects.</p>`}
          <p class="eyebrow" style="margin-top:16px">Archived (${LIN_ARCHIVED.length})</p>
          ${archivedRows || `<p class="pr-empty">Nothing archived. Archive keeps a project recoverable while removing it from the portfolio.</p>`}
        </section>
      </div>

      <section class="panel" style="margin-top:18px" id="ingest-panel">
        <p class="eyebrow">Ingest document</p>
        <h2 class="kn-h">Run rule extraction for the selected project</h2>
        <p class="kn-sub">Paste or upload text (.txt / .csv / PDF-extracted text). The visible keyword rules below run client-side — no NLP, no LLM — and a human must Approve before anything changes.</p>
        <div class="kn-grid">
          <div>
            <label class="rationale-label" for="ig-project">Project</label>
            <select id="ig-project" class="ig-input">${projectOptions()}</select>
            <label class="rationale-label" for="ig-doctype">Document type</label>
            <select id="ig-doctype" class="ig-input">${DOC_TYPES.map((d) => `<option>${d}</option>`).join("")}</select>
            <details class="kn-topic"><summary>The rules that will run (visible by design)</summary>
              <ul class="ig-fired">${INGEST_RULES.map((r) =>
                `<li><span class="mod-mono">${esc(r.id)}</span> ${esc(r.label)} — /${esc(r.pattern.source)}/i → doc ${r.scoreDelta >= 0 ? "+" : ""}${r.scoreDelta.toFixed(2)}, health ${r.healthDelta >= 0 ? "+" : ""}${r.healthDelta}</li>`).join("")}
              </ul>
            </details>
          </div>
          <div>
            <label class="rationale-label" for="ig-text">Document text</label>
            <textarea id="ig-text" class="ig-textarea" placeholder="Paste document text here, or load a file below…"></textarea>
            <input type="file" id="ig-file" accept=".txt,.csv,.md,.text" class="ig-file" aria-label="Load text file" />
            <div class="dc-actions"><button id="ig-run" class="btn primary">Run extraction</button></div>
          </div>
        </div>
        <div id="ingest-result" aria-live="polite"></div>
      </section>

      <section class="panel" style="margin-top:18px">
        <p class="eyebrow">Project event log</p>
        <div id="ingest-log"></div>
      </section>`;

    renderLog();
    wireIngestControls();

    document.getElementById("np-create").addEventListener("click", () => {
      const name = document.getElementById("np-name").value.trim();
      const sector = document.getElementById("np-sector").value;
      const msg = document.getElementById("np-msg");
      if (name.length < 3) { msg.textContent = "Enter a project name (min 3 characters)."; return; }
      const p = createProject(name, sector);
      if (window.LinApp) LinApp.refresh();
      renderManagePage();
      document.getElementById("np-msg").textContent = `Created ${p.id}. It is on the portfolio scope with a derived decision.`;
      document.getElementById("ig-project").value = p.id;
    });

    root.querySelectorAll("[data-archive]").forEach((b) =>
      b.addEventListener("click", () => { archiveProject(b.dataset.archive); renderManagePage(); }));
    root.querySelectorAll("[data-restore]").forEach((b) =>
      b.addEventListener("click", () => { restoreProject(b.dataset.restore); renderManagePage(); }));
    root.querySelectorAll("[data-detail]").forEach((b) =>
      b.addEventListener("click", () => LinApp.openDetail(b.dataset.detail)));
    root.querySelectorAll("[data-ingest]").forEach((b) =>
      b.addEventListener("click", () => {
        document.getElementById("ig-project").value = b.dataset.ingest;
        document.getElementById("ingest-panel").scrollIntoView({ block: "start" });
        document.getElementById("ig-text").focus();
      }));
  }

  window.LinIngest = { mergeUserProjects, renderManagePage, INGEST_RULES };
})();
