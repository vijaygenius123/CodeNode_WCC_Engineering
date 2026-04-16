import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Flag, Policy } from "../../types";

interface Props {
  policies: Policy[];
  flags: Flag[];
}

function PolicyCard({ policy, flagged }: { policy: Policy; flagged: boolean }) {
  const [open, setOpen] = useState(flagged);

  return (
    <div className={`policy-card${flagged ? " policy-card--flagged" : ""}`}>
      <div className="policy-card__header">
        <span className="policy-card__id">{policy.policy_id}</span>
        <span className="policy-card__title">{policy.title}</span>
        {flagged && (
          <span className="govuk-tag govuk-tag--critical">Flagged</span>
        )}
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Collapse policy" : "Expand policy"}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: "var(--govuk-grey)",
            flexShrink: 0,
          }}
        >
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>
      {open && (
        <div className="policy-card__body">{policy.body}</div>
      )}
    </div>
  );
}

export default function PolicyPanel({ policies, flags }: Props) {
  const flaggedPolicyIds = new Set(flags.map((f) => f.policy_ref));

  const sorted = [...policies].sort((a, b) => {
    const aF = flaggedPolicyIds.has(a.policy_id) ? 0 : 1;
    const bF = flaggedPolicyIds.has(b.policy_id) ? 0 : 1;
    return aF - bF;
  });

  if (sorted.length === 0) {
    return (
      <p className="govuk-body-s text-grey">No applicable policies found.</p>
    );
  }

  return (
    <div>
      {sorted.map((p) => (
        <PolicyCard
          key={p.policy_id}
          policy={p}
          flagged={flaggedPolicyIds.has(p.policy_id)}
        />
      ))}
    </div>
  );
}
