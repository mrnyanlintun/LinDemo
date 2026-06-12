/* decision.js — PCEIF Decision Rules
 * Public Capital EVM Intelligence Framework, L2-v0.5-demo
 *
 * Pure functions only. No DOM access. No side effects.
 * This file implements the signal-to-action governance matrix described in
 * the PCEIF praxis (GWU Engineering Management). It is intentionally readable:
 * the transparency of the rules is the academic contribution, not their
 * algorithmic sophistication.
 *
 * All data is synthetic demonstration data only.
 */

const PCEIF_VERSION = "L2-v0.5-demo";
const DATA_BOUNDARY = "Synthetic demonstration data only; not a validated production system.";

/**
 * Count how many of the four signals are at a given status level.
 */
function countSignalsAtStatus(signals, status) {
  return ["evm", "mc", "cusum", "doc"].filter(k => signals[k].status === status).length;
}

/**
 * Determine the conflict pattern label for this project's signal combination.
 *
 * Patterns (in precedence order):
 *   "Multi-signal red-review"    — ≥2 red signals, or CUSUM breach + MC red
 *   "Anomaly without narrative"  — CUSUM breached but doc risk is green (drift unnarrated)
 *   "Forecast ahead of status"   — MC red while EVM is green or amber (forecast worse than reported)
 *   "Leading document risk"      — doc amber/red while EVM is green
 *   "Agreement — low risk"       — all signals green (or all amber, consistent)
 */
function classifyConflict(signals) {
  const redCount = countSignalsAtStatus(signals, "red");
  const cusumBreached = signals.cusum.breached;
  const mcRed = signals.mc.status === "red";
  const evmGreen = signals.evm.status === "green";
  const evmAmber = signals.evm.status === "amber";
  const docGreen = signals.doc.status === "green";
  const docElevated = signals.doc.status === "amber" || signals.doc.status === "red";

  if (redCount >= 2 || (cusumBreached && mcRed)) {
    return "Multi-signal red-review";
  }
  if (cusumBreached && docGreen) {
    return "Anomaly without narrative";
  }
  if (mcRed && (evmGreen || evmAmber)) {
    return "Forecast ahead of status";
  }
  if (docElevated && evmGreen) {
    return "Leading document risk";
  }
  return "Agreement — low risk";
}

/**
 * Derive the overall health state from signal statuses.
 * Worst signal wins, with a CUSUM breach escalating amber → red.
 */
function deriveHealthState(signals) {
  const redCount = countSignalsAtStatus(signals, "red");
  const amberCount = countSignalsAtStatus(signals, "amber");
  const cusumBreached = signals.cusum.breached;
  const mcRed = signals.mc.status === "red";

  if (redCount >= 2 || (cusumBreached && mcRed)) return "red";
  if (redCount === 1 || amberCount >= 1 || cusumBreached) return "amber";
  return "green";
}

/**
 * Main decision function — implements the PCEIF governance matrix.
 *
 * Returns:
 *   healthState            — "green" | "amber" | "red"
 *   conflictType           — conflict pattern label
 *   action                 — recommended management action (text)
 *   authority              — role(s) responsible for this decision
 *   documentation          — list of required documentation items
 *   fairnessGateRequired   — boolean; true when delivery responsibility is implicated
 */
function deriveDecision(project) {
  const { signals, fairnessSensitive } = project;
  const healthState = deriveHealthState(signals);
  const conflictType = classifyConflict(signals);
  const redCount = countSignalsAtStatus(signals, "red");
  const cusumBreached = signals.cusum.breached;
  const mcRed = signals.mc.status === "red";

  // Fairness gate is required when the project is marked fairness-sensitive AND
  // the derived state is red-review. This is a workflow step, not a metric.
  const fairnessGateRequired = fairnessSensitive && healthState === "red";

  // ── Green: all signals green ───────────────────────────────────────────────
  if (healthState === "green") {
    return {
      healthState: "green",
      conflictType,
      action: "Continue routine monitoring. No escalation required. Validate assumptions at next data date.",
      authority: "PM / Controls Lead",
      documentation: [
        "Monthly controls report — no exception items",
        "Confirm next data date and reporting cycle"
      ],
      fairnessGateRequired: false
    };
  }

  // ── Amber: single amber signal, leading doc risk, or forecast ahead ────────
  if (healthState === "amber") {
    let action = "Issue early-warning notification. Update risk register with current signal evidence.";
    let documentation = [
      "Early-warning notification (written, dated)",
      "Risk register update with signal basis",
      "Next review date confirmed in writing"
    ];

    if (conflictType === "Leading document risk") {
      action = "Issue early-warning notification. Initiate document-risk watch: track RFI/submittal resolution trajectory. EVM baseline remains acceptable; document signals are leading indicators.";
      documentation = [
        "Early-warning notification citing document-risk signal",
        "RFI/submittal log snapshot (dated)",
        "Risk register entry — leading indicator category",
        "Resolution timeline agreed with responsible party"
      ];
    }

    if (conflictType === "Forecast ahead of status") {
      action = "Investigate Monte Carlo forecast assumptions. Review schedule risk inputs and milestone confidence basis. Do not dismiss forecast divergence without documented rationale.";
      documentation = [
        "Forecast assumption review memo",
        "Schedule risk input log (dated)",
        "Written rationale if forecast divergence is accepted or rejected",
        "Risk register update"
      ];
    }

    if (conflictType === "Anomaly without narrative") {
      action = "CUSUM drift detected without supporting document evidence. Request narrative explanation from project team before next reporting cycle.";
      documentation = [
        "Written narrative from project team explaining drift signal",
        "Risk register update",
        "Early-warning notification if narrative is not received within agreed period"
      ];
    }

    return {
      healthState: "amber",
      conflictType,
      action,
      authority: "PM + Controls Lead",
      documentation,
      fairnessGateRequired: false
    };
  }

  // ── Red-review: ≥2 red signals, or CUSUM breach + MC red ──────────────────
  let action = "Initiate red-review. Request formal contractor explanation and recovery plan. Do not take formal contractual action before review is complete.";
  let documentation = [
    "Formal notice of red-review status (written, dated)",
    "Contractor explanation request (written, response period stated)",
    "Recovery plan submission requirements",
    "Program director briefing note",
    "Controls report with full signal package"
  ];

  if (fairnessGateRequired) {
    action = "Initiate red-review. Request formal contractor explanation and recovery plan. A contractor response opportunity MUST be provided and documented before any formal contractual action is taken. See fairness gate step below.";
    documentation = [
      "Formal notice of red-review status (written, dated)",
      "Contractor explanation request (written, response period stated — minimum period per contract terms)",
      "Contractor response on file before any formal action",
      "Recovery plan submission requirements",
      "Program director + contract administrator briefing note",
      "Controls report with full signal package including fairness-gate acknowledgement"
    ];
  }

  return {
    healthState: "red",
    conflictType,
    action,
    authority: fairnessGateRequired
      ? "Program Director + Contract Administrator awareness"
      : "Program Director / PMO",
    documentation,
    fairnessGateRequired
  };
}
