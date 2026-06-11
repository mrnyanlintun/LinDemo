(() => {
  "use strict";

  const CONFIG = (typeof LIN_CONFIG !== "undefined" ? LIN_CONFIG : (typeof window !== "undefined" && window.LIN_CONFIG)) || {};
  const API_URL = (CONFIG.appsScriptApiUrl || "").trim();
  const ROOT_ID = CONFIG.driveRootFolderId || "";

  function isConfigured() {
    return Boolean(API_URL && !API_URL.includes("PASTE_APPS_SCRIPT_WEB_APP_URL_HERE"));
  }

  function buildUrl(action, params) {
    const q = new URLSearchParams({ action, rootId: ROOT_ID, _: String(Date.now()) });
    Object.entries(params || {}).forEach(([k, v]) => q.set(k, v));
    return `${API_URL}${API_URL.includes("?") ? "&" : "?"}${q}`;
  }

  function apiFetch(action, params) {
    return fetch(buildUrl(action, params), { method: "GET", mode: "cors", cache: "no-store" })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status} on ${action}`);
        return r.json();
      })
      .then(data => {
        if (data && data.ok === false) {
          throw new Error(data.error?.message || `${action} returned ok=false`);
        }
        return data;
      });
  }

  // Derive the three signal values from numeric project fields.
  function deriveSignals(cpi, spi, cusum, rfis, conflicts) {
    const evmSignal = cpi < 0.90 || spi < 0.85 ? "RED"
      : cpi < 0.98 || spi < 0.95 ? "AMBER"
      : "GREEN";
    const anomalySignal = cusum >= 1.5 ? "RED"
      : cusum >= 0.70 ? "AMBER"
      : "GREEN";
    const docSignal = rfis >= 8 || conflicts >= 3 ? "RED"
      : rfis >= 4 || conflicts >= 1 ? "AMBER"
      : "GREEN";
    return { evmSignal, anomalySignal, docSignal };
  }

  // Map Apps Script project object → shape expected by index.html renderDetail / renderGovernance.
  function adaptProject(raw) {
    const status = String(raw.status || "GREEN").toUpperCase();
    const cpi = Number(raw.cpi) || 1;
    const spi = Number(raw.spi) || 1;
    const cusum = Number(raw.cusum) || 0;
    const rfis = Number(raw.flaggedRfis) || 0;
    const conflicts = Number(raw.conflicts) || 0;
    const posterior = Number(raw.posteriorRisk) || 0;
    const p80 = Number(raw.p80EacM) || 0;
    const eac = Number(raw.p50EacM) || 0;
    const bac = Number(raw.bacM) || 0;

    // Estimate finish-slip days from SPI variance over a notional 120-day horizon.
    const slip = Math.round(Math.max(0, (1 - spi) * 120));

    // Estimate prior risk as one Bayesian step back from the reported posterior.
    const prior = Math.round(Math.max(0.05, posterior * 0.8) * 100) / 100;

    const typeStr = String(raw.type || "").toLowerCase();
    const kind = typeStr.includes("combined") ? "COMBINED"
      : typeStr.includes("construction") ? "CONSTRUCTION"
      : "DESIGN";

    const { evmSignal, anomalySignal, docSignal } = deriveSignals(cpi, spi, cusum, rfis, conflicts);

    // Governance recommendation text keyed on status.
    const recommendation =
      status === "RED" ? "Escalate recovery review — human authority required" :
      status === "AMBER" ? "Review and flag for human attention" :
      "Continue routine monitoring — no escalation";

    // Narrative shown in the deep-dive hero panel.
    const narrative =
      status === "RED"
        ? `${raw.projectName} — escalation-level condition. CPI ${cpi.toFixed(2)}, SPI ${spi.toFixed(2)}, ` +
          `posterior risk ${Math.round(posterior * 100)}%, CUSUM drift ${cusum.toFixed(2)}. ` +
          `Advisory only. Human authority required before action.`
        : status === "AMBER"
        ? `${raw.projectName} — attention required. CPI ${cpi.toFixed(2)}, SPI ${spi.toFixed(2)}, ` +
          `posterior risk ${Math.round(posterior * 100)}%. PM and controls review recommended before ` +
          `next reporting cycle. Advisory only. Human authority required before action.`
        : `${raw.projectName} — stable. CPI ${cpi.toFixed(2)}, SPI ${spi.toFixed(2)}, ` +
          `posterior risk ${Math.round(posterior * 100)}%. All signals within normal monitoring tolerance.`;

    return {
      code: raw.code,
      kind,
      title: raw.projectName,
      agency: `${kind} — live Apps Script data`,
      folder: raw.path || "",
      status,
      cls: status.toLowerCase(),
      health: Number(raw.health) || 0,
      cpi,
      spi,
      eac,
      p80,
      bac,
      slip,
      rfis,
      conflicts,
      records: 0,
      cycle: 1,
      prior,
      posterior,
      cusum,
      evmSignal,
      anomalySignal,
      docSignal,
      desc: `${raw.projectName} — ${status} status from live Apps Script data.`,
      narrative,
      recommendation,
      docs: []
    };
  }

  // Render config panel elements if they exist in this version of index.html.
  function renderConfigPanel() {
    const transport = CONFIG.transport || "fetch";
    [
      ["configTransport", transport],
      ["configApiUrl", isConfigured() ? API_URL : "Paste deployed Apps Script URL in config.js"],
      ["configRootId", ROOT_ID || "Not set"]
    ].forEach(([id, text]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    });
  }

  // Fetch the full portfolio, replace the inline projects array, and re-render.
  function loadLivePortfolio() {
    if (!isConfigured()) return;
    apiFetch("portfolio")
      .then(data => {
        const rawList = data?.data?.projects;
        if (!Array.isArray(rawList) || !rawList.length) return;
        const adapted = rawList.map(adaptProject);
        window.projects = adapted;
        window.selected = adapted[0];
        if (typeof window.renderProjects === "function") window.renderProjects();
        if (typeof window.renderDetail === "function") window.renderDetail(adapted[0]);
        if (typeof window.renderGovernance === "function") window.renderGovernance(adapted[0]);
        if (typeof window.renderDrivePanel === "function") window.renderDrivePanel();
        const pill = document.getElementById("portfolioSyncPill");
        if (pill) pill.textContent = "Live cloud-folder bridge connected";
        if (typeof window.toast === "function") window.toast("Live portfolio loaded from Apps Script.");
      })
      .catch(err => {
        console.warn("Lin live portfolio fetch failed, using sample data:", err.message);
      });
  }

  // Fetch a single project by code and return an adapted object.
  function loadLiveProject(code) {
    return apiFetch("project", { id: code }).then(data => {
      const raw = data?.data?.project;
      if (!raw) throw new Error("No project object in response");
      return adaptProject(raw);
    });
  }

  // Wrap the inline openProject so deep-dive and governance use live data.
  function wrapOpenProject() {
    const originalOpenProject = window.openProject;

    window.openProject = function (code) {
      if (!isConfigured()) {
        if (typeof originalOpenProject === "function") originalOpenProject(code);
        return;
      }

      // Render immediately from whatever is already in the projects array.
      const localProject = (window.projects || []).find(p => p.code === code);
      if (localProject) {
        window.selected = localProject;
        if (typeof window.renderDetail === "function") window.renderDetail(localProject);
        if (typeof window.renderProjects === "function") window.renderProjects();
        if (typeof window.renderGovernance === "function") window.renderGovernance(localProject);
        if (typeof window.showPage === "function") window.showPage("detail");
        if (typeof window.toast === "function") window.toast(`Loading live data for ${code}…`);
      }

      // Fetch live detail and re-render with the authoritative data.
      loadLiveProject(code)
        .then(p => {
          window.selected = p;
          const idx = (window.projects || []).findIndex(x => x.code === p.code);
          if (idx >= 0) window.projects[idx] = p;
          if (typeof window.renderDetail === "function") window.renderDetail(p);
          if (typeof window.renderGovernance === "function") window.renderGovernance(p);
          if (typeof window.renderProjects === "function") window.renderProjects();
          if (!localProject && typeof window.showPage === "function") window.showPage("detail");
          if (typeof window.toast === "function") window.toast(`Live data loaded: ${p.code}.`);
        })
        .catch(err => {
          console.warn(`Lin live project fetch failed for ${code}:`, err.message);
          if (!localProject && typeof originalOpenProject === "function") originalOpenProject(code);
        });
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderConfigPanel();
    wrapOpenProject();
    loadLivePortfolio();
  });

})();
