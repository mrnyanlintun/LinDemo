/* ============================================================
   Lin Project Radar — assistant.js
   Floating GUIDED HELP assistant, present on every page.
   SCRIPTED: answers come only from the curated knowledge base
   in knowledge.js (LIN_KNOWLEDGE). No LLM, no API call, no
   backend, no key. Out-of-scope questions get an honest
   "not in my script" answer pointing to the knowledge library.
   ============================================================ */

(function () {
  "use strict";

  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const SUGGESTIONS = [
    "What is PCEIF?",
    "Status of this project?",
    "Portfolio overview",
    "How does the fairness gate work?",
    "What is CUSUM?"
  ];

  /* ---------- live (still scripted) project & portfolio answers ----------
     These read the current synthetic data and decision.js output at answer
     time — no hard-coding, no LLM, no network. The phrasing is templated. */

  const SECTOR_LABEL = { design: "Design", construction: "Construction", combined: "Hybrid" };

  function projectAnswer(p) {
    const d = deriveDecision(p);
    const s = p.signals;
    return {
      title: `${p.id} — live status`,
      body: `${p.name} (${SECTOR_LABEL[p.sector] || p.sector} sector, period ${p.reportingPeriod}). ` +
        `Health ${p.health}, derived state ${d.healthState}, conflict "${d.conflictType}". ` +
        `Signals — EVM: ${s.evm.status} (CPI ${s.evm.cpi.toFixed(2)}, SPI ${s.evm.spi.toFixed(2)}); ` +
        `Monte Carlo: ${s.mc.status} (P80 EAC +${s.mc.p80eacOverrunPct.toFixed(1)}%, P(delay) ${s.mc.pMilestoneDelay.toFixed(2)}); ` +
        `CUSUM: ${s.cusum.status} (drift ${s.cusum.drift.toFixed(1)} vs threshold ${s.cusum.threshold.toFixed(1)}${s.cusum.breached ? ", BREACHED" : ""}); ` +
        `document risk: ${s.doc.status} (score ${s.doc.score.toFixed(2)}). ` +
        `Recommended action: ${d.action} Authority: ${d.authority}. ` +
        `Fairness gate: ${d.fairnessGateRequired ? "REQUIRED before any formal action" : "not required"}. ` +
        `(Computed live from the synthetic data by decision.js.)`
    };
  }

  function portfolioAnswer() {
    const counts = { "Green": 0, "Amber": 0, "Red-review": 0 };
    const reds = [], gated = [];
    LIN_PROJECTS.forEach((p) => {
      const d = deriveDecision(p);
      counts[d.healthState] = (counts[d.healthState] || 0) + 1;
      if (d.healthState === "Red-review") reds.push(p.id);
      if (d.fairnessGateRequired) gated.push(p.id);
    });
    const archived = (window.LIN_ARCHIVED || []).length;
    return {
      title: "Portfolio — live status",
      body: `${LIN_PROJECTS.length} active synthetic projects: ${counts["Green"]} Green, ${counts["Amber"]} Amber, ${counts["Red-review"]} Red-review` +
        `${archived ? ` (+${archived} archived)` : ""}. ` +
        `Red-review: ${reds.length ? reds.join(", ") : "none"}. ` +
        `Fairness gate required: ${gated.length ? gated.join(", ") : "none"}. ` +
        `(Computed live from the current synthetic data, including any projects you created or archived.)`
    };
  }

  function liveAnswer(q) {
    // explicit project code anywhere in the question
    const idMatch = q.match(/syn-[a-z]{3}-\d{3}/i);
    if (idMatch) {
      const id = idMatch[0].toUpperCase();
      const p = LIN_PROJECTS.find((x) => x.id === id);
      if (p) return projectAnswer(p);
      if ((window.LIN_ARCHIVED || []).some((x) => x.id === id)) {
        return { title: id, body: `${id} is currently archived — it is off the portfolio scope but recoverable on the Manage Projects page.` };
      }
      return { title: id, body: `I don't have a project with code ${id} in the current synthetic portfolio.` };
    }
    // "this/selected/current/open project"
    if (/\b(this|selected|current|open)\s+project\b/.test(q) || /^project status/.test(q)) {
      const id = window.LinApp && LinApp.getSelectedId();
      const p = id && LIN_PROJECTS.find((x) => x.id === id);
      if (p) return projectAnswer(p);
    }
    // overall portfolio status
    if (/portfolio|overall|overview|how many|red.?review|fairness.?gated|summary of (the )?projects|status of (the )?projects/.test(q)) {
      return portfolioAnswer();
    }
    return null;
  }

  /* ---------- scripted matching over the knowledge base ---------- */

  function answer(query) {
    const q = query.toLowerCase().trim();
    if (!q) return null;

    // 0. live project / portfolio answers (scripted templates over live data)
    const live = liveAnswer(q);
    if (live) return live;

    // 1. topic match: score by whole-word keyword hits
    const wordHit = (k) => {
      const escd = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`\\b${escd}\\b`, "i").test(q);
    };
    let best = null, bestScore = 0;
    LIN_KNOWLEDGE.topics.forEach((t) => {
      let score = 0;
      t.keywords.forEach((k) => { if (wordHit(k)) score += k.length; });
      if (score > bestScore) { best = t; bestScore = score; }
    });
    if (best) return { title: best.title, body: best.body };

    // 2. term match: query mentions a defined term
    const term = LIN_KNOWLEDGE.terms.find((t) => {
      return t.term.toLowerCase().split("/").some((part) => {
        const p = part.trim();
        return p.length >= 3 && wordHit(p);
      });
    });
    if (term) return { title: term.term, body: `${term.definition} (${term.formula})` };

    // 3. honest out-of-scope
    return {
      title: "Outside my script",
      body: "I'm a scripted guide — I only answer from this demo's knowledge library (PCEIF concepts, the five signals, the fairness gate, EVM/CUSUM/Monte Carlo definitions, and how to use each page). Try the Knowledge page for the full reference, or ask me one of the suggested questions."
    };
  }

  /* ---------- UI ---------- */

  function buildWidget() {
    const wrap = document.createElement("div");
    wrap.id = "lin-assistant";
    wrap.innerHTML =
      `<button id="la-launcher" class="la-launcher" aria-expanded="false" aria-controls="la-panel"
               title="Lin guide — scripted help assistant">
         <span aria-hidden="true">?</span><span class="la-launcher-label">Guide</span>
       </button>
       <div id="la-panel" class="la-panel" role="dialog" aria-label="Lin guided help assistant" hidden>
         <div class="la-head">
           <div>
             <strong>Lin Guide</strong>
             <span class="la-tag">Scripted help — not a live AI</span>
           </div>
           <button id="la-close" class="la-close" aria-label="Close assistant">×</button>
         </div>
         <div id="la-msgs" class="la-msgs" aria-live="polite">
           <div class="la-msg la-bot">
             <p>I answer from this demo's knowledge library, plus live (scripted) status: ask about the selected project, any SYN code, or the portfolio overview. Nothing here calls an external AI service.</p>
           </div>
         </div>
         <div class="la-suggest">${SUGGESTIONS.map((s) => `<button class="la-chip">${esc(s)}</button>`).join("")}</div>
         <form id="la-form" class="la-form">
           <input id="la-input" type="text" placeholder="Ask about the demo…" aria-label="Question for the scripted assistant" maxlength="200" autocomplete="off" />
           <button type="submit" class="btn primary la-send">Ask</button>
         </form>
       </div>`;
    document.body.appendChild(wrap);

    const launcher = document.getElementById("la-launcher");
    const panel = document.getElementById("la-panel");
    const msgs = document.getElementById("la-msgs");
    const form = document.getElementById("la-form");
    const input = document.getElementById("la-input");

    function toggle(open) {
      const show = open !== undefined ? open : panel.hidden;
      panel.hidden = !show;
      launcher.setAttribute("aria-expanded", String(show));
      if (show) input.focus();
    }

    launcher.addEventListener("click", () => toggle());
    document.getElementById("la-close").addEventListener("click", () => toggle(false));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) toggle(false); });

    function ask(text) {
      if (!text.trim()) return;
      msgs.insertAdjacentHTML("beforeend",
        `<div class="la-msg la-user"><p>${esc(text)}</p></div>`);
      const a = answer(text);
      msgs.insertAdjacentHTML("beforeend",
        `<div class="la-msg la-bot"><p><strong>${esc(a.title)}.</strong> ${esc(a.body)}</p></div>`);
      msgs.scrollTop = msgs.scrollHeight;
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      ask(input.value);
      input.value = "";
    });

    wrap.querySelectorAll(".la-chip").forEach((c) =>
      c.addEventListener("click", () => ask(c.textContent)));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildWidget);
  } else {
    buildWidget();
  }
})();
