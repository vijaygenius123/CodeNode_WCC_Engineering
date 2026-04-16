import { useNavigate } from "react-router-dom";
import { AlertCircle, Brain, Building2, MapPin } from "lucide-react";
import { useApi } from "../hooks/useApi";
import type { CaseListItem, DashboardResponse } from "../types";

interface InsightResponse {
  insight: string[];
}

function CaseRow({ c, onClick }: { c: CaseListItem; onClick: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 0",
        borderBottom: "1px solid #f0f0f0",
        cursor: "pointer",
        gap: 8,
      }}
      onClick={onClick}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onClick(); }}
      role="button"
      aria-label={`Open case ${c.case_id}`}
    >
      <div>
        <span className="case-id">{c.case_id}</span>
        <span
          className="text-grey text-small"
          style={{ marginLeft: 8 }}
        >
          {c.case_type.replace(/_/g, " ")}
        </span>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
        {c.max_severity && (
          <span className={`flag-badge flag-badge--${c.max_severity}`}>
            <AlertCircle size={11} />
            {c.flag_count}
          </span>
        )}
        <span className={`govuk-tag govuk-tag--${c.domain}`}>{c.domain}</span>
      </div>
    </div>
  );
}

function CasesSection({
  title,
  cases,
  domain,
  onNavigate,
}: {
  title: string;
  cases: CaseListItem[];
  domain: "planning" | "street";
  onNavigate: (id: string) => void;
}) {
  const flagged = cases.filter((c) => c.flag_count > 0);
  return (
    <div className={`govuk-panel dashboard-section--${domain}`}>
      <div className="dashboard-section__header">
        {domain === "planning" ? (
          <Building2 size={18} color="var(--govuk-purple)" />
        ) : (
          <MapPin size={18} color="var(--govuk-blue)" />
        )}
        <h2 className="govuk-heading-m mb-0">{title}</h2>
        <span className="govuk-tag govuk-tag--grey" style={{ marginLeft: "auto" }}>
          {cases.length} cases
        </span>
      </div>

      {flagged.length === 0 ? (
        <p className="govuk-body-s text-grey mb-0">No flagged cases.</p>
      ) : (
        flagged.map((c) => (
          <CaseRow key={c.case_id} c={c} onClick={() => onNavigate(c.case_id)} />
        ))
      )}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, loading, error } =
    useApi<DashboardResponse>("/api/dashboard");
  const { data: insight } = useApi<InsightResponse>(
    "/api/dashboard/insight"
  );

  if (loading)
    return (
      <div className="govuk-width-container">
        <div className="loading-state">Loading dashboard…</div>
      </div>
    );

  if (error)
    return (
      <div className="govuk-width-container">
        <div className="error-state">Failed to load dashboard: {error}</div>
      </div>
    );

  if (!data) return null;

  return (
    <div className="govuk-width-container">
      <h1 className="govuk-heading-xl">Team Leader Dashboard</h1>

      {/* Summary cards */}
      <div className="summary-card-row">
        <div className="summary-card">
          <div className="summary-card__value">{data.total_cases}</div>
          <div className="summary-card__label">Total Cases</div>
        </div>
        <div className="summary-card summary-card--critical">
          <div className="summary-card__value">{data.planning_critical}</div>
          <div className="summary-card__label">Planning Critical</div>
        </div>
        <div className="summary-card summary-card--critical">
          <div className="summary-card__value">{data.street_critical}</div>
          <div className="summary-card__label">Street Critical</div>
        </div>
        <div className="summary-card summary-card--warning">
          <div className="summary-card__value">{data.warnings}</div>
          <div className="summary-card__label">Warnings</div>
        </div>
        <div className="summary-card summary-card--positive">
          <div className="summary-card__value">{data.resolved}</div>
          <div className="summary-card__label">Resolved</div>
        </div>
      </div>

      {/* AI insight */}
      {insight?.insight && insight.insight.length > 0 && (
        <div className="insight-panel" aria-live="polite">
          <div className="insight-panel__label">
            <Brain size={14} />
            Area Manager Insight
          </div>
          <ul>
            {insight.insight.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Split view */}
      <div className="dashboard-split">
        <CasesSection
          title="Planning Enforcement"
          cases={data.planning_cases}
          domain="planning"
          onNavigate={(id) => navigate(`/case/${id}`)}
        />
        <CasesSection
          title="Street Reporting"
          cases={data.street_cases}
          domain="street"
          onNavigate={(id) => navigate(`/case/${id}`)}
        />
      </div>

      {/* All flagged cases */}
      {data.flagged_cases.length > 0 && (
        <div className="govuk-panel" style={{ marginTop: 24 }}>
          <div className="govuk-panel__title">
            <AlertCircle size={14} />
            All Cases Requiring Attention
          </div>
          {data.flagged_cases.map((c) => (
            <CaseRow
              key={c.case_id}
              c={c}
              onClick={() => navigate(`/case/${c.case_id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
