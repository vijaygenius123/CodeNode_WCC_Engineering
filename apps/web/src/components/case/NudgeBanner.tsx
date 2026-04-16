import { useState } from "react";
import { postAction } from "../../hooks/useApi";
import { useRole } from "../../context/RoleContext";
import type { Nudge } from "../../types";

interface Props {
  text: string;
  nudges: Nudge[];
}

export default function NudgeBanner({ text, nudges }: Props) {
  const { role } = useRole();
  const [confirmedIdx, setConfirmedIdx] = useState<number | null>(null);

  const immediateActions = nudges
    .filter((n) => n.urgency === "immediate")
    .flatMap((n) => n.actions);

  async function handleAction(idx: number) {
    const action = immediateActions[idx];
    if (!action) return;
    try {
      await postAction(action.endpoint, action.payload, role);
      setConfirmedIdx(idx);
      setTimeout(() => setConfirmedIdx(null), 2000);
    } catch {
      // Silently fail for demo
    }
  }

  return (
    <div
      className="govuk-notification-banner govuk-notification-banner--critical"
      role="alert"
      aria-labelledby="govuk-notification-banner-title"
      aria-live="assertive"
    >
      <div className="govuk-notification-banner__header">
        <h2 className="govuk-notification-banner__title" id="govuk-notification-banner-title">
          Urgent action required
        </h2>
      </div>
      <div className="govuk-notification-banner__content">
        <p className="govuk-body govuk-!-font-weight-bold">{text}</p>
        {immediateActions.length > 0 && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
            {immediateActions.map((a, i) => (
              <button
                key={i}
                className="govuk-button govuk-button--inverse govuk-!-margin-0"
                onClick={() => void handleAction(i)}
                disabled={confirmedIdx === i}
                style={{ background: "#00703c", color: "#fff", border: "none" }}
              >
                {confirmedIdx === i ? "Done" : a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
