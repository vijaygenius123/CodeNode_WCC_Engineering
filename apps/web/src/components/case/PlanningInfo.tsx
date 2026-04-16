import { Landmark } from "lucide-react";
import type { Case, Policy } from "../../types";

interface Props {
  caseData: Case;
  policies: Policy[];
}

export default function PlanningInfo({ caseData, policies }: Props) {
  const {
    planning_ref,
    conservation_area,
    listed_building,
    listed_grade,
    case_type,
  } = caseData;

  const isCriminal = case_type === "listed_building_breach" && listed_building;

  return (
    <div>
      {isCriminal && (
        <div className="govuk-warning-text govuk-!-margin-bottom-4" role="alert">
          <span className="govuk-warning-text__icon" aria-hidden="true">!</span>
          <strong className="govuk-warning-text__text">
            <span className="govuk-visually-hidden">Warning</span>
            <strong>Criminal offence</strong> — Section 9, Planning (Listed Buildings and Conservation Areas) Act 1990. Prosecution may be pursued.
          </strong>
        </div>
      )}

      <div className="planning-info-grid">
        {planning_ref && (
          <div>
            <div className="planning-info-item__label">Planning Ref</div>
            <div className="planning-info-item__value">{planning_ref}</div>
          </div>
        )}
        {conservation_area && (
          <div>
            <div className="planning-info-item__label">Conservation Area</div>
            <div className="planning-info-item__value">{conservation_area}</div>
          </div>
        )}
        {listed_building && (
          <div>
            <div className="planning-info-item__label">Listed Building</div>
            <div className="planning-info-item__value">
              <Landmark
                size={14}
                style={{ verticalAlign: "middle", marginRight: 4, color: "#6e4b00" }}
              />
              {listed_grade ?? "Grade unknown"}
            </div>
          </div>
        )}
        <div>
          <div className="planning-info-item__label">Case Type</div>
          <div className="planning-info-item__value">
            {case_type.replace(/_/g, " ")}
          </div>
        </div>
      </div>

      {policies.length > 0 && (
        <div className="govuk-!-margin-top-3">
          <p className="govuk-hint govuk-!-margin-bottom-2">Applicable legislation / policy:</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {policies.map((p) => (
              <strong key={p.policy_id} className="govuk-tag govuk-tag--grey">
                {p.policy_id}
              </strong>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
