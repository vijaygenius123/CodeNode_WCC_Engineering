import { CheckCircle2, Circle, XCircle } from "lucide-react";
import type { Flag, TimelineEvent } from "../../types";

interface Props {
  timeline: TimelineEvent[];
  requiredActions: string[];
  flags: Flag[];
}

// Known enforcement milestone events
const MILESTONE_EVENTS = [
  "site_visit_scheduled",
  "site_visit_completed",
  "pcn_issued",
  "enforcement_notice_issued",
  "listed_building_enforcement_notice_issued",
  "temporary_stop_notice",
  "prosecution_file_submitted",
  "compliance_monitoring",
  "environmental_health_referral",
  "councillor_response",
  "monitoring_visit",
];

function formatEvent(e: string) {
  return e.replace(/_/g, " ");
}

export default function EvidenceTracker({
  timeline,
  requiredActions,
  flags,
}: Props) {
  const completedEvents = new Set(timeline.map((e) => e.event));

  const milestones = MILESTONE_EVENTS.map((ev) => ({
    event: ev,
    done: completedEvents.has(ev),
  }));

  const hasDone = milestones.some((m) => m.done);
  const overdueFlags = flags.filter((f) => f.days_overdue > 0);

  return (
    <div>
      {overdueFlags.length > 0 && (
        <div className="govuk-warning-text govuk-!-margin-bottom-3">
          <span className="govuk-warning-text__icon" aria-hidden="true">!</span>
          <strong className="govuk-warning-text__text">
            <span className="govuk-visually-hidden">Warning</span>
            {overdueFlags.length} item{overdueFlags.length !== 1 ? "s" : ""} outstanding beyond policy threshold.
          </strong>
        </div>
      )}

      <ul className="evidence-list">
        {milestones
          .filter((m) => m.done)
          .map((m) => (
            <li key={m.event} className="evidence-item evidence-item--done">
              <CheckCircle2
                size={16}
                className="evidence-icon--done"
                aria-hidden="true"
              />
              <span>{formatEvent(m.event)}</span>
            </li>
          ))}

        {requiredActions.map((action, i) => {
          const isOverdue = overdueFlags.some((f) =>
            action.toLowerCase().includes(f.type.replace(/_/g, " "))
          );
          return (
            <li
              key={`req-${i}`}
              className={`evidence-item ${isOverdue ? "evidence-item--overdue" : "evidence-item--pending"}`}
            >
              {isOverdue ? (
                <XCircle size={16} className="evidence-icon--overdue" aria-hidden="true" />
              ) : (
                <Circle size={16} className="evidence-icon--pending" aria-hidden="true" />
              )}
              <span>
                {action}
                {isOverdue && (
                  <strong className="govuk-tag govuk-tag--red govuk-!-margin-left-2">overdue</strong>
                )}
              </span>
            </li>
          );
        })}

        {milestones
          .filter((m) => !m.done && !requiredActions.length)
          .slice(0, 3)
          .map((m) => (
            <li key={m.event} className="evidence-item evidence-item--pending">
              <Circle size={16} className="evidence-icon--pending" aria-hidden="true" />
              <span className="text-grey">{formatEvent(m.event)}</span>
            </li>
          ))}
      </ul>

      {!hasDone && requiredActions.length === 0 && (
        <p className="govuk-body-s text-grey mb-0">
          No milestone events recorded yet.
        </p>
      )}
    </div>
  );
}
