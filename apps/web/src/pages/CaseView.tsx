import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MessageSquare, Send } from "lucide-react";
import { useApi, postMessage } from "../hooks/useApi";
import { useRole } from "../context/RoleContext";
import type {
  CaseDetailResponse,
  CaseDomain,
  LayoutComponent,
} from "../types";

const PLANNING_TYPES = new Set([
  "unauthorised_construction",
  "listed_building_breach",
  "change_of_use",
  "breach_of_conditions",
]);

function getCaseDomain(caseType: string): CaseDomain {
  return PLANNING_TYPES.has(caseType) ? "planning" : "street";
}

// ─── Case sub-components ─────────────────────────────────────────────────────
import NudgeBanner from "../components/case/NudgeBanner";
import FlagsPanel from "../components/case/FlagsPanel";
import AISummary from "../components/case/AISummary";
import Timeline from "../components/case/Timeline";
import PolicyPanel from "../components/case/PolicyPanel";
import CaseNotes from "../components/case/CaseNotes";
import WorkflowStateComp from "../components/case/WorkflowState";
import DuplicatePanel from "../components/case/DuplicatePanel";
import ContractorInfo from "../components/case/ContractorInfo";
import LocationMap from "../components/case/LocationMap";
import EvidenceTracker from "../components/case/EvidenceTracker";
import NudgeActions from "../components/case/NudgeActions";
import EscalationHistory from "../components/case/EscalationHistory";
import ResidentImpact from "../components/case/ResidentImpact";
import PlanningInfo from "../components/case/PlanningInfo";

// ─── Component registry ──────────────────────────────────────────────────────

type Renderer = (data: CaseDetailResponse) => React.ReactNode;

function buildRegistry(data: CaseDetailResponse): Record<string, Renderer> {
  const { case_data: c, flags, matched_policies, workflow, nudges, layout, ai_summary } = data;

  return {
    nudge_banner: () =>
      layout.nudge_text ? (
        <NudgeBanner text={layout.nudge_text} nudges={nudges} />
      ) : null,
    flags_panel: () => <FlagsPanel flags={flags} />,
    ai_summary: () => (
      <AISummary aiSummary={ai_summary} caseData={c} flags={flags} />
    ),
    timeline: () => (
      <Timeline events={c.timeline} createdDate={c.created_date} />
    ),
    policy_panel: () => (
      <PolicyPanel policies={matched_policies} flags={flags} />
    ),
    case_notes: () => <CaseNotes notes={c.case_notes} />,
    workflow_state: () => (
      <WorkflowStateComp workflow={workflow} caseType={c.case_type} />
    ),
    duplicate_panel: () => (
      <DuplicatePanel duplicateCount={c.duplicate_count} caseId={c.case_id} />
    ),
    contractor_info: () => (
      <ContractorInfo contractor={c.contractor} lastUpdated={c.last_updated} />
    ),
    location_map: () => (
      <LocationMap
        location={c.location}
        ward={c.reporter.ward}
        conservationArea={c.conservation_area}
        listedBuilding={c.listed_building}
        listedGrade={c.listed_grade}
      />
    ),
    evidence_tracker: () => (
      <EvidenceTracker
        timeline={c.timeline}
        requiredActions={workflow?.requiredActions ?? []}
        flags={flags}
      />
    ),
    nudge_actions: () => <NudgeActions nudges={nudges} />,
    escalation_history: () => <EscalationHistory timeline={c.timeline} />,
    resident_impact: () => (
      <ResidentImpact
        duplicateCount={c.duplicate_count}
        caseType={c.case_type}
        ward={c.reporter.ward}
      />
    ),
    planning_info: () => (
      <PlanningInfo caseData={c} policies={matched_policies} />
    ),
  };
}

// ─── Panel titles ─────────────────────────────────────────────────────────────

const PANEL_TITLES: Record<string, string> = {
  nudge_banner: "",
  flags_panel: "Flags",
  ai_summary: "Case Summary",
  timeline: "Timeline",
  policy_panel: "Applicable Policies",
  case_notes: "Case Notes",
  workflow_state: "Workflow",
  duplicate_panel: "Linked Reports",
  contractor_info: "Contractor",
  location_map: "Location",
  evidence_tracker: "Evidence Tracker",
  nudge_actions: "Recommended Actions",
  escalation_history: "Escalation History",
  resident_impact: "Community Impact",
  planning_info: "Planning Details",
};

// ─── Single panel wrapper ─────────────────────────────────────────────────────

function CasePanel({
  component,
  data,
  registry,
}: {
  component: LayoutComponent;
  data: CaseDetailResponse;
  registry: Record<string, Renderer>;
}) {
  const { name, emphasis } = component;
  const render = registry[name];
  if (!render) return null;
  const content = render(data);
  if (content === null || content === undefined) return null;

  if (name === "nudge_banner") return <>{content}</>;

  const panelCls = [
    "govuk-panel",
    emphasis === "critical" ? "govuk-panel--critical emphasis-critical" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const title = PANEL_TITLES[name];

  if (emphasis === "collapsed") {
    return (
      <details className={`govuk-panel emphasis-collapsed`}>
        <summary>
          {title || name.replace(/_/g, " ")}
          <span
            className="text-grey text-small"
            style={{ fontWeight: 400 }}
          >
            ▸ expand
          </span>
        </summary>
        {content}
      </details>
    );
  }

  return (
    <div className={panelCls}>
      {title && <div className="govuk-panel__title">{title}</div>}
      {content}
    </div>
  );
}

// ─── Chat panel ──────────────────────────────────────────────────────────────

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

function ChatPanel({ caseId }: { caseId: string }) {
  const { role } = useRole();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const msg = input.trim();
    setInput("");
    setMsgs((prev) => [...prev, { role: "user", content: msg }]);
    setSending(true);
    try {
      const reply = await postMessage(caseId, msg, role);
      setMsgs((prev) => [
        ...prev,
        { role: "assistant", content: reply.content },
      ]);
    } catch {
      setMsgs((prev) => [
        ...prev,
        { role: "assistant", content: "Unable to respond. Check the backend is running." },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ marginTop: 24 }}>
      <button
        className="govuk-button govuk-button--secondary"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <MessageSquare size={15} style={{ marginRight: 6, verticalAlign: "middle" }} />
        {open ? "Close chat" : "Ask the officer agent"}
      </button>

      {open && (
        <div className="chat-panel">
          <div className="chat-messages" aria-live="polite">
            {msgs.length === 0 && (
              <p className="text-grey text-small" style={{ textAlign: "center" }}>
                Ask a question about this case.
              </p>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`chat-message chat-message--${m.role}`}>
                {m.content}
              </div>
            ))}
            {sending && (
              <div className="chat-message chat-message--assistant text-grey">…</div>
            )}
          </div>
          <form className="chat-input-row" onSubmit={handleSend}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a question…"
              aria-label="Chat message"
              disabled={sending}
            />
            <button
              type="submit"
              className="govuk-button"
              disabled={sending || !input.trim()}
              aria-label="Send message"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function CaseView() {
  const { caseId } = useParams<{ caseId: string }>();

  const { data, loading, error } = useApi<CaseDetailResponse>(
    caseId ? `/api/cases/${caseId}/view` : null
  );

  if (loading)
    return (
      <div className="govuk-width-container">
        <div className="loading-state">Loading case {caseId}…</div>
      </div>
    );

  if (error)
    return (
      <div className="govuk-width-container">
        <Link to="/" className="govuk-body-s">
          ← Back to cases
        </Link>
        <div className="error-state" style={{ marginTop: 12 }}>
          {error}
        </div>
      </div>
    );

  if (!data) return null;

  const c = data.case_data;
  const registry = buildRegistry(data);
  const hasCritical = data.flags.some((f) => f.severity === "critical");
  const isHeritage = c.listed_building === true;

  return (
    <>
      {/* Sticky case header */}
      <div className={`case-header${isHeritage ? " case-header--heritage" : ""}`}>
        <div className="case-header__top">
          <div>
            <Link to="/" className="govuk-body-s text-grey" style={{ display: "block", marginBottom: 4 }}>
              ← Cases
            </Link>
            <div className="case-header__id">{c.case_id}</div>
            <div className="case-header__meta">
              <span className="text-grey text-small">
                {c.case_type.replace(/_/g, " ")}
              </span>
            </div>
          </div>
          <div className="case-header__badges">
            <span className="govuk-tag govuk-tag--grey">
              {c.status.replace(/_/g, " ")}
            </span>
            <span className={`govuk-tag govuk-tag--${getCaseDomain(c.case_type)}`}>
              {getCaseDomain(c.case_type)}
            </span>
            {hasCritical && (
              <span className="govuk-tag govuk-tag--critical">
                {data.flags.filter((f) => f.severity === "critical").length} critical
              </span>
            )}
            {isHeritage && (
              <span className="govuk-tag govuk-tag--heritage">
                Listed {c.listed_grade}
              </span>
            )}
            {c.conservation_area && (
              <span className="govuk-tag govuk-tag--planning">
                Conservation Area
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Components rendered in AI-determined order */}
      <div className="govuk-width-container">
        {data.layout.components.map((comp, i) => (
          <CasePanel
            key={`${comp.name}-${i}`}
            component={comp}
            data={data}
            registry={registry}
          />
        ))}

        <ChatPanel caseId={c.case_id} />
      </div>
    </>
  );
}
