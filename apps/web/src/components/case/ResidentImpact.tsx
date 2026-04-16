import { Users } from "lucide-react";

interface Props {
  duplicateCount: number;
  caseType: string;
  ward: string;
}

const IMPACT_DESCRIPTIONS: Record<string, string> = {
  fly_tipping: "waste in a public area",
  pothole: "a road hazard",
  graffiti: "graffiti on public property",
  noise_complaint: "noise disturbance",
  rough_sleeping: "a welfare concern",
  commercial_waste: "commercial waste",
  abandoned_vehicle: "an abandoned vehicle",
  overflowing_bin: "an overflowing bin",
  street_lighting: "a street lighting failure",
  unauthorised_construction: "planning irregularities",
  listed_building_breach: "damage to a listed building",
  change_of_use: "a planning breach",
  breach_of_conditions: "breach of planning conditions",
};

export default function ResidentImpact({
  duplicateCount,
  caseType,
  ward,
}: Props) {
  const total = duplicateCount + 1;
  const issue = IMPACT_DESCRIPTIONS[caseType] ?? "a local issue";

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
      <Users size={20} style={{ color: "var(--govuk-orange)", flexShrink: 0, marginTop: 2 }} />
      <div>
        <p className="govuk-body mb-4">
          <strong>{total} resident{total !== 1 ? "s" : ""}</strong> in {ward}{" "}
          have reported {issue}.
        </p>
        {duplicateCount >= 5 && (
          <p className="text-small mb-0" style={{ color: "var(--govuk-red)" }}>
            High community impact — senior review required per POL-ESC-001.
          </p>
        )}
        {duplicateCount >= 3 && duplicateCount < 5 && (
          <p className="text-small mb-0" style={{ color: "var(--govuk-orange)" }}>
            Multiple residents affected — consider escalation.
          </p>
        )}
      </div>
    </div>
  );
}
