import { ArrowUpCircle } from "lucide-react";
import type { TimelineEvent } from "../../types";

interface Props {
  timeline: TimelineEvent[];
}

const ESCALATION_EVENTS = new Set([
  "councillor_enquiry",
  "mp_enquiry",
  "escalated",
  "senior_review_requested",
  "urgent_investigation",
  "prosecution",
  "emergency_response",
]);

function isEscalation(ev: TimelineEvent) {
  return (
    ESCALATION_EVENTS.has(ev.event) ||
    ev.note.toLowerCase().includes("escalat") ||
    ev.note.toLowerCase().includes("urgent") ||
    ev.note.toLowerCase().includes("councillor")
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function EscalationHistory({ timeline }: Props) {
  const escalations = timeline.filter(isEscalation);

  if (escalations.length === 0) {
    return (
      <p className="govuk-body-s text-grey mb-0">
        No escalations recorded for this case.
      </p>
    );
  }

  return (
    <div>
      {escalations.map((ev, i) => (
        <div key={i} className="flag-row">
          <ArrowUpCircle
            size={18}
            style={{ color: "var(--govuk-orange)", flexShrink: 0 }}
            aria-hidden="true"
          />
          <div>
            <p className="govuk-body-s mb-0">
              <strong>{ev.event.replace(/_/g, " ")}</strong>
            </p>
            <p className="text-grey text-small mb-0">{formatDate(ev.date)}</p>
            {ev.note && (
              <p className="text-small mb-0" style={{ marginTop: 2 }}>
                {ev.note}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
