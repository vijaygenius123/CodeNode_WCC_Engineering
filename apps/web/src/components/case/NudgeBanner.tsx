import { AlertTriangle } from "lucide-react";
import type { Nudge } from "../../types";

interface Props {
  text: string;
  nudges: Nudge[];
}

export default function NudgeBanner({ text, nudges }: Props) {
  const immediateActions = nudges
    .filter((n) => n.urgency === "immediate")
    .flatMap((n) => n.actions);

  return (
    <div className="nudge-banner" role="alert" aria-live="assertive">
      <div className="nudge-banner__text">
        <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: 1 }} />
        {text}
      </div>
      {immediateActions.length > 0 && (
        <div className="nudge-banner__actions">
          {immediateActions.map((a, i) => (
            <button key={i} className="nudge-btn">
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
