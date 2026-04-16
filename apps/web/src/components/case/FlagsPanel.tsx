import { AlertCircle } from "lucide-react";
import type { Flag } from "../../types";

interface Props {
  flags: Flag[];
}

function severityIcon(s: Flag["severity"]) {
  const cls = `flag-icon--${s}`;
  return <AlertCircle size={18} className={cls} aria-hidden="true" />;
}

function overdueLabel(days: number) {
  if (days === 0) return null;
  return (
    <span className="text-red text-small text-bold">
      {days} day{days !== 1 ? "s" : ""} overdue
    </span>
  );
}

export default function FlagsPanel({ flags }: Props) {
  if (flags.length === 0) return null;

  return (
    <div>
      {flags.map((f, i) => (
        <div key={i} className="flag-row">
          {severityIcon(f.severity)}
          <div style={{ flex: 1 }}>
            <div className="flag-message">{f.message}</div>
            <div style={{ display: "flex", gap: 12, marginTop: 3, flexWrap: "wrap" }}>
              {f.days_overdue > 0 && overdueLabel(f.days_overdue)}
              <span className="flag-policy">{f.policy_ref}</span>
              <span className="flag-meta text-small">
                {f.type.replace(/_/g, " ")}
              </span>
            </div>
          </div>
          <span className={`govuk-tag govuk-tag--${f.severity}`}>
            {f.severity}
          </span>
        </div>
      ))}
    </div>
  );
}
