import type { Nudge } from "../../types";

interface Props {
  nudges: Nudge[];
}

const urgencyColor: Record<string, string> = {
  immediate: "var(--govuk-red)",
  high: "var(--govuk-orange)",
  normal: "var(--govuk-blue)",
};

export default function NudgeActions({ nudges }: Props) {
  if (nudges.length === 0) {
    return (
      <p className="govuk-body-s text-grey mb-0">No actions required.</p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {nudges.map((nudge, i) => (
        <div
          key={i}
          style={{
            borderLeft: `3px solid ${urgencyColor[nudge.urgency] ?? "var(--govuk-blue)"}`,
            paddingLeft: 12,
          }}
        >
          <p className="govuk-body-s mb-4">
            <strong>{nudge.urgency.toUpperCase()}</strong>: {nudge.text}
          </p>
          {nudge.actions.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {nudge.actions.map((a, j) => (
                <button key={j} className="nudge-btn" style={{ fontSize: "0.8rem", padding: "6px 12px" }}>
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
