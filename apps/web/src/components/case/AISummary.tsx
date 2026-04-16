import type { Case, CaseSummary, Flag } from "../../types";

interface Props {
  aiSummary: CaseSummary | null;
  caseData: Case;
  flags?: Flag[];
}

function buildDeterministicSummary(caseData: Case, flags: Flag[]): CaseSummary {
  const critical = flags.filter((f) => f.severity === "critical");
  const high = flags.filter((f) => f.severity === "high");

  if (critical.length > 0) {
    const f = critical[0]!;
    return {
      summary: `URGENT: ${caseData.case_id} has ${critical.length} critical flag(s). ${f.message}`,
      next_action: `Immediate action: address ${f.type.replace(/_/g, " ")} per ${f.policy_ref}.`,
    };
  }
  if (high.length > 0) {
    const f = high[0]!;
    return {
      summary: `${caseData.case_id} has ${high.length} high-priority flag(s). ${f.message}`,
      next_action: `Priority: address ${f.type.replace(/_/g, " ")} per ${f.policy_ref}.`,
    };
  }
  return {
    summary: `${caseData.case_id} (${caseData.case_type.replace(/_/g, " ")}) is in ${caseData.status.replace(/_/g, " ")} status. No critical issues detected.`,
    next_action: "Continue standard process as per workflow.",
  };
}

export default function AISummary({ aiSummary, caseData, flags = [] }: Props) {
  const content = aiSummary ?? buildDeterministicSummary(caseData, flags);

  return (
    <div className="ai-summary-card">
      <p className="ai-summary-card__label govuk-!-margin-0">Case summary</p>
      <p className="govuk-body govuk-!-margin-top-2 govuk-!-margin-bottom-0">{content.summary}</p>
      <div className="ai-summary-card__next">
        <p className="ai-summary-card__next-label govuk-!-margin-0">Recommended next action</p>
        <p className="govuk-body govuk-!-margin-top-1 govuk-!-margin-bottom-0">{content.next_action}</p>
      </div>
    </div>
  );
}
