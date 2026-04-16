import { HardHat } from "lucide-react";

interface Props {
  contractor: string | null;
  lastUpdated: string;
}

export default function ContractorInfo({ contractor, lastUpdated }: Props) {
  if (!contractor) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <HardHat size={18} style={{ color: "var(--govuk-grey)", flexShrink: 0 }} />
        <p className="govuk-body mb-0 text-grey">No contractor assigned.</p>
      </div>
    );
  }

  const updated = new Date(lastUpdated).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
      <HardHat size={18} style={{ color: "var(--govuk-blue)", flexShrink: 0, marginTop: 2 }} />
      <div>
        <p className="govuk-body mb-0">
          <strong>{contractor}</strong>
        </p>
        <p className="text-grey text-small mb-0">Last update: {updated}</p>
      </div>
    </div>
  );
}
