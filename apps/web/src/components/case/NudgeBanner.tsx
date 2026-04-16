import { AlertTriangle, Check } from "lucide-react";
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
      // Silently fail for demo — button stays clickable
    }
  }

  return (
    <div className="nudge-banner" role="alert" aria-live="assertive">
      <div className="nudge-banner__text">
        <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: 1 }} />
        {text}
      </div>
      {immediateActions.length > 0 && (
        <div className="nudge-banner__actions">
          {immediateActions.map((a, i) => (
            <button
              key={i}
              className="nudge-btn"
              onClick={() => void handleAction(i)}
              disabled={confirmedIdx === i}
            >
              {confirmedIdx === i ? (
                <>
                  <Check size={14} /> Done
                </>
              ) : (
                a.label
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
