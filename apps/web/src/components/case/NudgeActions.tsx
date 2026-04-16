import { Check } from "lucide-react";
import { useState } from "react";
import { useRole } from "../../context/RoleContext";
import { postAction } from "../../hooks/useApi";
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
  const { role } = useRole();
  const [confirmed, setConfirmed] = useState<string | null>(null);

  if (nudges.length === 0) {
    return (
      <p className="govuk-body-s text-grey mb-0">No actions required.</p>
    );
  }

  async function handleAction(endpoint: string, payload: Record<string, string>, key: string) {
    try {
      await postAction(endpoint, payload, role);
      setConfirmed(key);
      setTimeout(() => setConfirmed(null), 2000);
    } catch {
      // Silently fail for demo
    }
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
              {nudge.actions.map((a, j) => {
                const key = `${i}-${j}`;
                return (
                  <button
                    key={j}
                    className="nudge-btn"
                    style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                    onClick={() => void handleAction(a.endpoint, a.payload, key)}
                    disabled={confirmed === key}
                  >
                    {confirmed === key ? (
                      <>
                        <Check size={12} /> Done
                      </>
                    ) : (
                      a.label
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
