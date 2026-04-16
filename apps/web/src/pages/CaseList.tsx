import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Map as MapIcon, List } from "lucide-react";
import { useApi } from "../hooks/useApi";
import CaseMap from "../components/CaseMap";
import type { CaseListItem, FlagSeverity } from "../types";

interface CasesResponse {
  cases: CaseListItem[];
  total: number;
}

function severityTag(severity: FlagSeverity | null, count: number) {
  if (count === 0) return <strong className="govuk-tag govuk-tag--grey">No flags</strong>;
  if (severity === "critical")
    return <strong className="govuk-tag govuk-tag--red">{count} flag{count !== 1 ? "s" : ""} — critical</strong>;
  if (severity === "high")
    return <strong className="govuk-tag govuk-tag--orange">{count} flag{count !== 1 ? "s" : ""} — high</strong>;
  return <strong className="govuk-tag govuk-tag--blue">{count} flag{count !== 1 ? "s" : ""}</strong>;
}

function priorityTag(p: string) {
  if (p === "critical") return <strong className="govuk-tag govuk-tag--red">{p}</strong>;
  if (p === "high")     return <strong className="govuk-tag govuk-tag--orange">{p}</strong>;
  if (p === "standard") return <strong className="govuk-tag govuk-tag--blue">{p}</strong>;
  return <strong className="govuk-tag govuk-tag--grey">{p}</strong>;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function CaseList() {
  const [searchParams] = useSearchParams();
  const domain = searchParams.get("domain") ?? "all";
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  const { data, loading, error } = useApi<CasesResponse>(`/api/cases?domain=${domain}`);

  if (loading) {
    return (
      <div className="govuk-width-container">
        <p className="govuk-body">Loading cases…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="govuk-width-container">
        <div className="govuk-error-summary" role="alert">
          <h2 className="govuk-error-summary__title">There is a problem</h2>
          <div className="govuk-error-summary__body">
            <p className="govuk-body">Failed to load cases: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  const cases = data?.cases ?? [];

  return (
    <div className="govuk-width-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 className="govuk-heading-xl mb-0">
          Cases
          <span
            className="govuk-caption"
            style={{ fontWeight: 400, fontSize: "1rem", marginLeft: 12 }}
          >
            {cases.length} result{cases.length !== 1 ? "s" : ""}
            {domain !== "all" ? ` · ${domain}` : ""}
          </span>
        </h1>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            className={`domain-tab${viewMode === "list" ? " domain-tab--active" : ""}`}
            onClick={() => setViewMode("list")}
            style={{ padding: "6px 12px" }}
          >
            <List size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
            List
          </button>
          <button
            className={`domain-tab${viewMode === "map" ? " domain-tab--active" : ""}`}
            onClick={() => setViewMode("map")}
            style={{ padding: "6px 12px" }}
          >
            <MapIcon size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
            Map
          </button>
        </div>
      </div>

      {viewMode === "map" && (
        <div style={{ marginBottom: 20 }}>
          <CaseMap
            cases={cases}
            height={450}
            onCaseClick={(id) => navigate(`/case/${id}`)}
          />
        </div>
      )}

      <table className="govuk-table" aria-label="Case list">
        <thead className="govuk-table__head">
          <tr className="govuk-table__row">
            <th scope="col" className="govuk-table__header">Case ID</th>
            <th scope="col" className="govuk-table__header">Type</th>
            <th scope="col" className="govuk-table__header">Status</th>
            <th scope="col" className="govuk-table__header">Priority</th>
            <th scope="col" className="govuk-table__header">Location</th>
            <th scope="col" className="govuk-table__header">Ward</th>
            <th scope="col" className="govuk-table__header">Flags</th>
            <th scope="col" className="govuk-table__header">Domain</th>
            <th scope="col" className="govuk-table__header">Updated</th>
          </tr>
        </thead>
        <tbody className="govuk-table__body">
          {cases.map((c) => (
            <tr
              key={c.case_id}
              className={`govuk-table__row govuk-table__row--clickable govuk-table__row--${c.domain}`}
              onClick={() => navigate(`/case/${c.case_id}`)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") navigate(`/case/${c.case_id}`);
              }}
              aria-label={`Open case ${c.case_id}`}
            >
              <td className="govuk-table__cell">
                <a
                  className="govuk-link govuk-link--no-visited-state"
                  href={`/case/${c.case_id}`}
                  onClick={(e) => { e.preventDefault(); navigate(`/case/${c.case_id}`); }}
                >
                  {c.case_id}
                </a>
              </td>
              <td className="govuk-table__cell">{c.case_type.replace(/_/g, " ")}</td>
              <td className="govuk-table__cell">
                <strong className="govuk-tag govuk-tag--grey">{c.status.replace(/_/g, " ")}</strong>
              </td>
              <td className="govuk-table__cell">{priorityTag(c.priority)}</td>
              <td className="govuk-table__cell">
                <div>{c.location.street}</div>
                <div className="govuk-hint govuk-!-margin-0" style={{ fontSize: "0.875rem" }}>{c.location.postcode}</div>
              </td>
              <td className="govuk-table__cell govuk-body-s">{c.reporter_ward}</td>
              <td className="govuk-table__cell">{severityTag(c.max_severity, c.flag_count)}</td>
              <td className="govuk-table__cell">
                <strong className={`govuk-tag govuk-tag--${c.domain}`}>{c.domain}</strong>
              </td>
              <td className="govuk-table__cell govuk-body-s">{formatDate(c.last_updated)}</td>
            </tr>
          ))}

          {cases.length === 0 && (
            <tr className="govuk-table__row">
              <td colSpan={9} className="govuk-table__cell" style={{ textAlign: "center", color: "#505a5f" }}>
                No cases found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
