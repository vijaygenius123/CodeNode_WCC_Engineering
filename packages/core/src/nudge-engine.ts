import type {
  Case,
  ComputedWorkflowState,
  Flag,
  FlagType,
  Nudge,
  NudgeUrgency,
} from "./types.js";

// ─── Planning Nudge Definitions ─────────────────────────────────────────────

interface NudgeDef {
  flagType: FlagType;
  text: string;
  urgency: NudgeUrgency;
  action: {
    label: string;
    endpoint: string;
    payload: Record<string, string>;
  };
}

const PLANNING_NUDGE_MAP: NudgeDef[] = [
  {
    flagType: "prosecution_file_overdue",
    text: "Submit prosecution file to legal NOW — criminal offence under Section 9, Listed Buildings Act 1990",
    urgency: "immediate",
    action: {
      label: "Prepare prosecution file",
      endpoint: "/api/cases/{caseId}/action",
      payload: { action: "prepare_prosecution" },
    },
  },
  {
    flagType: "heritage_irreversible_damage",
    text: "Request urgent heritage assessment — irreversible loss of historic fabric",
    urgency: "immediate",
    action: {
      label: "Commission heritage assessment",
      endpoint: "/api/cases/{caseId}/action",
      payload: { action: "commission_heritage_assessment" },
    },
  },
  {
    flagType: "non_compliance_detected",
    text: "Initiate prosecution proceedings — enforcement notice non-compliance confirmed",
    urgency: "immediate",
    action: {
      label: "Submit prosecution file",
      endpoint: "/api/cases/{caseId}/action",
      payload: { action: "prepare_prosecution" },
    },
  },
  {
    flagType: "compliance_deadline_imminent",
    text: "Prepare for non-compliance action — enforcement notice deadline imminent",
    urgency: "high",
    action: {
      label: "Start prosecution prep",
      endpoint: "/api/cases/{caseId}/action",
      payload: { action: "prosecution_prep" },
    },
  },
  {
    flagType: "enforcement_notice_delay",
    text: "Issue enforcement notice — investigation has exceeded SLA threshold",
    urgency: "high",
    action: {
      label: "Draft enforcement notice",
      endpoint: "/api/cases/{caseId}/action",
      payload: { action: "draft_enforcement_notice" },
    },
  },
  {
    flagType: "cross_referral_missing",
    text: "Refer to Environmental Health — health/noise concerns require cross-referral",
    urgency: "high",
    action: {
      label: "Create EH referral",
      endpoint: "/api/cases/{caseId}/action",
      payload: { action: "create_eh_referral" },
    },
  },
  {
    flagType: "councillor_enquiry_overdue",
    text: "Draft councillor response — enquiry approaching or past 5 working day deadline",
    urgency: "normal",
    action: {
      label: "Draft response",
      endpoint: "/api/cases/{caseId}/chat",
      payload: { message: "Draft a response to the councillor enquiry" },
    },
  },
  {
    flagType: "multiple_complaints_escalation",
    text: "Escalate for senior review — multiple complaints threshold breached",
    urgency: "normal",
    action: {
      label: "Request senior review",
      endpoint: "/api/cases/{caseId}/action",
      payload: { action: "request_senior_review" },
    },
  },
];

// ─── Street Reporting Nudge Definitions ─────────────────────────────────────

const STREET_NUDGE_MAP: NudgeDef[] = [
  {
    flagType: "injury_not_triaged",
    text: "Reclassify as Category 1 IMMEDIATELY — injury reported, 2-hour triage SLA breached",
    urgency: "immediate",
    action: {
      label: "Reclassify as Cat 1",
      endpoint: "/api/cases/{caseId}/action",
      payload: { action: "reclassify_cat1" },
    },
  },
  {
    flagType: "evidence_not_referred",
    text: "Create enforcement referral — evidence found but not referred",
    urgency: "high",
    action: {
      label: "Create enforcement referral",
      endpoint: "/api/cases/{caseId}/action",
      payload: { action: "create_enforcement_referral" },
    },
  },
  {
    flagType: "sla_breach",
    text: "Chase contractor — SLA has been breached",
    urgency: "high",
    action: {
      label: "Chase contractor",
      endpoint: "/api/cases/{caseId}/action",
      payload: { action: "chase_contractor" },
    },
  },
  {
    flagType: "member_enquiry_overdue",
    text: "Respond to member enquiry — approaching or past deadline",
    urgency: "high",
    action: {
      label: "Draft response",
      endpoint: "/api/cases/{caseId}/chat",
      payload: { message: "Draft a response to the member enquiry" },
    },
  },
  {
    flagType: "duplicate_escalation",
    text: "Escalate to area manager — duplicate report threshold exceeded",
    urgency: "normal",
    action: {
      label: "Escalate to manager",
      endpoint: "/api/cases/{caseId}/action",
      payload: { action: "escalate_to_manager" },
    },
  },
  {
    flagType: "recurrence",
    text: "Review hotspot — recurrence detected at this location",
    urgency: "normal",
    action: {
      label: "Initiate hotspot review",
      endpoint: "/api/cases/{caseId}/action",
      payload: { action: "hotspot_review" },
    },
  },
];

// ─── Engine ─────────────────────────────────────────────────────────────────

const URGENCY_ORDER: Record<NudgeUrgency, number> = {
  immediate: 0,
  high: 1,
  normal: 2,
};

export function computeNudges(
  caseData: Case,
  flags: Flag[],
  _workflow: ComputedWorkflowState | null
): Nudge[] {
  if (flags.length === 0) return [];

  const allDefs = [...PLANNING_NUDGE_MAP, ...STREET_NUDGE_MAP];
  const flagTypes = new Set(flags.map((f) => f.type));
  const nudges: Nudge[] = [];

  for (const def of allDefs) {
    if (!flagTypes.has(def.flagType)) continue;

    const endpoint = def.action.endpoint.replace(
      "{caseId}",
      caseData.case_id
    );

    nudges.push({
      text: def.text,
      urgency: def.urgency,
      actions: [
        {
          label: def.action.label,
          endpoint,
          payload: def.action.payload,
        },
      ],
    });
  }

  // Sort by urgency: immediate > high > normal
  nudges.sort(
    (a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]
  );

  return nudges;
}
