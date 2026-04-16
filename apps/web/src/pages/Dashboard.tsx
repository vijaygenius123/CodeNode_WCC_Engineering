import { useNavigate } from "react-router-dom";
import { AlertCircle, AlertTriangle, Brain, Building2, MapPin, Users } from "lucide-react";
import { useApi } from "../hooks/useApi";
import CaseMap from "../components/CaseMap";
import type { CaseListItem, DashboardResponse } from "../types";

interface InsightResponse {
  insight: string[];
}

interface WorkloadWorker {
  caseworker: string;
  total: number;
  critical: number;
  high: number;
  overdue: number;
  resolved: number;
}

interface WorkloadResponse {
  caseworkers: WorkloadWorker[];
  needs_help: { caseworker: string; reason: string }[];
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
  const { data: workload } = useApi<WorkloadResponse>(
    "/api/dashboard/workload"
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

      {/* Caseworker Workload */}
      {workload && (
        <div className="govuk-panel" style={{ marginBottom: 24 }}>
          <div className="govuk-panel__title">
            <Users size={16} />
            Caseworker Workload
          </div>

          {workload.needs_help.length > 0 && (
            <div
              style={{
                background: "#fef3cd",
                border: "1px solid #f0ad4e",
                borderRadius: 4,
                padding: "10px 14px",
                marginBottom: 16,
                fontSize: "0.88rem",
              }}
              role="alert"
            >
              <strong>
                <AlertTriangle
                  size={14}
                  style={{ verticalAlign: "middle", marginRight: 4 }}
                />
                {workload.needs_help.length} caseworker(s) need support:
              </strong>
              <ul style={{ margin: "6px 0 0 20px", padding: 0 }}>
                {workload.needs_help.map((h) => (
                  <li key={h.caseworker}>
                    <strong>{h.caseworker}</strong> — {h.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <table className="case-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Caseworker</th>
                <th style={{ textAlign: "center" }}>Active</th>
                <th style={{ textAlign: "center" }}>Critical</th>
                <th style={{ textAlign: "center" }}>Overdue</th>
                <th style={{ textAlign: "center" }}>Resolved</th>
                <th>Workload</th>
              </tr>
            </thead>
            <tbody>
              {workload.caseworkers.map((w) => {
                const activeCount = w.total - w.resolved;
                const load =
                  w.critical >= 3
                    ? "heavy"
                    : w.overdue >= 5
                      ? "heavy"
                      : activeCount >= 12
                        ? "medium"
                        : "light";
                return (
                  <tr
                    key={w.caseworker}
                    onClick={() =>
                      navigate(`/?caseworker=${encodeURIComponent(w.caseworker)}`)
                    }
                    style={{ cursor: "pointer" }}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        navigate(
                          `/?caseworker=${encodeURIComponent(w.caseworker)}`
                        );
                    }}
                  >
                    <td>
                      <strong>{w.caseworker}</strong>
                    </td>
                    <td style={{ textAlign: "center" }}>{activeCount}</td>
                    <td style={{ textAlign: "center" }}>
                      {w.critical > 0 ? (
                        <span className="flag-badge flag-badge--critical">
                          {w.critical}
                        </span>
                      ) : (
                        "0"
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {w.overdue > 0 ? (
                        <span className="flag-badge flag-badge--high">
                          {w.overdue}
                        </span>
                      ) : (
                        "0"
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>{w.resolved}</td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <div
                          style={{
                            flex: 1,
                            height: 8,
                            background: "#e0e0e0",
                            borderRadius: 4,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.min((activeCount / 20) * 100, 100)}%`,
                              height: "100%",
                              background:
                                load === "heavy"
                                  ? "var(--govuk-red)"
                                  : load === "medium"
                                    ? "var(--govuk-orange)"
                                    : "var(--govuk-green)",
                              borderRadius: 4,
                            }}
                          />
                        </div>
                        <span
                          className="text-small"
                          style={{
                            color:
                              load === "heavy"
                                ? "var(--govuk-red)"
                                : load === "medium"
                                  ? "var(--govuk-orange)"
                                  : "var(--govuk-green)",
                            fontWeight: 700,
                            width: 50,
                            textAlign: "right",
                          }}
                        >
                          {load === "heavy"
                            ? "Heavy"
                            : load === "medium"
                              ? "Medium"
                              : "Light"}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Case Map */}
      {data.flagged_cases.length > 0 && (
        <div className="govuk-panel" style={{ marginBottom: 24 }}>
          <div className="govuk-panel__title">
            <MapPin size={14} /> Case Distribution Map
          </div>
          <CaseMap
            cases={[...data.planning_cases, ...data.street_cases]}
            height={350}
            onCaseClick={(id) => navigate(`/case/${id}`)}
          />
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
