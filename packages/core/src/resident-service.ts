import type { Case, ResidentStatusResponse } from "./types.js";
import { getCaseDomain } from "./types.js";

// ─── Status Translations ────────────────────────────────────────────────────

const PLANNING_STATUS_MAP: Record<
  string,
  { display: string; next: string }
> = {
  complaint_received: {
    display: "We have received your report about possible planning irregularities",
    next: "A planning officer will visit the site to assess the situation. You will receive an update within 8 weeks of your report.",
  },
  site_visit_scheduled: {
    display: "We have scheduled a visit to assess the matter you reported",
    next: "A planning officer will visit the site shortly. We will update you on our findings.",
  },
  investigation: {
    display: "We are investigating the matter you reported",
    next: "We are gathering information and assessing the situation. We will contact you when we have completed our assessment.",
  },
  urgent_investigation: {
    display: "We are actively investigating the matter you reported as a priority",
    next: "This matter is being treated with urgency. We will provide an update as soon as possible.",
  },
  pcn_issued: {
    display: "We have taken a formal step to gather more information about this matter",
    next: "We have requested information from the relevant party. We will update you on the outcome.",
  },
  enforcement_notice_issued: {
    display: "We have taken formal action to address the breach",
    next: "We have issued a formal notice requiring action. We will monitor compliance and update you on progress.",
  },
  listed_building_enforcement_notice_issued: {
    display: "We have taken formal action to protect the heritage of this building",
    next: "A formal notice has been served. We will monitor the situation and keep you informed.",
  },
  temporary_stop_notice: {
    display: "We have taken urgent action to stop the works you reported",
    next: "An urgent notice has been served requiring all works to cease. We continue to monitor the situation.",
  },
  compliance_monitoring: {
    display: "We are monitoring compliance with our enforcement action",
    next: "We are checking that the required actions have been taken. We will update you on the outcome.",
  },
  monitoring: {
    display: "We are monitoring the situation",
    next: "We are carrying out regular checks. We will let you know when the matter is resolved.",
  },
  appeal_lodged: {
    display: "The matter is currently subject to a formal review process",
    next: "An independent review is underway. This process can take several months. We will notify you of the outcome.",
  },
  prosecution: {
    display: "We are taking further formal action on this matter",
    next: "The matter is being progressed through formal channels. We will update you when there is an outcome.",
  },
  resolved: {
    display: "This case has been resolved",
    next: "No further action is required. Thank you for your report — it helped us take action.",
  },
  no_further_action: {
    display: "We have assessed this matter and concluded our investigation",
    next: "After careful assessment, no further action is required at this time. If you have concerns, please contact us.",
  },
};

const STREET_STATUS_MAP: Record<
  string,
  { display: string; next: string }
> = {
  report_received: {
    display: "We have received your report and it is being assessed",
    next: "Your report will be reviewed and assigned to the appropriate team. We aim to address this as quickly as possible.",
  },
  assigned: {
    display: "Your report has been assigned to our service team",
    next: "Our team is scheduled to attend. You will be notified when the work is complete.",
  },
  inspection_scheduled: {
    display: "We have scheduled an inspection",
    next: "An officer will visit the site to assess the situation. We will update you on the findings.",
  },
  emergency_response: {
    display: "We are responding to this as an emergency",
    next: "Our team is attending urgently. The area will be made safe as a priority.",
  },
  under_review: {
    display: "Your report is under review",
    next: "We are assessing the best course of action. We will provide an update soon.",
  },
  cleared: {
    display: "The issue you reported has been cleared",
    next: "The work has been completed. If the problem returns, please report it again.",
  },
  awaiting_evidence: {
    display: "We are gathering information about this matter",
    next: "We are collecting additional information to help us resolve this issue.",
  },
  notice_served: {
    display: "We have taken formal action on this matter",
    next: "A formal notice has been issued. We are monitoring compliance.",
  },
  pending_decision: {
    display: "We are reviewing the evidence and considering next steps",
    next: "A decision on further action will be made shortly.",
  },
  escalated: {
    display: "Your report has been escalated for senior review",
    next: "A senior officer is reviewing this matter to ensure it is resolved promptly.",
  },
  closed: {
    display: "This report has been resolved and closed",
    next: "Thank you for your report. If the issue recurs, please submit a new report.",
  },
};

// ─── Case Type Display Names ────────────────────────────────────────────────

const CASE_TYPE_DISPLAY: Record<string, string> = {
  fly_tipping: "Fly-tipping report",
  pothole: "Road defect report",
  graffiti: "Graffiti report",
  street_lighting: "Street lighting report",
  noise_complaint: "Noise concern",
  rough_sleeping: "Welfare concern",
  commercial_waste: "Waste concern",
  abandoned_vehicle: "Abandoned vehicle report",
  overflowing_bin: "Litter bin report",
  unauthorised_construction: "Planning concern",
  listed_building_breach: "Heritage concern",
  change_of_use: "Planning concern",
  breach_of_conditions: "Planning concern",
};

// ─── Timeline Sanitisation ──────────────────────────────────────────────────

const SENSITIVE_KEYWORDS = [
  "prosecution",
  "criminal",
  "section 9",
  "legal",
  "solicitor",
  "enforcement notice",
  "stop notice",
  "contravention",
  "pcn",
  "breach of condition notice",
  "penalty",
  "fpn",
  "police",
  "offence",
  "magistrate",
  "injunction",
  "appeal",
];

const SAFE_EVENT_DESCRIPTIONS: Record<string, string> = {
  report_received: "Your report was received",
  complaint_received: "Your report was received",
  auto_assigned: "Report assigned to our team",
  site_visit_scheduled: "Site visit scheduled",
  site_visit_completed: "Site visit completed — matter assessed",
  inspection_completed: "Inspection completed",
  cleared: "Issue cleared",
  closed: "Case resolved",
  resolved: "Matter resolved",
  duplicate_linked: "Additional reports linked to your case",
  contractor_update: "Update from our service team",
  outreach_visit: "Our team visited the area",
  follow_up_visit: "Follow-up visit conducted",
  under_review: "Matter under review",
};

function sanitiseTimelineEvent(
  event: { date: string; event: string; note: string }
): { date: string; description: string } | null {
  // Filter out sensitive events entirely
  const eventLower = event.event.toLowerCase();
  const noteLower = event.note.toLowerCase();

  if (
    SENSITIVE_KEYWORDS.some(
      (k) => eventLower.includes(k) || noteLower.includes(k)
    )
  ) {
    // Use a safe description if available, otherwise skip
    const safe = SAFE_EVENT_DESCRIPTIONS[event.event];
    if (safe) {
      return { date: event.date, description: safe };
    }
    // Show a generic "progress update" for sensitive events
    return { date: event.date, description: "Progress update on your report" };
  }

  return {
    date: event.date,
    description:
      SAFE_EVENT_DESCRIPTIONS[event.event] ??
      "Update on your report",
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function getResidentStatus(
  caseData: Case
): ResidentStatusResponse {
  const domain = getCaseDomain(caseData.case_type);
  const statusMap =
    domain === "planning" ? PLANNING_STATUS_MAP : STREET_STATUS_MAP;

  const statusInfo = statusMap[caseData.status] ?? {
    display: "Your report is being processed",
    next: "We will provide an update as soon as possible.",
  };

  const simplifiedTimeline = caseData.timeline
    .map(sanitiseTimelineEvent)
    .filter((e): e is { date: string; description: string } => e !== null);

  return {
    reference: caseData.reporter.reference,
    case_type_display: CASE_TYPE_DISPLAY[caseData.case_type] ?? "Report",
    location_display: `${caseData.location.street}, ${caseData.location.postcode}`,
    status_display: statusInfo.display,
    what_happens_next: statusInfo.next,
    last_updated: caseData.last_updated,
    simplified_timeline: simplifiedTimeline,
  };
}
