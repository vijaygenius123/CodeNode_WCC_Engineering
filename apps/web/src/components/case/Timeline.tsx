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

const TODAY_ISO = "2026-04-15";

function isWarning(event: TimelineEvent) {
  const text = (event.event + " " + event.note).toLowerCase();
  return WARNING_KEYWORDS.some((k) => text.includes(k));
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
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

  return (
    <div className="timeline">
      {allEvents.map((ev, i) => {
        const warning = isWarning(ev);
        const isToday = ev.date.startsWith(TODAY_ISO);
        let cls = "timeline-event";
        if (warning) cls += " timeline-event--warning";
        if (isToday) cls += " timeline-event--today";

        return (
          <div key={i} className={cls}>
            <div className="timeline-event__dot" aria-hidden="true" />
            <div className="timeline-event__date">{formatDate(ev.date)}</div>
            <div className="timeline-event__event">{formatEvent(ev.event)}</div>
            {ev.note && (
              <div className="timeline-event__note">{ev.note}</div>
            )}
          </div>
        );
      })}

      {/* "Today" marker */}
      <div className="timeline-event timeline-event--today">
        <div className="timeline-event__dot" aria-hidden="true" />
        <div className="timeline-today-marker">Today — {formatDate(TODAY_ISO)}</div>
      </div>

      <p className="text-grey text-small mb-0" style={{ marginTop: 8 }}>
        Case opened {formatDate(createdDate)}
      </p>
    </div>
  );
}
