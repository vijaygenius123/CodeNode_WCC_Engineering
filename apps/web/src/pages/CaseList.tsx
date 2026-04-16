import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { useApi } from "../hooks/useApi";
import type { CaseListItem, FlagSeverity } from "../types";

interface CasesResponse {
  cases: CaseListItem[];
  total: number;
}

function severityBadge(severity: FlagSeverity | null, count: number) {
  if (count === 0)
    return <span className="flag-badge flag-badge--none">No flags</span>;
  const cls = `flag-badge flag-badge--${severity ?? "none"}`;
  return (
    <span className={cls}>
      <AlertCircle size={12} />
      {count} flag{count !== 1 ? "s" : ""}
    </span>
  );
}

function priorityTag(p: string) {
  const cls =
    p === "critical"
      ? "govuk-tag govuk-tag--critical"
      : p === "high"
        ? "govuk-tag govuk-tag--high"
        : p === "standard"
          ? "govuk-tag govuk-tag--standard"
          : "govuk-tag govuk-tag--grey";
  return <span className={cls}>{p}</span>;
}

function formatCaseType(t: string) {
  return t.replace(/_/g, " ");
}

function formatStatus(s: string) {
  return s.replace(/_/g, " ");
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

  const { data, loading, error } = useApi<CasesResponse>(
    `/api/cases?domain=${domain}`
  );

  if (loading)
    return (
      <div className="govuk-width-container">
        <div className="loading-state">Loading cases…</div>
      </div>
    );

  if (error)
    return (
      <div className="govuk-width-container">
        <div className="error-state">Failed to load cases: {error}</div>
      </div>
    );

  const cases = data?.cases ?? [];

  return (
    <div className="govuk-width-container">
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

      <table className="case-table" aria-label="Case list">
        <thead>
          <tr>
            <th scope="col">Case ID</th>
            <th scope="col">Type</th>
            <th scope="col">Status</th>
            <th scope="col">Priority</th>
            <th scope="col">Location</th>
            <th scope="col">Ward</th>
            <th scope="col">Flags</th>
            <th scope="col">Domain</th>
            <th scope="col">Updated</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr
              key={c.case_id}
              className={`case-row--${c.domain}`}
              onClick={() => navigate(`/case/${c.case_id}`)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  navigate(`/case/${c.case_id}`);
              }}
              aria-label={`Open case ${c.case_id}`}
            >
              <td>
                <span className="case-id">{c.case_id}</span>
              </td>
              <td>
                <span className="case-type-label">
                  {formatCaseType(c.case_type)}
                </span>
              </td>
              <td>
                <span className="govuk-tag govuk-tag--grey">
                  {formatStatus(c.status)}
                </span>
              </td>
              <td>{priorityTag(c.priority)}</td>
              <td>
                <div style={{ fontSize: "0.85rem" }}>{c.location.street}</div>
                <div className="text-grey text-small">{c.location.postcode}</div>
              </td>
              <td className="text-small text-grey">{c.reporter_ward}</td>
              <td>{severityBadge(c.max_severity, c.flag_count)}</td>
              <td>
                <span
                  className={`govuk-tag govuk-tag--${c.domain}`}
                >
                  {c.domain}
                </span>
              </td>
              <td className="text-small text-grey">
                {formatDate(c.last_updated)}
              </td>
            </tr>
          ))}

          {cases.length === 0 && (
            <tr>
              <td colSpan={9} style={{ textAlign: "center", color: "var(--govuk-grey)", padding: "32px" }}>
                No cases found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
