import { Copy } from "lucide-react";

interface Props {
  duplicateCount: number;
  caseId: string;
}

export default function DuplicatePanel({ duplicateCount, caseId }: Props) {
  const total = duplicateCount + 1;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <Copy size={18} style={{ color: "var(--govuk-blue)", flexShrink: 0 }} />
      <div>
        <p className="govuk-body mb-0">
          <strong>{total}</strong> report{total !== 1 ? "s" : ""} linked to
          this issue
          {duplicateCount === 0 && " (no duplicates)"}
        </p>
        {duplicateCount >= 5 && (
          <p className="text-small text-red mb-0">
            ≥5 duplicates — automatic area manager escalation required.
          </p>
        )}
        {duplicateCount >= 3 && duplicateCount < 5 && (
          <p className="text-small" style={{ color: "var(--govuk-orange)" }}>
            {duplicateCount} duplicates — senior review required.
          </p>
        )}
        <p className="text-grey text-small mb-0">Case ref: {caseId}</p>
      </div>
    </div>
  );
}
