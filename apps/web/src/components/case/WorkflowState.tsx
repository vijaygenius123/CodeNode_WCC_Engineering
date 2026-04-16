import { AlertTriangle, CheckCircle2, Circle } from "lucide-react";
import type { ComputedWorkflowState } from "../../types";

interface Props {
  workflow: ComputedWorkflowState;
  caseType: string;
}

// Known linear progressions per case type
const PLANNING_STAGES: Record<string, string[]> = {
  unauthorised_construction: [
    "complaint_received",
    "site_visit_scheduled",
    "investigation",
    "enforcement_notice_issued",
    "compliance_monitoring",
    "resolved",
  ],
  listed_building_breach: [
    "complaint_received",
    "urgent_investigation",
    "temporary_stop_notice",
    "listed_building_enforcement_notice_issued",
    "compliance_monitoring",
    "prosecution",
    "resolved",
  ],
  change_of_use: [
    "complaint_received",
    "site_visit_scheduled",
    "investigation",
    "pcn_issued",
    "enforcement_notice_issued",
    "compliance_monitoring",
    "resolved",
  ],
  breach_of_conditions: [
    "complaint_received",
    "site_visit_scheduled",
    "investigation",
    "pcn_issued",
    "compliance_monitoring",
    "resolved",
  ],
};

const STREET_STAGES = [
  "report_received",
  "assigned",
  "inspection_scheduled",
  "under_review",
  "notice_served",
  "cleared",
];

function getStages(caseType: string): string[] {
  return PLANNING_STAGES[caseType] ?? STREET_STAGES;
}

function formatState(s: string) {
  return s.replace(/_/g, " ");
}

export default function WorkflowState({ workflow, caseType }: Props) {
  const stages = getStages(caseType);
  const current = workflow.currentState.state;
  const shouldBeIn = workflow.shouldBeIn;
  const currentIdx = stages.indexOf(current);

  return (
    <div>
      {/* Horizontal state bar */}
      <div className="workflow-bar" role="list" aria-label="Workflow stages">
        {stages.map((stage, i) => {
          const isDone = i < currentIdx;
          const isCurrent = stage === current;
          const isMismatch = stage === shouldBeIn;

          let stepCls = "workflow-step";
          if (isDone) stepCls += " workflow-step--done";
          else if (isCurrent) stepCls += " workflow-step--current";
          else if (isMismatch) stepCls += " workflow-step--mismatch";

          return (
            <div
              key={stage}
              className={stepCls}
              role="listitem"
              aria-current={isCurrent ? "step" : undefined}
            >
              {i < stages.length - 1 && (
                <div className="workflow-step__connector" aria-hidden="true" />
              )}
              <div className="workflow-step__dot" aria-hidden="true" />
              <div className="workflow-step__label">{formatState(stage)}</div>
            </div>
          );
        })}
      </div>

      {/* Mismatch warning */}
      {shouldBeIn && (
        <div className="workflow-mismatch-note" role="alert">
          <AlertTriangle
            size={14}
            style={{ verticalAlign: "middle", marginRight: 6 }}
          />
          Case should be in <strong>{formatState(shouldBeIn)}</strong> based on
          time elapsed ({workflow.daysInState} days in current state).
        </div>
      )}

      {/* Time in state */}
      <p className="text-grey text-small" style={{ marginTop: 10 }}>
        In <strong>{formatState(current)}</strong> for{" "}
        <strong>{workflow.daysInState} day{workflow.daysInState !== 1 ? "s" : ""}</strong>
        {workflow.currentState.sla_days != null && (
          <> · SLA: {workflow.currentState.sla_days} days</>
        )}
      </p>

      {/* Required actions */}
      {workflow.requiredActions.length > 0 && (
        <div className="workflow-actions">
          <p className="govuk-heading-s mb-4">Required actions</p>
          {workflow.requiredActions.map((action, i) => (
            <div key={i} className="workflow-actions__item">
              <CheckCircle2 size={15} style={{ color: "var(--govuk-orange)", flexShrink: 0, marginTop: 1 }} />
              <span>{action}</span>
            </div>
          ))}
        </div>
      )}

      {/* Allowed transitions */}
      {workflow.allowedTransitions.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <p className="text-grey text-small mb-4">Next steps:</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {workflow.allowedTransitions.map((t) => (
              <span key={t} className="govuk-tag govuk-tag--grey">
                <Circle size={9} style={{ marginRight: 4, verticalAlign: "middle" }} />
                {formatState(t)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
