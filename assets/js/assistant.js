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
    "How does the fairness gate work?",
    "What does Module 05 (ABM) do?",
    "What is CUSUM?",
    "How do I create a project?"
  ];

  /* ---------- scripted matching over the knowledge base ---------- */

  function answer(query) {
    const q = query.toLowerCase().trim();
    if (!q) return null;

    // 1. topic match: score by keyword hits
    let best = null, bestScore = 0;
    LIN_KNOWLEDGE.topics.forEach((t) => {
      let score = 0;
      t.keywords.forEach((k) => { if (q.includes(k)) score += k.length; });
      if (score > bestScore) { best = t; bestScore = score; }
    });
    if (best) return { title: best.title, body: best.body };

    // 2. term match: query mentions a defined term
    const term = LIN_KNOWLEDGE.terms.find((t) => {
      return t.term.toLowerCase().split("/").some((part) => {
        const p = part.trim();
        return p.length >= 3 && q.includes(p);
      });
    });
    if (term) return { title: term.term, body: `${term.definition} (${term.formula})` };

    // 3. honest out-of-scope
    return {
      title: "Outside my script",
      body: "I'm a scripted guide — I only answer from this demo's knowledge library (PCEIF concepts, the five modules, the fairness gate, EVM/CUSUM/Monte Carlo definitions, and how to use each page). Try the Knowledge page for the full reference, or ask me one of the suggested questions."
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
             <p>I answer from this demo's knowledge library: PCEIF concepts, the five modules, the fairness gate, method definitions, and how to use each page. Nothing here calls an external AI service.</p>
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
