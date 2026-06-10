(() => {
  "use strict";

  const CONFIG = (typeof LIN_CONFIG !== "undefined" ? LIN_CONFIG : window.LIN_CONFIG) || {};

  const SAMPLE_PROJECTS = [
    { code: "SYN-DES-001", projectName: "Terminal Airside Utilities Design", type: "Design", status: "GREEN", health: 90, cpi: 1.04, spi: 1.01, bacM: 88.6, p50EacM: 85.192, p80EacM: 86.828, posteriorRisk: 0.16, cusum: 0.8, flaggedRfis: 1, conflicts: 0 },
    { code: "SYN-DES-002", projectName: "Laboratory Renovation Design", type: "Design", status: "AMBER", health: 64, cpi: 0.95, spi: 0.92, bacM: 40.1, p50EacM: 42.211, p80EacM: 44.338, posteriorRisk: 0.42, cusum: 2.1, flaggedRfis: 5, conflicts: 1 },
    { code: "SYN-DES-003", projectName: "Central Plant Controls Design", type: "Design", status: "GREEN", health: 94, cpi: 1.03, spi: 1.04, bacM: 52.4, p50EacM: 50.874, p80EacM: 52.034, posteriorRisk: 0.19, cusum: 1.0, flaggedRfis: 1, conflicts: 0 },
    { code: "SYN-DES-004", projectName: "Secure Communications Backbone Design", type: "Design", status: "RED", health: 40, cpi: 0.82, spi: 0.78, bacM: 67.8, p50EacM: 82.683, p80EacM: 89.728, posteriorRisk: 0.71, cusum: 5.8, flaggedRfis: 13, conflicts: 3 },
    { code: "SYN-CON-005", projectName: "Concourse MEP Fit-Out Construction Administration", type: "Construction", status: "RED", health: 32, cpi: 0.83, spi: 0.79, bacM: 161.9, p50EacM: 195.060, p80EacM: 212.849, posteriorRisk: 0.76, cusum: 6.3, flaggedRfis: 13, conflicts: 3 },
    { code: "SYN-CON-006", projectName: "Facility Security Integration Construction Administration", type: "Construction", status: "AMBER", health: 62, cpi: 0.92, spi: 0.92, bacM: 31.8, p50EacM: 34.565, p80EacM: 36.432, posteriorRisk: 0.45, cusum: 2.7, flaggedRfis: 5, conflicts: 1 },
    { code: "SYN-CON-007", projectName: "Emergency Power Resilience Construction Administration", type: "Construction", status: "GREEN", health: 92, cpi: 1.04, spi: 1.04, bacM: 74.2, p50EacM: 71.346, p80EacM: 72.887, posteriorRisk: 0.18, cusum: 0.9, flaggedRfis: 1, conflicts: 0 },
    { code: "SYN-CON-008", projectName: "Operations Center Build-Out Construction Administration", type: "Construction", status: "AMBER", health: 66, cpi: 0.95, spi: 0.89, bacM: 96.5, p50EacM: 101.579, p80EacM: 107.552, posteriorRisk: 0.49, cusum: 3.0, flaggedRfis: 5, conflicts: 1 },
    { code: "SYN-CMB-009", projectName: "Curbside Roadway Reconfiguration", type: "Combined", status: "AMBER", health: 68, cpi: 0.92, spi: 0.90, bacM: 68.9, p50EacM: 74.891, p80EacM: 79.115, posteriorRisk: 0.47, cusum: 2.6, flaggedRfis: 5, conflicts: 2 },
    { code: "SYN-CMB-010", projectName: "Access Control Modernization", type: "Combined", status: "RED", health: 32, cpi: 0.82, spi: 0.81, bacM: 235.4, p50EacM: 287.073, p80EacM: 312.565, posteriorRisk: 0.74, cusum: 6.0, flaggedRfis: 13, conflicts: 4 },
    { code: "SYN-CMB-011", projectName: "Baggage Interface Works", type: "Combined", status: "RED", health: 34, cpi: 0.83, spi: 0.82, bacM: 148.2, p50EacM: 178.554, p80EacM: 193.553, posteriorRisk: 0.70, cusum: 5.5, flaggedRfis: 13, conflicts: 4 },
    { code: "SYN-CMB-012", projectName: "Passenger Processing Hall Renewal", type: "Combined", status: "GREEN", health: 92, cpi: 1.03, spi: 1.00, bacM: 122.7, p50EacM: 119.126, p80EacM: 122.128, posteriorRisk: 0.21, cusum: 1.2, flaggedRfis: 1, conflicts: 0 }
  ];

  const DEFINITIONS = {
    EVM: { term: "EVM", definition: "Earned Value Management compares planned value, earned value, and actual cost to show cost and schedule performance against the baseline.", formula: "Core values: PV, EV, AC" },
    PV: { term: "PV / Planned Value", definition: "The budgeted value of work that was planned to be completed by a given point in time.", formula: "PV = planned budgeted work to date" },
    EV: { term: "EV / Earned Value", definition: "The budgeted value of work actually completed by a given point in time.", formula: "EV = budgeted value of completed work" },
    AC: { term: "AC / Actual Cost", definition: "The actual cost incurred for the work performed by a given point in time.", formula: "AC = actual cost of performed work" },
    CPI: { term: "CPI", definition: "Cost Performance Index. A CPI below 1.00 indicates the project is earning less value than it is spending.", formula: "CPI = EV / AC" },
    SPI: { term: "SPI", definition: "Schedule Performance Index. An SPI below 1.00 indicates the project is earning work more slowly than planned.", formula: "SPI = EV / PV" },
    BAC: { term: "BAC", definition: "Budget at Completion. The approved total baseline budget for the project or control account.", formula: "BAC = approved baseline budget" },
    EAC: { term: "EAC", definition: "Estimate at Completion. The forecasted total final cost of the project.", formula: "EAC approximately equals BAC / CPI, or the documented EAC logic used by the module" },
    P50: { term: "P50", definition: "The 50th percentile forecast. It is the median or likely simulation outcome.", formula: "P50 = median simulated forecast" },
    P80: { term: "P80", definition: "The 80th percentile forecast. There is an estimated 80% chance the final project cost will be at or below this value, and a 20% chance it may exceed it.", formula: "P80 = 80th percentile of simulated forecast outcomes" },
    "Monte Carlo": { term: "Monte Carlo", definition: "A transparent uncertainty-propagation method that repeatedly samples uncertain inputs to produce a range of possible outcomes.", formula: "Repeated simulation draws -> outcome distribution" },
    "Bayesian Updating": { term: "Bayesian Updating", definition: "A method for revising a prior risk estimate when new reporting-period evidence becomes available.", formula: "Posterior risk = updated prior after new evidence" },
    SPC: { term: "SPC", definition: "Statistical Process Control. A monitoring approach for detecting whether a process is moving outside normal control behavior.", formula: "Compare observed signal against control thresholds" },
    CUSUM: { term: "CUSUM", definition: "Cumulative Sum control chart logic. It tracks accumulating drift so small persistent deviations can become visible.", formula: "CUSUM = cumulative deviation signal" },
    RFI: { term: "RFI", definition: "Request for Information. A formal question or clarification item that can indicate design, coordination, or construction risk.", formula: "Flagged RFIs contribute to document-risk evidence" },
    Submittal: { term: "Submittal", definition: "A contractor or supplier submission for review, such as product data, shop drawings, samples, or certifications.", formula: "Submittal status can affect schedule and procurement risk" },
    "Pay Application": { term: "Pay Application", definition: "A request for payment documenting completed work, stored quantities, retainage, and commercial progress.", formula: "Pay applications can validate cost and progress signals" },
    "Document Risk": { term: "Document Risk", definition: "Risk extracted from project records such as RFIs, submittals, procurement notes, QC comments, claims, or meeting minutes.", formula: "Document evidence -> risk classification -> human review" },
    "Signal Synthesis": { term: "Signal Synthesis", definition: "The combination of cost, schedule, anomaly, and document evidence into an explainable portfolio status.", formula: "EVM + Bayesian risk + CUSUM + document evidence -> status" },
    "Governance Recommendation": { term: "Governance Recommendation", definition: "A recommended action path that converts predictive signals into accountable project-control review, escalation, or monitoring steps.", formula: "Signal -> Evidence -> Threshold -> Explanation -> Consequence -> Action" }
  };

  const ENDPOINTS = [
    { action: "health", label: "Health" },
    { action: "portfolio", label: "Portfolio" },
    { action: "project", label: "Project" },
    { action: "audit", label: "Audit" },
    { action: "definitions", label: "Definitions" }
  ];

  const state = {
    projects: SAMPLE_PROJECTS.slice(),
    selectedProjectId: "SYN-DES-001",
    filter: "ALL",
    portfolioPayload: null,
    endpointStatus: {},
    smokeResult: null,
    liveConnected: false,
    definitions: DEFINITIONS
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    bindControls();
    renderConfigPanel();
    renderPortfolio();
    renderProjectSelect();
    renderDeepDive();
    renderGovernance();
    renderDefinitions();
    renderEndpointGrid();
    renderSmokeRows(null);
  }

  function bindControls() {
    document.querySelectorAll(".nav-chip").forEach((button) => {
      button.addEventListener("click", () => setPage(button.dataset.page));
    });

    document.querySelectorAll(".filter-chip").forEach((button) => {
      button.addEventListener("click", () => {
        state.filter = button.dataset.filter;
        document.querySelectorAll(".filter-chip").forEach((chip) => chip.classList.remove("active"));
        button.classList.add("active");
        renderProjectGrid();
      });
    });

    document.getElementById("themeToggle").addEventListener("click", () => {
      const body = document.body;
      body.dataset.theme = body.dataset.theme === "dark" ? "light" : "dark";
    });

    document.getElementById("notificationToggle").addEventListener("click", () => {
      document.body.classList.toggle("notifications-on");
    });

    document.getElementById("runSmokeTest").addEventListener("click", runSmokeTest);

    document.getElementById("projectSelect").addEventListener("change", (event) => {
      state.selectedProjectId = event.target.value;
      renderProjectGrid();
      renderDeepDive();
      renderGovernance();
    });

    document.getElementById("lookupSearch").addEventListener("input", renderDefinitions);
    document.getElementById("drawerClose").addEventListener("click", closeDefinitionDrawer);

    document.addEventListener("click", (event) => {
      const term = event.target.closest(".def-term");
      if (term) showDefinition(term.dataset.term);
    });

    document.addEventListener("contextmenu", (event) => {
      const term = event.target.closest(".def-term");
      if (!term) return;
      event.preventDefault();
      showDefinition(term.dataset.term);
    });
  }

  function setPage(page) {
    document.querySelectorAll(".nav-chip").forEach((button) => {
      const isActive = button.dataset.page === page;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-current", isActive ? "page" : "false");
    });

    document.querySelectorAll(".page").forEach((section) => section.classList.remove("active"));
    document.getElementById(`page-${page}`).classList.add("active");
  }

  function renderConfigPanel() {
    document.getElementById("configRootId").textContent = CONFIG.driveRootFolderId || "Not set";
    document.getElementById("configApiUrl").textContent = isApiConfigured() ? CONFIG.appsScriptApiUrl : "Paste deployed Apps Script web app URL in config.js";
    document.getElementById("configTransport").textContent = CONFIG.transport || "jsonp";
  }

  function renderPortfolio() {
    renderPortfolioKpis();
    renderProjectGrid();
    const pill = document.getElementById("portfolioSyncPill");
    pill.textContent = state.liveConnected ? "Live cloud-folder bridge connected" : "Sample roster loaded";
  }

  function renderPortfolioKpis() {
    const counts = getCounts(state.projects);
    const readiness = state.smokeResult && state.smokeResult.readyForPhase4B ? "Ready" : "Pending";
    const kpis = [
      { label: "Projects detected", value: counts.total, sub: `${counts.types.Design || 0} Design | ${counts.types.Construction || 0} Construction | ${counts.types.Combined || 0} Combined` },
      { label: "Status distribution", value: `${counts.statuses.GREEN || 0}/${counts.statuses.AMBER || 0}/${counts.statuses.RED || 0}`, sub: "Green / Amber / Red" },
      { label: "Average health", value: `${counts.averageHealth}`, sub: "Portfolio synthetic health score" },
      { label: "Phase 4B readiness", value: readiness, sub: "Requires live ingestion pass" }
    ];

    document.getElementById("portfolioKpis").innerHTML = kpis.map((kpi) => `
      <article class="kpi-card">
        <span class="kpi-label">${escapeHtml(kpi.label)}</span>
        <strong class="kpi-value">${escapeHtml(kpi.value)}</strong>
        <span class="kpi-sub">${escapeHtml(kpi.sub)}</span>
      </article>
    `).join("");
  }

  function renderProjectGrid() {
    const filtered = state.projects.filter((project) => state.filter === "ALL" || project.status === state.filter);
    document.getElementById("projectGrid").innerHTML = filtered.map((project) => projectCard(project)).join("");

    document.querySelectorAll(".project-card").forEach((card) => {
      card.addEventListener("click", () => {
        state.selectedProjectId = card.dataset.projectId;
        renderProjectSelect();
        renderProjectGrid();
        renderDeepDive();
        renderGovernance();
      });
    });
  }

  function projectCard(project) {
    const statusClass = statusClassName(project.status);
    const gaugeColor = statusCssColor(project.status);
    const health = numberOr(project.health, 0);
    const p80Delta = project.bacM ? (((project.p80EacM - project.bacM) / project.bacM) * 100) : 0;

    return `
      <article class="project-card ${project.code === state.selectedProjectId ? "selected" : ""}" data-project-id="${escapeHtml(project.code)}">
        <div class="card-topline">
          <span class="project-code">${escapeHtml(project.code)}</span>
          <span class="status-pill ${statusClass}">${escapeHtml(project.status)}</span>
        </div>
        <div>
          <h2 class="project-name">${escapeHtml(project.projectName)}</h2>
          <p class="project-type">${escapeHtml(project.type)} project folder</p>
        </div>
        <div class="health-gauge" style="background: conic-gradient(${gaugeColor} ${health * 3.6}deg, rgba(255,255,255,0.08) 0deg);">
          <span class="gauge-text"><strong class="gauge-number">${health}</strong><span class="gauge-label">Health</span></span>
        </div>
        <div class="metric-stack">
          <div class="metric-row"><span>${term("CPI")}</span><strong>${formatNumber(project.cpi, 2)}</strong></div>
          <div class="metric-row"><span>${term("SPI")}</span><strong>${formatNumber(project.spi, 2)}</strong></div>
          <div class="metric-row"><span>${term("P80")} ${term("EAC")}</span><strong>$${formatNumber(project.p80EacM, 3)}M</strong></div>
          <div class="progress-track" aria-label="Health progress"><span class="progress-bar" style="width: ${Math.max(6, Math.min(100, health))}%"></span></div>
        </div>
        <div class="card-footer">
          <span>Risk spread</span>
          <strong>${p80Delta >= 0 ? "+" : ""}${formatNumber(p80Delta, 1)}%</strong>
        </div>
      </article>
    `;
  }

  function renderProjectSelect() {
    const select = document.getElementById("projectSelect");
    select.innerHTML = state.projects.map((project) => `<option value="${escapeHtml(project.code)}">${escapeHtml(project.code)} - ${escapeHtml(project.projectName)}</option>`).join("");
    select.value = state.selectedProjectId;
  }

  function renderDeepDive() {
    const project = getSelectedProject();
    if (!project) return;
    document.getElementById("projectSummary").innerHTML = renderProjectSummary(project);
    document.getElementById("riskLensPanel").innerHTML = renderRiskLens(project);
    document.getElementById("moduleGrid").innerHTML = renderModules(project);
  }

  function renderProjectSummary(project) {
    const statusClass = statusClassName(project.status);
    const bars = [52, 68, 46, 78, 64, 88, 54, 73, 60, 92].map((height, index) =>
      `<span class="chart-bar" style="height:${height + (project.health % 12)}%; animation-delay:${index * 120}ms"></span>`
    ).join("");

    return `
      <div class="summary-header">
        <div>
          <p class="eyebrow">Selected project</p>
          <h2 class="summary-title">${escapeHtml(project.projectName)}</h2>
          <p class="summary-type">${escapeHtml(project.code)} | ${escapeHtml(project.type)} | ${term("Hybrid Monte Carlo + Bayesian Updating + SPC/CUSUM anomaly simulation")}</p>
        </div>
        <span class="status-pill ${statusClass}">${escapeHtml(project.status)}</span>
      </div>
      <div class="chart-strip" aria-label="Animated synthetic trend chart">${bars}</div>
      <div class="risk-lens-grid" style="margin-top: 14px;">
        <div class="lens-tile"><span>${term("BAC")}</span><strong>$${formatNumber(project.bacM, 3)}M</strong></div>
        <div class="lens-tile"><span>${term("P50")} ${term("EAC")}</span><strong>$${formatNumber(project.p50EacM, 3)}M</strong></div>
        <div class="lens-tile"><span>${term("P80")} ${term("EAC")}</span><strong>$${formatNumber(project.p80EacM, 3)}M</strong></div>
        <div class="lens-tile"><span>${term("CUSUM")}</span><strong>${formatNumber(project.cusum, 1)}</strong></div>
      </div>
    `;
  }

  function renderRiskLens(project) {
    const status = project.status;
    const threshold = thresholdText(project);
    const action = recommendedAction(project);
    const consequence = consequenceText(project);

    return `
      <p class="eyebrow">Module 01 P80 EAC Risk Lens</p>
      <h2>${term("P80")} ${term("EAC")} plain-language meaning</h2>
      <p class="fine-print">There is an estimated 80% chance the final project cost will be at or below the P80 EAC value, and a 20% chance it may exceed that value.</p>
      <div class="risk-lens-grid" style="margin-top: 14px;">
        <div class="lens-tile"><span>Status</span><strong class="${statusClassName(status)}">${escapeHtml(status)}</strong></div>
        <div class="lens-tile"><span>Drivers</span><strong>${term("CPI")}, ${term("SPI")}, remaining-work uncertainty, ${term("CUSUM")}, document evidence</strong></div>
        <div class="lens-tile"><span>Threshold</span><strong>${escapeHtml(threshold)}</strong></div>
        <div class="lens-tile"><span>Consequence</span><strong>${escapeHtml(consequence)}</strong></div>
        <div class="lens-tile"><span>Recommended action</span><strong>${escapeHtml(action)}</strong></div>
        <div class="lens-tile"><span>Human review note</span><strong>Decision support only; project team review required before action.</strong></div>
      </div>
    `;
  }

  function renderModules(project) {
    const modules = [
      {
        name: "Module 01",
        title: "Hybrid Dynamic Simulation",
        why: `${term("P80")} ${term("EAC")} is $${formatNumber(project.p80EacM, 3)}M against ${term("BAC")} of $${formatNumber(project.bacM, 3)}M.`
      },
      {
        name: "Module 02",
        title: "SPC / CUSUM Anomaly Monitor",
        why: `${term("CUSUM")} drift score is ${formatNumber(project.cusum, 1)}, supporting a ${project.status} anomaly signal.`
      },
      {
        name: "Module 03",
        title: "Document Risk Extraction",
        why: `${project.flaggedRfis} flagged ${term("RFI")} items and ${project.conflicts} conflicts are included as document evidence.`
      },
      {
        name: "Module 04",
        title: "Signal Synthesis",
        why: `${term("EVM")}, Bayesian risk, anomaly monitoring, and document evidence are combined into one explainable status.`
      },
      {
        name: "Module 05",
        title: "Governance Decision Card",
        why: `The output maps signal, evidence, threshold, explanation, consequence, and action.`
      }
    ];

    return modules.map((module) => `
      <article class="module-card">
        <span>${escapeHtml(module.name)}</span>
        <h2>${escapeHtml(module.title)}</h2>
        <strong class="module-status ${statusClassName(project.status)}">${escapeHtml(project.status)}</strong>
        <p>${module.why}</p>
      </article>
    `).join("");
  }

  function renderGovernance() {
    const project = getSelectedProject();
    if (!project) return;
    const statusClass = statusClassName(project.status);
    const action = recommendedAction(project);
    const consequence = consequenceText(project);
    const threshold = thresholdText(project);

    document.getElementById("governanceCard").innerHTML = `
      <div class="governance-title-line">
        <div>
          <p class="eyebrow">Decision card</p>
          <h2 class="summary-title">${escapeHtml(project.projectName)}</h2>
          <p class="summary-type">${escapeHtml(project.code)} | ${escapeHtml(project.type)}</p>
        </div>
        <span class="status-pill ${statusClass}">${escapeHtml(project.status)}</span>
      </div>

      <div class="signal-chain" aria-label="Signal to action chain">
        ${["Signal", "Evidence", "Threshold", "Explanation", "Consequence", "Action"].map((node) => `<div class="signal-node">${escapeHtml(node)}</div>`).join("")}
      </div>

      <div class="governance-grid">
        <div class="governance-tile"><span>Signal</span><strong>${escapeHtml(project.status)} project-control condition</strong></div>
        <div class="governance-tile"><span>Evidence</span><strong>${term("P80")} ${term("EAC")}, ${term("CPI")}, ${term("SPI")}, ${term("CUSUM")}, ${term("RFI")} count, conflicts</strong></div>
        <div class="governance-tile"><span>Threshold</span><strong>${escapeHtml(threshold)}</strong></div>
        <div class="governance-tile"><span>Explanation</span><strong>${escapeHtml(explanationText(project))}</strong></div>
        <div class="governance-tile"><span>Consequence</span><strong>${escapeHtml(consequence)}</strong></div>
        <div class="governance-tile"><span>Recommended next action</span><strong>${escapeHtml(action)}</strong></div>
        <div class="governance-tile"><span>Human review note</span><strong>This demo output is synthetic and must be reviewed by the project team before any real action.</strong></div>
        <div class="governance-tile"><span>Audit trail</span><strong>Record model/provider version, source path, timestamp, prompt version, and human-review status when AI extraction is connected later.</strong></div>
      </div>
    `;
  }

  function renderDefinitions() {
    const query = (document.getElementById("lookupSearch")?.value || "").toLowerCase().trim();
    const definitions = Object.values(state.definitions)
      .filter((item) => !query || `${item.term} ${item.definition} ${item.formula || ""}`.toLowerCase().includes(query));

    document.getElementById("lookupGrid").innerHTML = definitions.map((item) => `
      <article class="definition-card">
        <h3>${escapeHtml(item.term)}</h3>
        <p>${escapeHtml(item.definition)}</p>
        ${item.formula ? `<code>${escapeHtml(item.formula)}</code>` : ""}
      </article>
    `).join("");
  }

  function renderEndpointGrid() {
    document.getElementById("endpointGrid").innerHTML = ENDPOINTS.map((endpoint) => {
      const status = state.endpointStatus[endpoint.action] || "idle";
      const label = status === "pass" ? "Pass" : status === "fail" ? "Fail" : status === "running" ? "Running" : "Idle";
      const klass = status === "pass" ? "ready" : status === "fail" ? "failed" : "pending";
      return `
        <div class="endpoint-row">
          <span>${escapeHtml(endpoint.label)}</span>
          <strong class="status-pill ${klass}">${escapeHtml(label)}</strong>
        </div>
      `;
    }).join("");
  }

  function renderSmokeRows(result) {
    const rows = result ? [
      ["Root folder detected", result.rootFolderName || result.rootFolderDetected || "No", Boolean(result.rootFolderDetected)],
      ["cloud_folder_index.json found", yesNo(result.cloudFolderIndexFound), Boolean(result.cloudFolderIndexFound)],
      ["Projects detected", result.counts?.total ?? 0, (result.counts?.total ?? 0) === CONFIG.expectedProjectCount],
      ["Design-only", result.counts?.types?.Design ?? 0, (result.counts?.types?.Design ?? 0) === CONFIG.expectedTypeCounts.Design],
      ["Construction-only", result.counts?.types?.Construction ?? 0, (result.counts?.types?.Construction ?? 0) === CONFIG.expectedTypeCounts.Construction],
      ["Combined", result.counts?.types?.Combined ?? 0, (result.counts?.types?.Combined ?? 0) === CONFIG.expectedTypeCounts.Combined],
      ["Green", result.counts?.statuses?.GREEN ?? 0, (result.counts?.statuses?.GREEN ?? 0) === CONFIG.expectedStatusCounts.GREEN],
      ["Amber", result.counts?.statuses?.AMBER ?? 0, (result.counts?.statuses?.AMBER ?? 0) === CONFIG.expectedStatusCounts.AMBER],
      ["Red", result.counts?.statuses?.RED ?? 0, (result.counts?.statuses?.RED ?? 0) === CONFIG.expectedStatusCounts.RED],
      ["Explainability files found", yesNo(result.explainabilityFilesFound), Boolean(result.explainabilityFilesFound)],
      ["Audit trails found", yesNo(result.auditTrailsFound), Boolean(result.auditTrailsFound)],
      ["Ready for Phase 4B", yesNo(result.readyForPhase4B), Boolean(result.readyForPhase4B)]
    ] : [
      ["Root folder detected", "Not run", false],
      ["cloud_folder_index.json found", "Not run", false],
      ["Projects detected", "Not run", false],
      ["Design-only", "Not run", false],
      ["Construction-only", "Not run", false],
      ["Combined", "Not run", false],
      ["Green", "Not run", false],
      ["Amber", "Not run", false],
      ["Red", "Not run", false],
      ["Explainability files found", "Not run", false],
      ["Audit trails found", "Not run", false],
      ["Ready for Phase 4B", "Not run", false]
    ];

    document.getElementById("smokeResults").innerHTML = rows.map(([label, value, pass]) => `
      <div class="smoke-row">
        <span>${escapeHtml(label)}</span>
        <strong class="${pass ? "status-green" : "status-amber"}">${escapeHtml(String(value))}</strong>
      </div>
    `).join("");

    const pill = document.getElementById("phaseReadinessPill");
    if (!result) {
      pill.className = "status-pill pending";
      pill.textContent = "Not run";
    } else if (result.readyForPhase4B) {
      pill.className = "status-pill ready";
      pill.textContent = "Ready for Phase 4B";
    } else {
      pill.className = "status-pill failed";
      pill.textContent = "Needs setup or data correction";
    }
  }

  async function runSmokeTest() {
    state.endpointStatus = {};
    setLog("Starting Phase 4A ingestion smoke test...");
    renderEndpointGrid();

    if (!isApiConfigured()) {
      const counts = getCounts(SAMPLE_PROJECTS);
      const localResult = {
        rootFolderDetected: false,
        rootFolderName: "Apps Script URL not configured",
        cloudFolderIndexFound: false,
        counts,
        explainabilityFilesFound: false,
        auditTrailsFound: false,
        readyForPhase4B: false
      };
      appendLog("config.js still contains the placeholder Apps Script URL.");
      appendLog("Sample roster remains visible, but Phase 4A cannot pass until the live bridge is deployed.");
      state.smokeResult = localResult;
      renderSmokeRows(localResult);
      renderPortfolioKpis();
      return;
    }

    try {
      state.endpointStatus.health = "running";
      renderEndpointGrid();
      const health = await requestApi("health");
      assertOk(health, "health");
      state.endpointStatus.health = "pass";
      appendLog(`health: ${compactJson(health.data || health)}`);
      renderEndpointGrid();

      state.endpointStatus.portfolio = "running";
      renderEndpointGrid();
      const portfolio = await requestApi("portfolio");
      assertOk(portfolio, "portfolio");
      state.endpointStatus.portfolio = "pass";
      appendLog(`portfolio: ${compactJson(portfolio.data || portfolio)}`);
      renderEndpointGrid();

      const data = portfolio.data || portfolio;
      if (Array.isArray(data.projects) && data.projects.length) {
        state.projects = data.projects.map(normalizeProject).sort((a, b) => a.code.localeCompare(b.code));
        state.liveConnected = true;
        state.selectedProjectId = state.projects.some((p) => p.code === state.selectedProjectId) ? state.selectedProjectId : state.projects[0].code;
      }

      const projectId = state.selectedProjectId || "SYN-DES-001";

      state.endpointStatus.project = "running";
      renderEndpointGrid();
      const project = await requestApi("project", { id: projectId });
      assertOk(project, "project");
      state.endpointStatus.project = "pass";
      appendLog(`project ${projectId}: ${compactJson(project.data || project)}`);
      renderEndpointGrid();

      state.endpointStatus.audit = "running";
      renderEndpointGrid();
      const audit = await requestApi("audit", { id: projectId });
      assertOk(audit, "audit");
      state.endpointStatus.audit = "pass";
      appendLog(`audit ${projectId}: ${compactJson(audit.data || audit)}`);
      renderEndpointGrid();

      state.endpointStatus.definitions = "running";
      renderEndpointGrid();
      const definitions = await requestApi("definitions");
      assertOk(definitions, "definitions");
      state.endpointStatus.definitions = "pass";
      appendLog("definitions: endpoint responded.");
      renderEndpointGrid();

      const result = normalizeSmokeResult(data);
      const endpointPass = ENDPOINTS.every((endpoint) => state.endpointStatus[endpoint.action] === "pass");
      result.readyForPhase4B = Boolean(result.readyForPhase4B && endpointPass);
      state.smokeResult = result;
      state.portfolioPayload = portfolio;

      renderPortfolio();
      renderProjectSelect();
      renderDeepDive();
      renderGovernance();
      renderDefinitions();
      renderSmokeRows(result);
      appendLog(result.readyForPhase4B ? "Phase 4A smoke test passed." : "Smoke test completed, but one or more success criteria did not pass.");
    } catch (error) {
      const running = Object.keys(state.endpointStatus).find((key) => state.endpointStatus[key] === "running");
      if (running) state.endpointStatus[running] = "fail";
      renderEndpointGrid();
      appendLog(`ERROR: ${error.message || error}`);
      const counts = getCounts(state.projects);
      const failedResult = {
        rootFolderDetected: false,
        rootFolderName: "Bridge request failed",
        cloudFolderIndexFound: false,
        counts,
        explainabilityFilesFound: false,
        auditTrailsFound: false,
        readyForPhase4B: false
      };
      state.smokeResult = failedResult;
      renderSmokeRows(failedResult);
      renderPortfolioKpis();
    }
  }

  function requestApi(action, params = {}) {
    const url = buildApiUrl(action, params);
    if ((CONFIG.transport || "jsonp").toLowerCase() === "fetch") {
      return fetch(url, { method: "GET", mode: "cors", cache: "no-store" }).then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status} for ${action}`);
        return response.json();
      });
    }
    return jsonp(url);
  }

  function buildApiUrl(action, params) {
    const base = (CONFIG.appsScriptApiUrl || "").trim();
    if (!isApiConfigured()) throw new Error("Apps Script API URL is not configured in config.js.");
    const query = new URLSearchParams({
      action,
      rootId: CONFIG.driveRootFolderId,
      _: String(Date.now())
    });
    Object.entries(params).forEach(([key, value]) => query.set(key, value));
    return `${base}${base.includes("?") ? "&" : "?"}${query.toString()}`;
  }

  function jsonp(url) {
    return new Promise((resolve, reject) => {
      const callbackName = `linJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const script = document.createElement("script");
      const timer = window.setTimeout(() => cleanup(new Error("Apps Script JSONP request timed out.")), 60000);

      function cleanup(error, payload) {
        window.clearTimeout(timer);
        delete window[callbackName];
        script.remove();
        if (error) reject(error);
        else resolve(payload);
      }

      window[callbackName] = (payload) => cleanup(null, payload);
      script.onerror = () => cleanup(new Error("Apps Script JSONP request failed to load."));
      script.src = `${url}&callback=${encodeURIComponent(callbackName)}`;
      document.body.appendChild(script);
    });
  }

  function assertOk(payload, action) {
    if (!payload || payload.ok === false) {
      const message = payload?.error?.message || `Endpoint ${action} returned an unsuccessful response.`;
      throw new Error(message);
    }
  }

  function normalizeSmokeResult(data) {
    const counts = data.counts || getCounts(state.projects);
    return {
      rootFolderDetected: Boolean(data.rootFolderDetected || data.rootFolderName),
      rootFolderName: data.rootFolderName || data.rootName || "Detected",
      cloudFolderIndexFound: Boolean(data.cloudFolderIndexFound || data.indexFound),
      counts,
      explainabilityFilesFound: Boolean(data.explainabilityFilesFound || data.explainability?.allFound),
      auditTrailsFound: Boolean(data.auditTrailsFound || data.audit?.allFound),
      readyForPhase4B: Boolean(data.readyForPhase4B || data.ready)
    };
  }

  function normalizeProject(project) {
    const code = project.code || project.projectCode || project.project_id || project.id || "UNKNOWN";
    const status = normalizeStatus(project.status || project.expectedStatus || project.expected_status || project.healthStatus);
    return {
      code,
      projectName: project.projectName || project.name || project.project_name || project.title || code,
      type: normalizeType(project.type || project.projectType || project.project_type || inferTypeFromCode(code)),
      status,
      health: numberOr(project.health || project.healthScore || project.health_score, inferHealth(status)),
      cpi: numberOr(project.cpi || project.CPI, 0),
      spi: numberOr(project.spi || project.SPI, 0),
      bacM: numberOr(project.bacM || project.bac_m || project.bac || project.BAC, 0),
      p50EacM: numberOr(project.p50EacM || project.p50_eac_m || project.p50_eac || project.P50_EAC, 0),
      p80EacM: numberOr(project.p80EacM || project.p80_eac_m || project.p80_eac || project.P80_EAC, 0),
      posteriorRisk: numberOr(project.posteriorRisk || project.posterior_risk, 0),
      cusum: numberOr(project.cusum || project.CUSUM, 0),
      flaggedRfis: numberOr(project.flaggedRfis || project.flagged_rfis || project.rfis || project.flaggedRFIs, 0),
      conflicts: numberOr(project.conflicts || project.conflictCount || project.conflict_count, 0),
      folderId: project.folderId || project.folder_id || "",
      path: project.path || ""
    };
  }

  function getCounts(projects) {
    const counts = {
      total: projects.length,
      types: { Design: 0, Construction: 0, Combined: 0 },
      statuses: { GREEN: 0, AMBER: 0, RED: 0 },
      averageHealth: 0
    };
    let healthTotal = 0;
    projects.forEach((project) => {
      const type = normalizeType(project.type);
      const status = normalizeStatus(project.status);
      counts.types[type] = (counts.types[type] || 0) + 1;
      counts.statuses[status] = (counts.statuses[status] || 0) + 1;
      healthTotal += numberOr(project.health, 0);
    });
    counts.averageHealth = projects.length ? Math.round(healthTotal / projects.length) : 0;
    return counts;
  }

  function getSelectedProject() {
    return state.projects.find((project) => project.code === state.selectedProjectId) || state.projects[0];
  }

  function explanationText(project) {
    if (project.status === "GREEN") {
      return "Forecast, anomaly, and document signals are inside the acceptable control range.";
    }
    if (project.status === "AMBER") {
      return "One or more cost, schedule, anomaly, or document-risk signals require focused controls review.";
    }
    return "P80 EAC, posterior risk, CPI/SPI, anomaly drift, and document evidence indicate escalation-level exposure.";
  }

  function thresholdText(project) {
    if (project.status === "GREEN") return "Control signals are within Green tolerance.";
    if (project.status === "AMBER") return "One or more signals crossed Amber watch thresholds.";
    return "Forecast, anomaly, and document-risk signals crossed Red escalation thresholds.";
  }

  function consequenceText(project) {
    if (project.status === "GREEN") return "Continue monitoring and preserve current control cadence.";
    if (project.status === "AMBER") return "Focused controls review, mitigation tracking, and recovery option validation.";
    return "Potential contingency draw, recovery planning, authority-level review, and governance decision-card release.";
  }

  function recommendedAction(project) {
    if (project.status === "GREEN") return "Maintain normal reporting cadence and archive trace evidence.";
    if (project.status === "AMBER") return "Open a PM and project-controls review to validate drivers and mitigation timing.";
    return "Launch PM plus project-controls recovery review and release governance decision card for human review.";
  }

  function term(name) {
    const cleaned = name.replace(/"/g, "&quot;");
    return `<span class="def-term" data-term="${cleaned}">${escapeHtml(name)}</span>`;
  }

  function showDefinition(name) {
    const definition = lookupDefinition(name);
    if (!definition) return;
    document.getElementById("drawerTerm").textContent = definition.term;
    document.getElementById("drawerDefinition").textContent = definition.definition;
    document.getElementById("drawerFormula").textContent = definition.formula || "";
    const drawer = document.getElementById("definitionDrawer");
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
  }

  function closeDefinitionDrawer() {
    const drawer = document.getElementById("definitionDrawer");
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
  }

  function lookupDefinition(name) {
    if (DEFINITIONS[name]) return DEFINITIONS[name];
    if (name.includes("P80")) return DEFINITIONS.P80;
    if (name.includes("P50")) return DEFINITIONS.P50;
    if (name.includes("EAC")) return DEFINITIONS.EAC;
    if (name.includes("CUSUM")) return DEFINITIONS.CUSUM;
    if (name.includes("SPC")) return DEFINITIONS.SPC;
    if (name.includes("Hybrid")) return DEFINITIONS["Monte Carlo"];
    return Object.values(DEFINITIONS).find((item) => item.term.toLowerCase().includes(name.toLowerCase()));
  }

  function isApiConfigured() {
    const url = (CONFIG.appsScriptApiUrl || "").trim();
    return Boolean(url && !url.includes("PASTE_APPS_SCRIPT_WEB_APP_URL_HERE"));
  }

  function setLog(message) {
    document.getElementById("syncLog").textContent = `${new Date().toISOString()} | ${message}`;
  }

  function appendLog(message) {
    const consoleEl = document.getElementById("syncLog");
    consoleEl.textContent += `\n${new Date().toISOString()} | ${message}`;
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }

  function compactJson(value) {
    const clone = JSON.parse(JSON.stringify(value || {}));
    if (clone.projects && clone.projects.length > 2) clone.projects = `${clone.projects.length} projects`;
    return JSON.stringify(clone);
  }

  function normalizeStatus(status) {
    const clean = String(status || "GREEN").toUpperCase();
    if (clean.includes("RED")) return "RED";
    if (clean.includes("AMBER") || clean.includes("YELLOW")) return "AMBER";
    return "GREEN";
  }

  function normalizeType(type) {
    const clean = String(type || "Design").toLowerCase();
    if (clean.includes("combined") || clean.includes("cmb")) return "Combined";
    if (clean.includes("construction") || clean.includes("con")) return "Construction";
    return "Design";
  }

  function inferTypeFromCode(code) {
    if (code.includes("CMB")) return "Combined";
    if (code.includes("CON")) return "Construction";
    return "Design";
  }

  function inferHealth(status) {
    if (status === "RED") return 35;
    if (status === "AMBER") return 65;
    return 90;
  }

  function statusClassName(status) {
    const clean = normalizeStatus(status).toLowerCase();
    return `status-${clean}`;
  }

  function statusCssColor(status) {
    if (status === "RED") return "var(--red)";
    if (status === "AMBER") return "var(--amber)";
    return "var(--green)";
  }

  function numberOr(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function formatNumber(value, digits) {
    return numberOr(value, 0).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function yesNo(value) {
    return value ? "Yes" : "No";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
