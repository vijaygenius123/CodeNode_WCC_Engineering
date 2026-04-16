import { useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, MessageSquare, Search, Send } from "lucide-react";
import { useApi } from "../hooks/useApi";
import { useRole } from "../context/RoleContext";

const BASE_URL = import.meta.env.VITE_API_URL ?? "";

interface Policy {
  policy_id: string;
  title: string;
  body: string;
  applicable_case_types: string[];
}

interface PoliciesResponse {
  total: number;
  planning_count: number;
  street_count: number;
  policies: Policy[];
}

export default function PolicyAdmin() {
  const { role } = useRole();
  const { data, loading, error } = useApi<PoliciesResponse>("/api/admin/policies");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [queryAnswer, setQueryAnswer] = useState<string | null>(null);
  const [querying, setQuerying] = useState(false);
  const [filter, setFilter] = useState<"all" | "planning" | "street">("all");

  async function handleQuery(e: React.FormEvent) {
    e.preventDefault();
    if (!queryInput.trim()) return;

    setQuerying(true);
    setQueryAnswer(null);

    try {
      const res = await fetch(`${BASE_URL}/api/admin/policies/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CaseView-Role": role,
        },
        body: JSON.stringify({ question: queryInput.trim() }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const body = (await res.json()) as { answer: string };
      setQueryAnswer(body.answer);
    } catch {
      setQueryAnswer("Unable to process your query. Please try again.");
    } finally {
      setQuerying(false);
    }
  }

  const policies = data?.policies ?? [];
  const filtered = policies.filter((p) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "planning" && p.policy_id.startsWith("POL-PE")) ||
      (filter === "street" && !p.policy_id.startsWith("POL-PE"));
    const matchesSearch =
      !searchTerm ||
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.policy_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.body.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="govuk-width-container">
        <div className="skeleton skeleton-panel" />
        <div className="skeleton skeleton-panel" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="govuk-width-container">
        <div className="error-state" role="alert">{error}</div>
      </div>
    );
  }

  return (
    <div className="govuk-width-container">
      <h1 className="govuk-heading-xl">
        <BookOpen size={28} style={{ verticalAlign: "middle", marginRight: 8 }} />
        Policy Library
      </h1>

      <div className="summary-cards" style={{ marginBottom: 24, gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="summary-card">
          <div className="summary-card__label">Total Policies</div>
          <div className="summary-card__value">{data?.total ?? 0}</div>
        </div>
        <div className="summary-card" style={{ borderTop: "3px solid var(--govuk-purple)" }}>
          <div className="summary-card__label">Planning</div>
          <div className="summary-card__value">{data?.planning_count ?? 0}</div>
        </div>
        <div className="summary-card" style={{ borderTop: "3px solid var(--govuk-blue)" }}>
          <div className="summary-card__label">Street</div>
          <div className="summary-card__value">{data?.street_count ?? 0}</div>
        </div>
      </div>

      {/* RAG Q&A Panel */}
      <div
        className="case-section"
        style={{
          marginBottom: 24,
          background: "#f0f4f8",
          border: "1px solid #b1c4de",
        }}
      >
        <h2 className="govuk-heading-m" style={{ marginBottom: 8 }}>
          <MessageSquare size={18} style={{ verticalAlign: "middle", marginRight: 6 }} />
          Ask about policies
        </h2>
        <p className="govuk-body-s text-grey" style={{ marginBottom: 12 }}>
          Query the full policy library using natural language. Claude will cite
          specific policy IDs, SLA deadlines, and required actions.
        </p>

        <form onSubmit={(e) => void handleQuery(e)} style={{ display: "flex", gap: 8 }}>
          <input
            className="govuk-input"
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="e.g. What is the deadline for submitting a prosecution file for listed building offences?"
            style={{ flex: 1 }}
            aria-label="Policy question"
          />
          <button
            type="submit"
            className="govuk-button"
            disabled={querying || !queryInput.trim()}
          >
            {querying ? (
              "Thinking..."
            ) : (
              <>
                <Send size={14} style={{ marginRight: 4 }} /> Ask
              </>
            )}
          </button>
        </form>

        {queryAnswer && (
          <div
            className="case-section"
            style={{
              marginTop: 12,
              background: "#fff",
              border: "1px solid #d0d0d0",
              whiteSpace: "pre-wrap",
              fontSize: "0.9rem",
              lineHeight: 1.6,
            }}
            role="status"
            aria-live="polite"
          >
            {queryAnswer}
          </div>
        )}
      </div>

      {/* Search + Filter */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--govuk-grey)",
            }}
          />
          <input
            className="govuk-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search policies..."
            style={{ paddingLeft: 32 }}
            aria-label="Search policies"
          />
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {(["all", "planning", "street"] as const).map((f) => (
            <button
              key={f}
              className={`domain-tab${filter === f ? " domain-tab--active" : ""}`}
              onClick={() => setFilter(f)}
              style={{ padding: "6px 14px", fontSize: "0.85rem" }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Policy List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((policy) => {
          const isExpanded = expandedId === policy.policy_id;
          const isPlanning = policy.policy_id.startsWith("POL-PE");

          return (
            <div
              key={policy.policy_id}
              className="case-section"
              style={{
                borderLeft: `4px solid ${isPlanning ? "var(--govuk-purple)" : "var(--govuk-blue)"}`,
                cursor: "pointer",
              }}
            >
              <div
                onClick={() =>
                  setExpandedId(isExpanded ? null : policy.policy_id)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setExpandedId(isExpanded ? null : policy.policy_id);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-expanded={isExpanded}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                {isExpanded ? (
                  <ChevronDown size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                ) : (
                  <ChevronRight size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span className="govuk-tag" style={{ fontSize: "0.75rem" }}>
                      {policy.policy_id}
                    </span>
                    <span
                      className={`govuk-tag govuk-tag--${isPlanning ? "planning" : "street"}`}
                      style={{ fontSize: "0.7rem" }}
                    >
                      {isPlanning ? "Planning" : "Street"}
                    </span>
                  </div>
                  <h3
                    className="govuk-heading-s"
                    style={{ margin: "6px 0 0 0" }}
                  >
                    {policy.title}
                  </h3>
                  {!isExpanded && (
                    <p
                      className="govuk-body-s text-grey"
                      style={{ margin: "4px 0 0 0" }}
                    >
                      Applies to:{" "}
                      {policy.applicable_case_types
                        .map((t) => t.replace(/_/g, " "))
                        .join(", ")}
                    </p>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div style={{ marginTop: 12, paddingLeft: 26 }}>
                  <p className="govuk-body-s" style={{ marginBottom: 8 }}>
                    <strong>Applies to:</strong>{" "}
                    {policy.applicable_case_types.map((t) => (
                      <span
                        key={t}
                        className="govuk-tag"
                        style={{
                          fontSize: "0.7rem",
                          marginRight: 4,
                          marginBottom: 4,
                          display: "inline-block",
                        }}
                      >
                        {t.replace(/_/g, " ")}
                      </span>
                    ))}
                  </p>
                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      fontSize: "0.88rem",
                      lineHeight: 1.7,
                      background: "var(--govuk-light-grey)",
                      padding: 16,
                      borderRadius: 4,
                    }}
                  >
                    {policy.body}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="govuk-body text-grey" style={{ textAlign: "center", marginTop: 24 }}>
          No policies match your search.
        </p>
      )}
    </div>
  );
}
