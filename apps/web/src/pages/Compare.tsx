import { useState } from "react";
import { useApi } from "../hooks/useApi";
import type { CaseDetailResponse } from "../types";
import NudgeBanner from "../components/case/NudgeBanner";
import FlagsPanel from "../components/case/FlagsPanel";
import AISummary from "../components/case/AISummary";
import WorkflowState from "../components/case/WorkflowState";

interface CasesListResponse {
  cases: { case_id: string; case_type: string; domain: string }[];
}

const DEFAULT_LEFT = "WCC-2026-10302";
const DEFAULT_RIGHT = "WCC-2026-10304";

function MiniCasePanel({
  caseId,
  label,
  variant,
}: {
  caseId: string;
  label: string;
  variant: "critical" | "routine";
}) {
  const { data, loading, error } = useApi<CaseDetailResponse>(
    caseId ? `/api/cases/${caseId}/view` : null
  );

  return (
    <div className="compare-panel">
      <div
        className={`compare-panel__header compare-panel__header--${variant}`}
      >
        {label}
      </div>
      <div className="compare-panel__body">
        {loading && (
          <div className="loading-state" style={{ padding: "20px 0" }}>
            Loading…
          </div>
        )}
        {error && <div className="error-state">{error}</div>}
        {data && (
          <>
            <div style={{ marginBottom: 12 }}>
              <span className="case-id" style={{ fontSize: "1.1rem" }}>
                {data.case_data.case_id}
              </span>
              <span
                className="govuk-tag govuk-tag--grey"
                style={{ marginLeft: 10 }}
              >
                {data.case_data.status.replace(/_/g, " ")}
              </span>
              {data.case_data.listed_building && (
                <span
                  className="govuk-tag govuk-tag--heritage"
                  style={{ marginLeft: 6 }}
                >
                  Listed
                </span>
              )}
              {data.case_data.conservation_area && (
                <span
                  className="govuk-tag govuk-tag--planning"
                  style={{ marginLeft: 6 }}
                >
                  Conservation Area
                </span>
              )}
            </div>

            {data.layout.nudge_text && (
              <NudgeBanner
                text={data.layout.nudge_text}
                nudges={data.nudges}
              />
            )}

            {data.flags.length > 0 && <FlagsPanel flags={data.flags} />}

            <AISummary
              aiSummary={data.ai_summary}
              caseData={data.case_data}
              flags={data.flags}
            />

            {data.workflow && (
              <WorkflowState
                workflow={data.workflow}
                caseType={data.case_data.case_type}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function Compare() {
  const [leftId, setLeftId] = useState(DEFAULT_LEFT);
  const [rightId, setRightId] = useState(DEFAULT_RIGHT);

  const { data: casesData } = useApi<CasesListResponse>("/api/cases?domain=all");
  const caseIds = casesData?.cases.map((c) => c.case_id) ?? [];

  return (
    <div className="govuk-width-container">
      <h1 className="govuk-heading-xl">Compare Cases</h1>
      <p className="govuk-body">
        See how CaseView presents two different cases — the same 15 components,
        composed differently based on context and flags.
      </p>

      <div className="compare-selectors">
        <div className="compare-selector">
          <label htmlFor="left-select">Left panel</label>
          <select
            id="left-select"
            value={leftId}
            onChange={(e) => setLeftId(e.target.value)}
          >
            {caseIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>
        <div className="compare-selector">
          <label htmlFor="right-select">Right panel</label>
          <select
            id="right-select"
            value={rightId}
            onChange={(e) => setRightId(e.target.value)}
          >
            {caseIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="compare-view">
        <MiniCasePanel caseId={leftId} label="Critical Case" variant="critical" />
        <div className="compare-vs">vs</div>
        <MiniCasePanel caseId={rightId} label="Routine Case" variant="routine" />
      </div>
    </div>
  );
}
