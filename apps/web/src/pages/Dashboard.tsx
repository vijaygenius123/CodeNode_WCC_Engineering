import { useNavigate } from "react-router-dom";
import { MapPin, Users } from "lucide-react";
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

function flagTag(severity: CaseListItem["max_severity"], count: number) {
  if (count === 0) return <strong className="govuk-tag govuk-tag--grey">No flags</strong>;
  if (severity === "critical") return <strong className="govuk-tag govuk-tag--red">{count} critical</strong>;
  if (severity === "high")     return <strong className="govuk-tag govuk-tag--orange">{count} high</strong>;
  return <strong className="govuk-tag govuk-tag--blue">{count} flag{count !== 1 ? "s" : ""}</strong>;
}

function CaseRow({ c, onClick }: { c: CaseListItem; onClick: () => void }) {
  return (
    <div
      className="govuk-summary-list__row"
      style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #b1b4b6", gap: 10 }}
      onClick={onClick}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      role="button"
      aria-label={`Open case ${c.case_id}`}
    >
      <div>
        <a
          className="govuk-link govuk-link--no-visited-state"
          href={`/case/${c.case_id}`}
          onClick={(e) => { e.preventDefault(); onClick(); }}
          style={{ fontWeight: 700, marginRight: 10 }}
        >
          {c.case_id}
        </a>
        <span className="govuk-body-s" style={{ color: "#505a5f" }}>
          {c.case_type.replace(/_/g, " ")}
        </span>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
        {flagTag(c.max_severity, c.flag_count)}
        <strong className={`govuk-tag govuk-tag--${c.domain}`}>{c.domain}</strong>
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
    <div className={`dashboard-section--${domain}`}>
      <div className="dashboard-section__heading">
        <h2 className="govuk-heading-m govuk-!-margin-0">
          {title}
          <strong className="govuk-tag govuk-tag--grey govuk-!-margin-left-2">{cases.length}</strong>
        </h2>
      </div>

      {flagged.length === 0 ? (
        <p className="govuk-body govuk-hint">No flagged cases.</p>
      ) : (
        <div>
          {flagged.map((c) => (
            <CaseRow key={c.case_id} c={c} onClick={() => onNavigate(c.case_id)} />
          ))}
        </div>
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

  if (loading) {
    return (
      <div className="govuk-width-container">
        <p className="govuk-body">Loading dashboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="govuk-width-container">
        <div className="govuk-error-summary" role="alert">
          <h2 className="govuk-error-summary__title">There is a problem</h2>
          <div className="govuk-error-summary__body">
            <p className="govuk-body">Failed to load dashboard: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="govuk-width-container">
      <h1 className="govuk-heading-xl">Team Leader Dashboard</h1>

      {/* Summary cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-card__value">{data.total_cases}</div>
          <div className="summary-card__label">Total cases</div>
        </div>
        <div className="summary-card summary-card--critical">
          <div className="summary-card__value">{data.planning_critical}</div>
          <div className="summary-card__label">Planning critical</div>
        </div>
        <div className="summary-card summary-card--critical">
          <div className="summary-card__value">{data.street_critical}</div>
          <div className="summary-card__label">Street critical</div>
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
          <p className="insight-panel__label govuk-!-margin-0">Area Manager Insight</p>
          <ul className="govuk-list govuk-list--bullet">
            {insight.insight.map((line, i) => (
              <li key={i} className="govuk-body">{line}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Caseworker Workload */}
      {workload && (
        <div className="case-section" style={{ marginBottom: 20 }}>
          <div className="case-section__title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Users size={14} aria-hidden="true" />
            Caseworker Workload
          </div>

          {workload.needs_help.length > 0 && (
            <div className="govuk-warning-text govuk-!-margin-bottom-4" role="alert">
              <span className="govuk-warning-text__icon" aria-hidden="true">!</span>
              <strong className="govuk-warning-text__text">
                <span className="govuk-visually-hidden">Warning</span>
                {workload.needs_help.length} caseworker{workload.needs_help.length !== 1 ? "s" : ""} need support:{" "}
                {workload.needs_help.map((h, i) => (
                  <span key={h.caseworker}>
                    {i > 0 && ", "}
                    <strong>{h.caseworker}</strong> ({h.reason})
                  </span>
                ))}
              </strong>
            </div>
          )}

          <table className="govuk-table govuk-!-margin-bottom-0">
            <thead className="govuk-table__head">
              <tr className="govuk-table__row">
                <th scope="col" className="govuk-table__header" style={{ minWidth: 140 }}>Caseworker</th>
                <th scope="col" className="govuk-table__header govuk-table__header--numeric">Active</th>
                <th scope="col" className="govuk-table__header govuk-table__header--numeric">Critical</th>
                <th scope="col" className="govuk-table__header govuk-table__header--numeric">Overdue</th>
                <th scope="col" className="govuk-table__header govuk-table__header--numeric">Resolved</th>
                <th scope="col" className="govuk-table__header" style={{ width: 180 }}>Workload</th>
              </tr>
            </thead>
            <tbody className="govuk-table__body">
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
                const loadColor = load === "heavy" ? "#d4351c" : load === "medium" ? "#f47738" : "#00703c";
                return (
                  <tr
                    key={w.caseworker}
                    className="govuk-table__row govuk-table__row--clickable"
                    onClick={() => navigate(`/?caseworker=${encodeURIComponent(w.caseworker)}`)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") navigate(`/?caseworker=${encodeURIComponent(w.caseworker)}`);
                    }}
                  >
                    <td className="govuk-table__cell">
                      <strong>{w.caseworker}</strong>
                    </td>
                    <td className="govuk-table__cell govuk-table__cell--numeric">{activeCount}</td>
                    <td className="govuk-table__cell govuk-table__cell--numeric">
                      {w.critical > 0
                        ? <strong className="govuk-tag govuk-tag--red">{w.critical}</strong>
                        : <span className="govuk-hint govuk-!-margin-0">0</span>}
                    </td>
                    <td className="govuk-table__cell govuk-table__cell--numeric">
                      {w.overdue > 0
                        ? <strong className="govuk-tag govuk-tag--orange">{w.overdue}</strong>
                        : <span className="govuk-hint govuk-!-margin-0">0</span>}
                    </td>
                    <td className="govuk-table__cell govuk-table__cell--numeric">{w.resolved}</td>
                    <td className="govuk-table__cell">
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 8, background: "#e8e9ea", borderRadius: 2, overflow: "hidden", minWidth: 80 }}>
                          <div style={{
                            width: `${Math.min((activeCount / 20) * 100, 100)}%`,
                            height: "100%",
                            background: loadColor,
                            borderRadius: 2,
                          }} />
                        </div>
                        <span style={{ color: loadColor, fontWeight: 700, fontSize: "0.8125rem", width: 44, textAlign: "right", flexShrink: 0 }}>
                          {load === "heavy" ? "Heavy" : load === "medium" ? "Medium" : "Light"}
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
        <div className="govuk-!-margin-top-6">
          <h2 className="govuk-heading-m">All cases requiring attention</h2>
          {data.flagged_cases.map((c) => (
            <CaseRow
              key={`flagged-${c.case_id}`}
              c={c}
              onClick={() => navigate(`/case/${c.case_id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
