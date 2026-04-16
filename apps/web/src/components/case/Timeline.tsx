import { AlertTriangle, Scale, UserCircle } from "lucide-react";
import type { TimelineEvent } from "../../types";

interface Props {
  events: TimelineEvent[];
  createdDate: string;
}

const WARNING_KEYWORDS = [
  "criminal",
  "offence",
  "overdue",
  "breach",
  "urgent",
  "irreversible",
  "injury",
  "non-compliance",
  "prosecution",
];

const LEGAL_EVENTS = [
  "enforcement_notice_issued",
  "listed_building_enforcement_notice_issued",
  "temporary_stop_notice_issued",
  "police_notified",
  "legal_referral",
  "prosecution",
];

const TODAY_ISO = "2026-04-15";

function isWarning(event: TimelineEvent) {
  const text = (event.event + " " + event.note).toLowerCase();
  return WARNING_KEYWORDS.some((k) => text.includes(k));
}

function getIcon(event: TimelineEvent) {
  if (event.event === "councillor_enquiry" || event.event === "mp_enquiry") {
    return <UserCircle size={14} />;
  }
  if (
    LEGAL_EVENTS.includes(event.event) ||
    event.note.toLowerCase().includes("criminal offence") ||
    event.note.toLowerCase().includes("section 9")
  ) {
    return <Scale size={14} />;
  }
  if (isWarning(event)) {
    return <AlertTriangle size={14} />;
  }
  return null;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMonth(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function formatEvent(e: string) {
  return e.replace(/_/g, " ");
}

export default function Timeline({ events, createdDate }: Props) {
  const allEvents = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Group by month for date headers
  let lastMonth = "";

  return (
    <ol className="timeline">
      {allEvents.map((ev, i) => {
        const warning = isWarning(ev);
        const isToday = ev.date.startsWith(TODAY_ISO);
        let cls = "timeline-event";
        if (warning) cls += " timeline-event--warning";
        if (isToday) cls += " timeline-event--today";

        const month = formatMonth(ev.date);
        const showMonthHeader = month !== lastMonth;
        lastMonth = month;

        const icon = getIcon(ev);

        return (
          <li key={i}>
            {showMonthHeader && (
              <div className="timeline-month-header">{month}</div>
            )}
            <div className={cls}>
              <div className="timeline-event__dot" aria-hidden="true">
                {icon}
              </div>
              <div className="timeline-event__date">{formatDate(ev.date)}</div>
              <div className="timeline-event__event">
                {formatEvent(ev.event)}
              </div>
              {ev.note && (
                <div className="timeline-event__note">{ev.note}</div>
              )}
            </div>
          </li>
        );
      })}

      <li>
        <div className="timeline-event timeline-event--today">
          <div className="timeline-event__dot" aria-hidden="true" />
          <div className="timeline-today-marker">
            Today — {formatDate(TODAY_ISO)}
          </div>
        </div>
      </li>

      <li>
        <p className="text-grey text-small mb-0" style={{ marginTop: 8 }}>
          Case opened {formatDate(createdDate)}
        </p>
      </li>
    </ol>
  );
}
