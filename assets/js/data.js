/* ============================================================
   Lin Project Radar — synthetic demonstration data
   ------------------------------------------------------------
   BOUNDARY: Every record below is synthetic. No real project,
   agency, employer, contractor, or vendor is referenced.
   Codes: SYN-DES-* (design), SYN-CON-* (construction),
          SYN-CMB-* (combined delivery).
   ============================================================ */

const LIN_PROJECTS = [
  {
    id: "SYN-DES-001",
    name: "Terminal Airside Utilities Design",
    sector: "design",
    health: 92,
    reportingPeriod: "2026-06",
    signals: {
      evm:   { cpi: 1.04, spi: 1.01, status: "green", dataDate: "2026-06-01" },
      mc:    { p80eacOverrunPct: 1.8, pMilestoneDelay: 0.08, iterations: 5000, status: "green" },
      cusum: { metric: "SPI", drift: 1.1, threshold: 5.0, breached: false, status: "green" },
      doc:   { score: 0.12, status: "green", source: "30_RFIs/rfi_summary.md",
               excerpt: "All open RFIs within response-time targets; no schedule-impact language detected." }
    },
    fairnessSensitive: false
  },
  {
    id: "SYN-DES-003",
    name: "Holdroom Expansion Design Package",
    sector: "design",
    health: 74,
    reportingPeriod: "2026-06",
    signals: {
      evm:   { cpi: 1.01, spi: 0.99, status: "green", dataDate: "2026-06-01" },
      mc:    { p80eacOverrunPct: 3.4, pMilestoneDelay: 0.18, iterations: 5000, status: "green" },
      cusum: { metric: "SPI", drift: 2.2, threshold: 5.0, breached: false, status: "green" },
      doc:   { score: 0.58, status: "amber", source: "13_QC_Review/qc_comments.md",
               excerpt: "Repeated structural/MEP interface comments unresolved across two QC cycles; coordination risk noted by reviewer." }
    },
    fairnessSensitive: false
  },
  {
    id: "SYN-DES-004",
    name: "Baggage Handling Design Integration",
    sector: "design",
    health: 35,
    reportingPeriod: "2026-06",
    signals: {
      evm:   { cpi: 0.86, spi: 0.84, status: "red", dataDate: "2026-06-01" },
      mc:    { p80eacOverrunPct: 11.6, pMilestoneDelay: 0.64, iterations: 5000, status: "red" },
      cusum: { metric: "CPI", drift: 4.1, threshold: 5.0, breached: false, status: "amber" },
      doc:   { score: 0.61, status: "amber", source: "09_Design_Narratives/design_commentary.md",
               excerpt: "Vendor interface criteria still pending owner decision; design team flags resequencing of integration milestones." }
    },
    fairnessSensitive: false
  },
  {
    id: "SYN-CON-002",
    name: "Garage Deck Rehabilitation CA",
    sector: "construction",
    health: 88,
    reportingPeriod: "2026-06",
    signals: {
      evm:   { cpi: 1.02, spi: 1.00, status: "green", dataDate: "2026-06-01" },
      mc:    { p80eacOverrunPct: 2.1, pMilestoneDelay: 0.10, iterations: 5000, status: "green" },
      cusum: { metric: "SPI", drift: 0.8, threshold: 5.0, breached: false, status: "green" },
      doc:   { score: 0.15, status: "green", source: "31_Submittals/submittal_notes.md",
               excerpt: "Submittal turnaround within contract durations; no resubmission loops on critical items." }
    },
    fairnessSensitive: false
  },
  {
    id: "SYN-CON-005",
    name: "Concourse MEP Fit-Out Construction Administration",
    sector: "construction",
    health: 32,
    reportingPeriod: "2026-06",
    signals: {
      evm:   { cpi: 0.83, spi: 0.79, status: "red", dataDate: "2026-06-01" },
      mc:    { p80eacOverrunPct: 14.2, pMilestoneDelay: 0.71, iterations: 5000, status: "red" },
      cusum: { metric: "SPI", drift: 6.3, threshold: 5.0, breached: true, status: "red" },
      doc:   { score: 0.74, status: "amber", source: "30_RFIs/rfi_summary.md",
               excerpt: "RFI-118 mechanical/electrical interface unresolved for 34 days; potential resequencing impact noted." }
    },
    fairnessSensitive: true
  },
  {
    id: "SYN-CON-006",
    name: "Loading Dock Reconfiguration CA",
    sector: "construction",
    health: 66,
    reportingPeriod: "2026-06",
    signals: {
      evm:   { cpi: 1.00, spi: 0.98, status: "green", dataDate: "2026-06-01" },
      mc:    { p80eacOverrunPct: 9.8, pMilestoneDelay: 0.57, iterations: 5000, status: "red" },
      cusum: { metric: "CPI", drift: 2.6, threshold: 5.0, breached: false, status: "green" },
      doc:   { score: 0.22, status: "green", source: "29_Procurement_Notes/procurement_update.md",
               excerpt: "Long-lead dock leveler delivery window widened by vendor; site work currently absorbing within float." }
    },
    fairnessSensitive: false
  },
  {
    id: "SYN-CON-007",
    name: "Apron Lighting Replacement CA",
    sector: "construction",
    health: 62,
    reportingPeriod: "2026-06",
    signals: {
      evm:   { cpi: 0.99, spi: 0.97, status: "green", dataDate: "2026-06-01" },
      mc:    { p80eacOverrunPct: 4.0, pMilestoneDelay: 0.21, iterations: 5000, status: "green" },
      cusum: { metric: "SPI", drift: 5.6, threshold: 5.0, breached: true, status: "red" },
      doc:   { score: 0.10, status: "green", source: "23_Construction_Meetings/construction_meeting_notes.md",
               excerpt: "Meeting records contain no narrative explaining the sustained SPI drift flagged by trend rules." }
    },
    fairnessSensitive: false
  },
  {
    id: "SYN-CMB-008",
    name: "Central Plant Upgrade — Combined Delivery",
    sector: "combined",
    health: 70,
    reportingPeriod: "2026-06",
    signals: {
      evm:   { cpi: 0.94, spi: 0.93, status: "amber", dataDate: "2026-06-01" },
      mc:    { p80eacOverrunPct: 5.2, pMilestoneDelay: 0.31, iterations: 5000, status: "amber" },
      cusum: { metric: "CPI", drift: 3.0, threshold: 5.0, breached: false, status: "green" },
      doc:   { score: 0.49, status: "amber", source: "29_Procurement_Notes/procurement_update.md",
               excerpt: "Chiller release date moved twice; commissioning sequence sensitivity flagged in coordination notes." }
    },
    fairnessSensitive: false
  },
  {
    id: "SYN-CMB-009",
    name: "Curbside Roadway Reconfiguration",
    sector: "combined",
    health: 68,
    reportingPeriod: "2026-06",
    signals: {
      evm:   { cpi: 0.92, spi: 0.90, status: "amber", dataDate: "2026-06-01" },
      mc:    { p80eacOverrunPct: 4.6, pMilestoneDelay: 0.24, iterations: 5000, status: "green" },
      cusum: { metric: "SPI", drift: 2.9, threshold: 5.0, breached: false, status: "green" },
      doc:   { score: 0.18, status: "green", source: "34_Field_Site_Visits/field_observation_summary.md",
               excerpt: "Field progress consistent with reported percent complete; minor MOT phasing adjustments logged." }
    },
    fairnessSensitive: false
  },
  {
    id: "SYN-CMB-010",
    name: "Access Control Modernization",
    sector: "combined",
    health: 38,
    reportingPeriod: "2026-06",
    signals: {
      evm:   { cpi: 0.95, spi: 0.91, status: "amber", dataDate: "2026-06-01" },
      mc:    { p80eacOverrunPct: 12.4, pMilestoneDelay: 0.66, iterations: 5000, status: "red" },
      cusum: { metric: "SPI", drift: 4.4, threshold: 5.0, breached: false, status: "amber" },
      doc:   { score: 0.81, status: "red", source: "31_Submittals/submittal_notes.md",
               excerpt: "Head-end security hardware submittal rejected twice; vendor firmware certification outstanding with no committed date." }
    },
    fairnessSensitive: true
  }
];
