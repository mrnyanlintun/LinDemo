/* data.js — Synthetic project roster for Lin Project Radar
 * PCEIF L2-v0.5-demo
 * ALL data is synthetic. No real project, agency, contractor, or vendor names.
 */

const LIN_PROJECTS = [
  // ── DESIGN sector ──────────────────────────────────────────────────────────
  {
    id: "SYN-DES-001",
    name: "Terminal Airside Utilities Design",
    sector: "design",
    health: 90,
    reportingPeriod: "2026-06",
    fairnessSensitive: false,
    signals: {
      evm:   { cpi: 1.04, spi: 1.01, status: "green", dataDate: "2026-06-01" },
      mc:    { p80eacOverrunPct: -2.1, pMilestoneDelay: 0.08, iterations: 5000, status: "green" },
      cusum: { metric: "SPI", drift: 0.8, threshold: 5.0, breached: false, status: "green" },
      doc:   { score: 0.12, status: "green", source: "05_RFIs/rfi_log.md",
               excerpt: "No unresolved RFIs. All submittals returned within review window. Procurement aligned to schedule." }
    }
    // Conflict pattern (a): all green
  },
  {
    id: "SYN-DES-002",
    name: "Laboratory Renovation Design",
    sector: "design",
    health: 64,
    reportingPeriod: "2026-06",
    fairnessSensitive: false,
    signals: {
      evm:   { cpi: 0.95, spi: 0.92, status: "amber", dataDate: "2026-06-01" },
      mc:    { p80eacOverrunPct: 6.8, pMilestoneDelay: 0.41, iterations: 5000, status: "amber" },
      cusum: { metric: "SPI", drift: 2.1, threshold: 5.0, breached: false, status: "green" },
      doc:   { score: 0.38, status: "amber", source: "05_RFIs/rfi_log.md",
               excerpt: "Five RFIs open > 14 days related to MEP coordination. Design freeze milestone at risk." }
    }
    // Conflict pattern (b) partial: EVM amber, doc amber — single-amber state
  },
  {
    id: "SYN-DES-003",
    name: "Central Plant Controls Design",
    sector: "design",
    health: 94,
    reportingPeriod: "2026-06",
    fairnessSensitive: false,
    signals: {
      evm:   { cpi: 1.03, spi: 1.04, status: "green", dataDate: "2026-06-01" },
      mc:    { p80eacOverrunPct: -1.4, pMilestoneDelay: 0.06, iterations: 5000, status: "green" },
      cusum: { metric: "SPI", drift: 1.0, threshold: 5.0, breached: false, status: "green" },
      doc:   { score: 0.51, status: "amber", source: "05_RFIs/rfi_log.md",
               excerpt: "Controls specification RFI cluster (4 items) flagged. EVM performance remains within baseline; document risk is a leading indicator." }
    }
    // Conflict pattern (b): leading document risk — EVM green, doc amber
  },
  {
    id: "SYN-DES-004",
    name: "Secure Communications Backbone Design",
    sector: "design",
    health: 40,
    reportingPeriod: "2026-06",
    fairnessSensitive: true,
    signals: {
      evm:   { cpi: 0.82, spi: 0.78, status: "red", dataDate: "2026-06-01" },
      mc:    { p80eacOverrunPct: 18.6, pMilestoneDelay: 0.79, iterations: 5000, status: "red" },
      cusum: { metric: "SPI", drift: 5.8, threshold: 5.0, breached: true, status: "red" },
      doc:   { score: 0.71, status: "red", source: "05_RFIs/rfi_log.md",
               excerpt: "13 open RFIs including 3 disputed scope items with delivery responsibility implications. Formal contractor response pending." }
    }
    // Conflict pattern (d): full red-review, fairness-sensitive
  },

  // ── CONSTRUCTION sector ────────────────────────────────────────────────────
  {
    id: "SYN-CON-005",
    name: "Concourse MEP Fit-Out Construction Administration",
    sector: "construction",
    health: 32,
    reportingPeriod: "2026-06",
    fairnessSensitive: true,
    signals: {
      evm:   { cpi: 0.83, spi: 0.79, status: "red", dataDate: "2026-06-01" },
      mc:    { p80eacOverrunPct: 14.2, pMilestoneDelay: 0.71, iterations: 5000, status: "red" },
      cusum: { metric: "SPI", drift: 6.3, threshold: 5.0, breached: true, status: "red" },
      doc:   { score: 0.74, status: "amber", source: "30_RFIs/rfi_summary.md",
               excerpt: "RFI-118 mechanical/electrical interface unresolved for 34 days; potential resequencing impact noted." }
    }
    // Conflict pattern (d): multi-signal red-review, fairness-sensitive
  },
  {
    id: "SYN-CON-006",
    name: "Facility Security Integration Construction Administration",
    sector: "construction",
    health: 62,
    reportingPeriod: "2026-06",
    fairnessSensitive: false,
    signals: {
      evm:   { cpi: 0.92, spi: 0.92, status: "amber", dataDate: "2026-06-01" },
      mc:    { p80eacOverrunPct: 9.4, pMilestoneDelay: 0.52, iterations: 5000, status: "red" },
      cusum: { metric: "SPI", drift: 2.7, threshold: 5.0, breached: false, status: "green" },
      doc:   { score: 0.31, status: "amber", source: "30_RFIs/rfi_log.md",
               excerpt: "Five open submittals overdue; forecast model sensitivity to procurement delay drives P80 exposure." }
    }
    // Conflict pattern (c): forecast ahead of status — EVM amber, MC red
  },
  {
    id: "SYN-CON-007",
    name: "Emergency Power Resilience Construction Administration",
    sector: "construction",
    health: 92,
    reportingPeriod: "2026-06",
    fairnessSensitive: false,
    signals: {
      evm:   { cpi: 1.04, spi: 1.04, status: "green", dataDate: "2026-06-01" },
      mc:    { p80eacOverrunPct: -1.8, pMilestoneDelay: 0.07, iterations: 5000, status: "green" },
      cusum: { metric: "SPI", drift: 0.9, threshold: 5.0, breached: false, status: "green" },
      doc:   { score: 0.09, status: "green", source: "30_RFIs/rfi_log.md",
               excerpt: "One open RFI, resolved within SLA. All submittals current. No anomalies detected." }
    }
    // Conflict pattern (a): all green
  },

  // ── COMBINED sector ────────────────────────────────────────────────────────
  {
    id: "SYN-CMB-009",
    name: "Curbside Roadway Reconfiguration",
    sector: "combined",
    health: 68,
    reportingPeriod: "2026-06",
    fairnessSensitive: false,
    signals: {
      evm:   { cpi: 0.92, spi: 0.90, status: "amber", dataDate: "2026-06-01" },
      mc:    { p80eacOverrunPct: 7.2, pMilestoneDelay: 0.44, iterations: 5000, status: "amber" },
      cusum: { metric: "SPI", drift: 2.6, threshold: 5.0, breached: false, status: "green" },
      doc:   { score: 0.29, status: "amber", source: "30_RFIs/rfi_log.md",
               excerpt: "Utility coordination RFIs pending owner response. Amber state consistent across EVM and forecast." }
    }
  },
  {
    id: "SYN-CMB-010",
    name: "Access Control Modernization",
    sector: "combined",
    health: 32,
    reportingPeriod: "2026-06",
    fairnessSensitive: true,
    signals: {
      evm:   { cpi: 0.82, spi: 0.81, status: "red", dataDate: "2026-06-01" },
      mc:    { p80eacOverrunPct: 21.9, pMilestoneDelay: 0.83, iterations: 5000, status: "red" },
      cusum: { metric: "SPI", drift: 6.0, threshold: 5.0, breached: true, status: "red" },
      doc:   { score: 0.77, status: "red", source: "30_RFIs/rfi_log.md",
               excerpt: "13 disputed RFIs including scope-change claims with contested delivery responsibility. Escalation to program director pending." }
    }
    // Conflict pattern (d): full red-review, fairness-sensitive
  },
  {
    id: "SYN-CMB-012",
    name: "Passenger Processing Hall Renewal",
    sector: "combined",
    health: 92,
    reportingPeriod: "2026-06",
    fairnessSensitive: false,
    signals: {
      evm:   { cpi: 1.03, spi: 1.00, status: "green", dataDate: "2026-06-01" },
      mc:    { p80eacOverrunPct: 0.3, pMilestoneDelay: 0.11, iterations: 5000, status: "green" },
      cusum: { metric: "SPI", drift: 1.2, threshold: 5.0, breached: false, status: "green" },
      doc:   { score: 0.14, status: "green", source: "30_RFIs/rfi_log.md",
               excerpt: "Minimal open RFIs. Document activity consistent with project maturity. No anomalies." }
    }
    // Conflict pattern (a): all green
  }
];
