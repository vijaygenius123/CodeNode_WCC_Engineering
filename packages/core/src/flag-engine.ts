import type { Case, Flag, FlagType, Policy } from "./types.js";
import { getCaseDomain } from "./types.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((b.getTime() - a.getTime()) / msPerDay);
}

function hoursBetween(a: Date, b: Date): number {
  const msPerHour = 1000 * 60 * 60;
  return Math.floor((b.getTime() - a.getTime()) / msPerHour);
}

function workingDaysBetween(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  current.setDate(current.getDate() + 1); // start from next day
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

function findTimelineEvent(
  caseData: Case,
  eventName: string
): { date: string; note: string } | undefined {
  return caseData.timeline.find((e) => e.event === eventName);
}

function hasTimelineEvent(caseData: Case, eventName: string): boolean {
  return caseData.timeline.some((e) => e.event === eventName);
}

function timelineNoteContains(caseData: Case, ...keywords: string[]): boolean {
  const lowerKeywords = keywords.map((k) => k.toLowerCase());
  return caseData.timeline.some((e) => {
    const noteLower = e.note.toLowerCase();
    return lowerKeywords.some((k) => noteLower.includes(k));
  });
}

function createFlag(
  severity: Flag["severity"],
  type: FlagType,
  message: string,
  policyRef: string,
  daysOverdue: number
): Flag {
  return {
    severity,
    type,
    message,
    policy_ref: policyRef,
    days_overdue: Math.max(0, daysOverdue),
  };
}

// ─── Planning Flags ─────────────────────────────────────────────────────────

function checkProsecutionFileOverdue(caseData: Case, today: Date): Flag | null {
  if (caseData.case_type !== "listed_building_breach") return null;

  // Check if criminal offence was confirmed (site visit noting criminal offence / Section 9)
  const siteVisit = caseData.timeline.find(
    (e) =>
      e.event === "site_visit_completed" &&
      (e.note.toLowerCase().includes("criminal offence") ||
        e.note.toLowerCase().includes("section 9"))
  );
  if (!siteVisit) return null;

  // Check if prosecution file has been submitted
  if (hasTimelineEvent(caseData, "prosecution_file_submitted")) return null;

  const offenceDate = new Date(siteVisit.date);
  const calendarDays = daysBetween(offenceDate, today);
  const workingDays = workingDaysBetween(offenceDate, today);
  const overdue = workingDays - 14;

  if (workingDays >= 14) {
    return createFlag(
      "critical",
      "prosecution_file_overdue",
      `OVERDUE: Prosecution file NOT submitted to legal — ${workingDays} working days since criminal offence confirmed (14 working day deadline). Section 9, Planning (Listed Buildings and Conservation Areas) Act 1990.`,
      "POL-PE-002",
      overdue
    );
  }

  if (calendarDays >= 7) {
    // Flag as critical once a week has passed — prosecution file should be in preparation
    return createFlag(
      "critical",
      "prosecution_file_overdue",
      `Prosecution file NOT submitted to legal — ${calendarDays} days since criminal offence confirmed (14 working day deadline). Section 9, Planning (Listed Buildings and Conservation Areas) Act 1990.`,
      "POL-PE-002",
      0
    );
  }

  return null;
}

function checkEnforcementNoticeDelay(
  caseData: Case,
  today: Date
): Flag | null {
  if (
    caseData.case_type !== "unauthorised_construction" &&
    caseData.case_type !== "change_of_use"
  ) {
    return null;
  }

  if (caseData.status !== "investigation") return null;
  if (hasTimelineEvent(caseData, "enforcement_notice_issued")) return null;

  // Find when investigation started (site visit completed)
  const siteVisit = findTimelineEvent(caseData, "site_visit_completed");
  if (!siteVisit) return null;

  const investigationStart = new Date(siteVisit.date);
  const daysInInvestigation = daysBetween(investigationStart, today);

  if (daysInInvestigation > 56) {
    return createFlag(
      "high",
      "enforcement_notice_delay",
      `Investigation open ${daysInInvestigation} days without enforcement notice issued (56-day / 8-week threshold).`,
      "POL-PE-001",
      daysInInvestigation - 56
    );
  }

  if (daysInInvestigation > 28) {
    return createFlag(
      "standard",
      "enforcement_notice_delay",
      `Investigation open ${daysInInvestigation} days — approaching 56-day enforcement notice threshold.`,
      "POL-PE-001",
      0
    );
  }

  return null;
}

function checkComplianceDeadlineImminent(
  caseData: Case,
  today: Date
): Flag | null {
  // Find enforcement notice issued event
  const enEvent = caseData.timeline.find(
    (e) =>
      e.event === "enforcement_notice_issued" ||
      e.event === "listed_building_enforcement_notice_issued"
  );
  if (!enEvent) return null;

  // Default 28-day compliance period
  const enDate = new Date(enEvent.date);
  const deadline = new Date(enDate);
  deadline.setDate(deadline.getDate() + 28);

  const daysUntilDeadline = daysBetween(today, deadline);

  if (daysUntilDeadline <= 3 && daysUntilDeadline >= 0) {
    return createFlag(
      "critical",
      "compliance_deadline_imminent",
      `Enforcement notice compliance deadline in ${daysUntilDeadline} day${daysUntilDeadline !== 1 ? "s" : ""} (${deadline.toISOString().split("T")[0]}).`,
      "POL-PE-003",
      0
    );
  }

  if (daysUntilDeadline < 0) {
    return createFlag(
      "critical",
      "compliance_deadline_imminent",
      `Enforcement notice compliance deadline PASSED ${Math.abs(daysUntilDeadline)} day(s) ago.`,
      "POL-PE-003",
      Math.abs(daysUntilDeadline)
    );
  }

  return null;
}

function checkNonComplianceDetected(caseData: Case): Flag | null {
  // Check for monitoring visit confirming continued breach after enforcement notice
  const hasEN =
    hasTimelineEvent(caseData, "enforcement_notice_issued") ||
    hasTimelineEvent(caseData, "listed_building_enforcement_notice_issued");
  if (!hasEN) return null;

  const monitoringVisit = caseData.timeline.find(
    (e) =>
      e.event === "monitoring_visit" &&
      (e.note.toLowerCase().includes("still operating") ||
        e.note.toLowerCase().includes("non-compliance") ||
        e.note.toLowerCase().includes("breach continuing") ||
        e.note.toLowerCase().includes("still in breach"))
  );

  if (monitoringVisit) {
    return createFlag(
      "critical",
      "non_compliance_detected",
      `Monitoring visit confirmed NON-COMPLIANCE with enforcement notice. Breach continuing.`,
      "POL-PE-003",
      0
    );
  }

  return null;
}

function checkHeritageIrreversibleDamage(caseData: Case): Flag | null {
  if (!caseData.listed_building) return null;

  const damageKeywords = [
    "irreversible",
    "destroyed",
    "removed",
    "stripped",
    "demolished",
    "hacked off",
    "being removed",
  ];

  const hasDamage = caseData.timeline.some((e) => {
    const noteLower = e.note.toLowerCase();
    return damageKeywords.some((k) => noteLower.includes(k));
  });

  if (hasDamage) {
    return createFlag(
      "critical",
      "heritage_irreversible_damage",
      `Listed building (${caseData.listed_grade ?? "Grade unknown"}) — works causing IRREVERSIBLE loss of historic fabric. Immediate heritage assessment required.`,
      "POL-PE-002",
      0
    );
  }

  return null;
}

function checkCouncillorEnquiryOverdue(
  caseData: Case,
  today: Date
): Flag | null {
  const enquiry = findTimelineEvent(caseData, "councillor_enquiry");
  if (!enquiry) return null;

  // Check if there's a councillor response after the enquiry
  const enquiryDate = new Date(enquiry.date);
  const hasResponse = caseData.timeline.some(
    (e) =>
      e.event === "councillor_response" && new Date(e.date) > enquiryDate
  );
  if (hasResponse) return null;

  const workingDays = workingDaysBetween(enquiryDate, today);
  const overdue = workingDays - 5;

  if (workingDays >= 5) {
    return createFlag(
      "high",
      "councillor_enquiry_overdue",
      `Councillor enquiry not responded to — ${workingDays} working days (5-day deadline).`,
      "POL-PE-005",
      overdue
    );
  }

  if (workingDays >= 3) {
    return createFlag(
      "standard",
      "councillor_enquiry_overdue",
      `Councillor enquiry response due in ${5 - workingDays} working day(s).`,
      "POL-PE-005",
      0
    );
  }

  return null;
}

function checkCrossReferralMissing(
  caseData: Case
): Flag | null {
  if (caseData.case_type !== "change_of_use") return null;

  const hasHealthIssue = timelineNoteContains(
    caseData,
    "smoking",
    "smoke",
    "noise",
    "odour",
    "health act",
    "shisha"
  );
  if (!hasHealthIssue) return null;

  const referral = findTimelineEvent(
    caseData,
    "environmental_health_referral"
  );

  if (!referral) {
    return createFlag(
      "high",
      "cross_referral_missing",
      `Change of use case with health/noise concerns but NO Environmental Health referral made.`,
      "POL-PE-003",
      0
    );
  }

  // Check if referral was late (should be within 3 working days of issue identification)
  const siteVisit = findTimelineEvent(caseData, "site_visit_completed");
  if (siteVisit) {
    const issueDate = new Date(siteVisit.date);
    const referralDate = new Date(referral.date);
    const workingDaysLate = workingDaysBetween(issueDate, referralDate);

    if (workingDaysLate > 3) {
      return createFlag(
        "standard",
        "cross_referral_missing",
        `Environmental Health referral made ${workingDaysLate} working days after issue identified (3-day target).`,
        "POL-PE-003",
        workingDaysLate - 3
      );
    }
  }

  return null;
}

function checkMultipleComplaintsEscalation(caseData: Case): Flag | null {
  if (caseData.duplicate_count >= 3) {
    return createFlag(
      "high",
      "multiple_complaints_escalation",
      `${caseData.duplicate_count + 1} complaints received — requires senior review.`,
      "POL-PE-005",
      0
    );
  }
  return null;
}

// ─── Street Reporting Flags ─────────────────────────────────────────────────

function checkInjuryNotTriaged(caseData: Case, today: Date): Flag | null {
  const injuryEvent = caseData.timeline.find(
    (e) =>
      e.event === "injury_flagged" ||
      e.note.toLowerCase().includes("injury") ||
      e.note.toLowerCase().includes("injured")
  );
  if (!injuryEvent) return null;

  // Check if triaged (Category 1 assigned or emergency response dispatched)
  const triaged = caseData.timeline.some(
    (e) =>
      e.event === "emergency_response" ||
      e.event === "category_1_assigned" ||
      e.note.toLowerCase().includes("category 1")
  );

  if (!triaged) {
    const injuryDate = new Date(injuryEvent.date);
    const hoursElapsed = hoursBetween(injuryDate, today);

    if (hoursElapsed >= 24) {
      return createFlag(
        "critical",
        "injury_not_triaged",
        `Injury reported but NOT triaged as Category 1 — ${hoursElapsed} hours elapsed (2-hour requirement). Critical process failure.`,
        "POL-HW-001",
        Math.floor(hoursElapsed / 24)
      );
    }
  }
  return null;
}

function checkSlaBreach(caseData: Case, today: Date): Flag | null {
  const caseType = caseData.case_type;
  const createdDate = new Date(caseData.created_date);
  const daysSinceCreated = daysBetween(createdDate, today);

  // SLA thresholds by case type (in days)
  const slaMap: Record<string, number> = {
    fly_tipping: 2, // 48 hours
    pothole: 7, // Cat 2 default
    graffiti: 10, // non-offensive working days
    street_lighting: 14,
    noise_complaint: 5, // initial investigation
    abandoned_vehicle: 3, // inspection
    commercial_waste: 7, // investigation notice
    overflowing_bin: 1, // next scheduled round
  };

  const sla = slaMap[caseType];
  if (!sla) return null;

  // Don't flag closed cases
  if (caseData.status === "closed" || caseData.status === "resolved")
    return null;

  if (daysSinceCreated > sla * 2) {
    return createFlag(
      "high",
      "sla_breach",
      `Case open ${daysSinceCreated} days — exceeds DOUBLE the ${sla}-day SLA. Management review required.`,
      "POL-ESC-001",
      daysSinceCreated - sla
    );
  }

  if (daysSinceCreated > sla) {
    return createFlag(
      "high",
      "sla_breach",
      `Case open ${daysSinceCreated} days — exceeds ${sla}-day SLA.`,
      "POL-ESC-001",
      daysSinceCreated - sla
    );
  }

  return null;
}

function checkEvidenceNotReferred(caseData: Case): Flag | null {
  if (caseData.status === "closed" || caseData.status === "resolved")
    return null;

  // Check for events explicitly recording evidence was found (not "no evidence")
  const evidenceFound = caseData.timeline.some((e) => {
    const noteLower = e.note.toLowerCase();
    if (e.event === "evidence_found" || e.event === "evidence_collected") {
      return true;
    }
    // Match "evidence of commercial origin" but NOT when preceded by "no "
    if (
      noteLower.includes("evidence of commercial origin") &&
      !noteLower.includes("no evidence")
    ) {
      return true;
    }
    if (
      noteLower.includes("evidence identified") &&
      !noteLower.includes("no evidence")
    ) {
      return true;
    }
    return false;
  });
  if (!evidenceFound) return null;

  const notReferred = caseData.timeline.some(
    (e) =>
      e.note.toLowerCase().includes("not referred") ||
      e.note.toLowerCase().includes("not been referred")
  );

  const referred =
    !notReferred &&
    caseData.timeline.some(
      (e) =>
        e.event === "enforcement_referral" ||
        e.note.toLowerCase().includes("referred to enforcement") ||
        e.note.toLowerCase().includes("referred to the enforcement")
    );

  if (!referred) {
    return createFlag(
      "high",
      "evidence_not_referred",
      `Evidence of offence found but NOT referred to enforcement team — process failure.`,
      "POL-FT-001",
      0
    );
  }

  return null;
}

function checkDuplicateEscalation(caseData: Case): Flag | null {
  if (caseData.duplicate_count >= 5) {
    return createFlag(
      "standard",
      "duplicate_escalation",
      `${caseData.duplicate_count} duplicate reports — automatic escalation to area manager required.`,
      "POL-DUP-001",
      0
    );
  }
  return null;
}

function checkMemberEnquiryOverdue(
  caseData: Case,
  today: Date
): Flag | null {
  const enquiry = caseData.timeline.find(
    (e) =>
      e.event === "councillor_enquiry" || e.event === "mp_enquiry"
  );
  if (!enquiry) return null;

  const enquiryDate = new Date(enquiry.date);
  const hasResponse = caseData.timeline.some(
    (e) =>
      (e.event === "councillor_response" || e.event === "mp_response") &&
      new Date(e.date) > enquiryDate
  );
  if (hasResponse) return null;

  const workingDays = workingDaysBetween(enquiryDate, today);

  if (workingDays >= 5) {
    return createFlag(
      "high",
      "member_enquiry_overdue",
      `Member enquiry not responded to — ${workingDays} working days (5-day deadline).`,
      "POL-ESC-001",
      workingDays - 5
    );
  }

  return null;
}

function checkRecurrence(caseData: Case): Flag | null {
  const recurrenceEvents = caseData.timeline.filter(
    (e) =>
      e.note.toLowerCase().includes("recur") ||
      e.note.toLowerCase().includes("new fly-tipping") ||
      (e.note.toLowerCase().includes("further reports") &&
        e.note.toLowerCase().includes("same location"))
  );

  if (recurrenceEvents.length > 0) {
    return createFlag(
      "standard",
      "recurrence",
      `Recurrence detected — same issue reported again at this location.`,
      "POL-ESC-001",
      0
    );
  }

  return null;
}

// ─── Main Engine ────────────────────────────────────────────────────────────

export function computeFlags(
  caseData: Case,
  _policies: Policy[],
  today: Date
): Flag[] {
  const flags: Flag[] = [];
  const domain = getCaseDomain(caseData.case_type);

  if (domain === "planning") {
    // Planning breach flags
    const planningChecks = [
      checkProsecutionFileOverdue(caseData, today),
      checkEnforcementNoticeDelay(caseData, today),
      checkComplianceDeadlineImminent(caseData, today),
      checkNonComplianceDetected(caseData),
      checkHeritageIrreversibleDamage(caseData),
      checkCouncillorEnquiryOverdue(caseData, today),
      checkCrossReferralMissing(caseData),
      checkMultipleComplaintsEscalation(caseData),
    ];
    for (const flag of planningChecks) {
      if (flag) flags.push(flag);
    }
  } else {
    // Street reporting flags
    const streetChecks = [
      checkInjuryNotTriaged(caseData, today),
      checkSlaBreach(caseData, today),
      checkEvidenceNotReferred(caseData),
      checkDuplicateEscalation(caseData),
      checkMemberEnquiryOverdue(caseData, today),
      checkRecurrence(caseData),
    ];
    for (const flag of streetChecks) {
      if (flag) flags.push(flag);
    }
  }

  // Sort by severity: critical > high > standard
  const severityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    standard: 2,
  };
  flags.sort(
    (a, b) =>
      (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3)
  );

  return flags;
}
