import type { Case, ComputedWorkflowState, Workflow } from "./types.js";

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((b.getTime() - a.getTime()) / msPerDay);
}

/**
 * Find the most recent timeline event whose `event` field matches the given
 * status, or fall back to last_updated.
 */
function getStateEntryDate(caseData: Case): Date {
  // Walk timeline backwards to find when the current status was entered
  for (let i = caseData.timeline.length - 1; i >= 0; i--) {
    const evt = caseData.timeline[i];
    if (evt && evt.event === caseData.status) {
      return new Date(evt.date);
    }
  }
  return new Date(caseData.last_updated);
}

/**
 * Determine what state the case *should* be in if it has been stuck too long.
 */
function detectShouldBeIn(
  caseData: Case,
  workflow: Workflow,
  daysInState: number,
  currentStateDef: (typeof workflow.states)[number]
): string | null {
  const slaDays = currentStateDef.sla_days;
  if (slaDays == null || daysInState <= slaDays) return null;

  // The case has exceeded its SLA for this state — suggest the first allowed transition
  const nextState = currentStateDef.allowed_transitions[0];
  if (!nextState) return null;

  // For specific known mismatches, provide better recommendations
  if (
    caseData.case_type === "unauthorised_construction" &&
    caseData.status === "investigation" &&
    daysInState > 56
  ) {
    return "enforcement_notice_issued";
  }

  if (
    caseData.case_type === "listed_building_breach" &&
    caseData.status === "urgent_investigation"
  ) {
    return "temporary_stop_notice";
  }

  return nextState;
}

export function computeWorkflowState(
  caseData: Case,
  workflowDef: Workflow,
  today: Date
): ComputedWorkflowState {
  const currentStateDef = workflowDef.states.find(
    (s) => s.state === caseData.status
  );

  if (!currentStateDef) {
    // Status not found in workflow — return a best-effort response
    return {
      currentState: {
        state: caseData.status,
        label: caseData.status,
        description: "Status not found in workflow definition",
        allowed_transitions: [],
        required_actions: [],
      },
      label: caseData.status,
      requiredActions: [],
      allowedTransitions: [],
      daysInState: 0,
      shouldBeIn: null,
    };
  }

  const stateEntryDate = getStateEntryDate(caseData);
  const daysInState = daysBetween(stateEntryDate, today);
  const shouldBeIn = detectShouldBeIn(
    caseData,
    workflowDef,
    daysInState,
    currentStateDef
  );

  return {
    currentState: currentStateDef,
    label: currentStateDef.label,
    requiredActions: currentStateDef.required_actions,
    allowedTransitions: currentStateDef.allowed_transitions,
    daysInState,
    shouldBeIn,
  };
}
