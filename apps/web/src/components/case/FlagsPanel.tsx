import type { Flag } from "../../types";

interface Props {
  flags: Flag[];
}

function severityTag(s: Flag["severity"]) {
  if (s === "critical") return <strong className="govuk-tag govuk-tag--red">Critical</strong>;
  if (s === "high")     return <strong className="govuk-tag govuk-tag--orange">High</strong>;
  return <strong className="govuk-tag govuk-tag--blue">Standard</strong>;
}

export default function FlagsPanel({ flags }: Props) {
  if (flags.length === 0) return null;

  return (
    <div>
      {flags.map((f, i) => (
        <div key={i} className="flag-item">
          <div className={`flag-item__icon flag-item__icon--${f.severity}`} aria-hidden="true">
            {f.severity === "critical" ? "⚠" : f.severity === "high" ? "!" : "ℹ"}
          </div>
          <div style={{ flex: 1 }}>
            <p className="govuk-body govuk-!-margin-0 govuk-!-font-weight-bold">{f.message}</p>
            <p className="govuk-body-s govuk-hint govuk-!-margin-top-1 govuk-!-margin-bottom-0">
              {f.policy_ref} — {f.type.replace(/_/g, " ")}
              {f.days_overdue > 0 && (
                <strong style={{ color: "#d4351c", marginLeft: 8 }}>
                  {f.days_overdue} day{f.days_overdue !== 1 ? "s" : ""} overdue
                </strong>
              )}
            </p>
          </div>
          {severityTag(f.severity)}
        </div>
      ))}
    </div>
  );
}
