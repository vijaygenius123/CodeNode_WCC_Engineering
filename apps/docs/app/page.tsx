import Mermaid from "./components/Mermaid";

const THREE_PROBLEMS = `graph TB
    subgraph "The Three Problems - Challenge 3 Brief"
        P1["Information Problem\\nCase data scattered across\\nsystems, notes, emails"]
        P2["Policy Problem\\nWhich policy applies?\\n40-page doc, unclear version"]
        P3["Workflow Problem\\nWhere is the case?\\nWhat deadline is approaching?"]
    end

    subgraph "CaseView Solutions"
        S1["Generative UI Engine\\n15 components composed per case\\nMost important info FIRST"]
        S2["Policy Matcher + RAG Q&A\\nAuto-match by case_type\\nClaude-powered policy queries"]
        S3["Flag Engine + Workflow Engine\\n14 flag types detect breaches\\nNudge banners say what to do next"]
    end

    P1 --> S1
    P2 --> S2
    P3 --> S3

    style P1 fill:#d4351c,color:#fff
    style P2 fill:#f47738,color:#fff
    style P3 fill:#1d70b8,color:#fff
    style S1 fill:#00703c,color:#fff
    style S2 fill:#00703c,color:#fff
    style S3 fill:#00703c,color:#fff`;

const SYSTEM_ARCH = `graph LR
    subgraph "Data Sources"
        D1[("cases.json\\n14 cases")]
        D2[("policies.json\\n15 policies")]
        D3[("workflows.json\\n13 workflows")]
        D5[("Future: Dynamics 365")]
        D6[("Future: Planning Portal")]
    end

    subgraph "@repo/core Engines"
        FE["Flag Engine\\n8 planning + 6 street"]
        PM["Policy Matcher"]
        WE["Workflow Engine"]
        NE["Nudge Engine"]
        GU["Generative UI"]
        RS["Resident Service"]
    end

    subgraph "Claude Layer"
        CS["3 Role Agents"]
        PQ["Policy RAG Q&A"]
    end

    subgraph "API"
        API["Express.js\\n11 endpoints + RBAC"]
    end

    subgraph "Frontend"
        UI["Vite + React\\n5 pages, 15 components"]
    end

    D1 & D2 & D3 --> API
    D5 & D6 -.-> API
    API --> FE & PM & WE & NE & GU & RS
    API --> CS & PQ
    API --> UI`;

const AGENTIC = `graph TB
    subgraph "User Roles"
        CW["Caseworker\\nManages 20-40 cases"]
        TL["Team Leader\\nOversees 200-300 cases"]
        AP["Applicant\\nWaiting for decision"]
    end

    subgraph "Claude Agents"
        OA["Officer Agent\\nCites POL-PE-001 etc.\\nReferences Section 9\\n3-sentence summaries"]
        MA["Manager Agent\\nProsecution timeline risks\\nCross-domain SLA performance\\n3 bullet points max"]
        RA["Resident Agent\\nPlain English ONLY\\nNEVER reveals prosecution\\nor enforcement details"]
    end

    subgraph "Deterministic Foundation"
        DE["Flag Engine + Policy Matcher + Workflow Engine\\nWorks WITHOUT any language model"]
    end

    CW --> OA
    TL --> MA
    AP --> RA

    OA & MA & RA --> DE

    style DE fill:#0b0c0e,color:#fff
    style OA fill:#1d70b8,color:#fff
    style MA fill:#4c2c92,color:#fff
    style RA fill:#00703c,color:#fff`;

const DATA_FLOW = `sequenceDiagram
    participant User as Caseworker
    participant UI as React Frontend
    participant API as Express API
    participant Core as @repo/core
    participant Claude as Claude API

    User->>UI: Opens case WCC-10302
    UI->>API: GET /api/cases/WCC-10302/view

    par Deterministic (no LLM)
        API->>Core: computeFlags(case, policies, today)
        Core-->>API: prosecution_file_overdue, heritage_damage
        API->>Core: matchPolicies(case_type, allPolicies)
        Core-->>API: POL-PE-001, POL-PE-002, POL-PE-005
        API->>Core: computeWorkflowState(case, workflow)
        Core-->>API: appeal_lodged, shouldBeIn: prosecution
        API->>Core: computeNudges(case, flags)
        Core-->>API: Submit prosecution file NOW
        API->>Core: getDefaultLayout(case, flags)
        Core-->>API: nudge_banner → flags → planning_info
    end

    opt Claude Enhancement
        API->>Claude: generateSummary(case, flags)
        Claude-->>API: CRIMINAL OFFENCE summary
    end

    API-->>UI: Full response with adaptive layout
    UI-->>User: Nudge banner + flags + workflow bar`;

const RAG_PIPELINE = `graph TB
    subgraph "Policy Corpus - 15 policies"
        PP["POL-PE-001: Investigation Timelines\\nPOL-PE-002: Heritage Enforcement\\nPOL-PE-003: Change of Use\\nPOL-PE-004: Breach of Conditions\\nPOL-PE-005: Councillor Enquiries\\n+ 10 street reporting policies"]
    end

    subgraph "Query Processing"
        Q["User question:\\nWhat is the prosecution deadline\\nfor listed building offences?"]
        SYS["System prompt +\\nfull policy corpus"]
    end

    subgraph "Claude RAG"
        CL["Claude Sonnet\\nSearches corpus\\nCites policy IDs\\nQuotes relevant sections"]
    end

    subgraph "Response"
        R["POL-PE-002 states prosecution file\\nmust be submitted within 14 working\\ndays of confirming criminal offence."]
    end

    PP --> SYS
    Q --> SYS --> CL --> R

    style CL fill:#1d70b8,color:#fff
    style R fill:#00703c,color:#fff`;

const SINGLE_SOURCE = `graph TB
    subgraph "Current: JSON Files"
        J1["cases.json"]
        J2["policies.json"]
        J3["workflows.json"]
    end

    subgraph "Future: Live Data Sources"
        DY["Dynamics 365 CRM"]
        PP["Planning Portal API"]
        HE["Historic England API"]
        GIS["GIS / Mapping"]
    end

    subgraph "Repository Pattern"
        CR["CaseRepository"]
        PR["PolicyRepository"]
        WR["WorkflowRepository"]
    end

    subgraph "Business Logic - Unchanged"
        BL["Flag Engine + Policy Matcher +\\nWorkflow Engine + Nudge Engine +\\nGenerative UI + Claude Service"]
    end

    J1 --> CR
    J2 --> PR
    J3 --> WR
    DY -.-> CR
    PP -.-> CR
    HE -.-> CR
    GIS -.-> CR

    CR & PR & WR --> BL

    style BL fill:#0b0c0e,color:#fff`;

const GENERATIVE_UI = `graph LR
    subgraph "WCC-10302: Criminal Offence"
        direction TB
        C1["nudge_banner CRITICAL"]
        C2["flags_panel CRITICAL"]
        C3["planning_info CRITICAL"]
        C4["ai_summary"]
        C5["evidence_tracker"]
        C6["timeline"]
        C7["policy_panel"]
        C8["workflow_state"]
        C9["case_notes collapsed"]
    end

    subgraph "WCC-10304: Routine Breach"
        direction TB
        R1["ai_summary"]
        R2["workflow_state"]
        R3["evidence_tracker"]
        R4["timeline"]
        R5["policy_panel collapsed"]
        R6["case_notes collapsed"]
    end

    style C1 fill:#d4351c,color:#fff
    style C2 fill:#d4351c,color:#fff
    style C3 fill:#d4351c,color:#fff`;

const ROADMAP = `graph LR
    NOW["Today: JSON + Local\\n14 cases, 15 policies\\nDeterministic engines\\nClaude enhancement"]
    N1["1. Dynamics 365\\nSwap repository\\nLive case data"]
    N2["2. Planning Portal\\nApplication data\\nCross-reference"]
    N3["3. Heritage Register\\nHistoric England\\nAuto-escalate"]
    N4["4. Pilot\\nWestminster\\nMeasure impact"]
    N5["5. Generalise\\nAny casework domain\\nHousing, licensing"]

    NOW --> N1 --> N2 --> N3 --> N4 --> N5

    style NOW fill:#0b0c0e,color:#fff
    style N5 fill:#00703c,color:#fff`;

export default function DocsPage() {
  return (
    <>
      <header className="doc-header">
        <h1>CaseView Documentation</h1>
        <a href="http://localhost:3000" target="_blank" rel="noreferrer">
          Open App &rarr;
        </a>
      </header>

      <nav className="doc-nav">
        <a href="#problems">Three Problems</a>
        <a href="#architecture">Architecture</a>
        <a href="#agents">Agents</a>
        <a href="#dataflow">Data Flow</a>
        <a href="#rag">Policy RAG</a>
        <a href="#sources">Data Sources</a>
        <a href="#generative-ui">Generative UI</a>
        <a href="#alignment">Challenge 3 Alignment</a>
        <a href="#roadmap">Roadmap</a>
      </nav>

      <div className="doc-content">
        <h1>CaseView &mdash; Architecture &amp; Challenge 3 Alignment</h1>
        <p>
          <strong>GDS AI Engineering Lab Hackathon | Challenge 3: Supporting
          Casework Decisions</strong>
        </p>
        <p>
          CaseView is a casework support tool for Westminster City Council
          planning enforcement. It <strong>displays cases clearly</strong>,{" "}
          <strong>surfaces the relevant policy matched by case type</strong>,{" "}
          <strong>
            shows where each case sits in its workflow and what action is
            required next
          </strong>
          , and{" "}
          <strong>
            flags evidence outstanding beyond policy thresholds
          </strong>{" "}
          &mdash; built entirely without a language model, with Claude enhancing
          on top.
        </p>

        {/* ── Three Problems ─────────────────────────── */}
        <h2 id="problems">The Three Problems</h2>
        <p>
          The Challenge 3 brief identifies three problems caseworkers face every
          day. CaseView addresses each with a specific engine:
        </p>
        <Mermaid chart={THREE_PROBLEMS} />

        {/* ── System Architecture ─────────────────────── */}
        <h2 id="architecture">System Architecture</h2>
        <Mermaid chart={SYSTEM_ARCH} />
        <blockquote>
          <strong>Deterministic foundation, intelligent enhancement.</strong> The
          flag engine, policy matcher, workflow engine, nudge engine, and
          generative UI layout all work without any LLM. Claude adds summaries,
          chat, and dashboard insights &mdash; with cached fallbacks for demo
          reliability.
        </blockquote>

        {/* ── Agentic Architecture ─────────────────────── */}
        <h2 id="agents">Agentic Architecture &mdash; Three Agents</h2>
        <p>
          Three role-specific Claude agents serve the three users from the
          Challenge 3 brief:
        </p>
        <Mermaid chart={AGENTIC} />

        <table>
          <thead>
            <tr>
              <th>Role</th>
              <th>Agent</th>
              <th>What it does</th>
              <th>What it NEVER does</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Caseworker</strong></td>
              <td>Officer Agent</td>
              <td>
                Cites POL-PE-001, Section 9 legislation, prosecution deadlines,
                3-sentence summaries
              </td>
              <td>Never makes decisions &mdash; surfaces information only</td>
            </tr>
            <tr>
              <td><strong>Team Leader</strong></td>
              <td>Manager Agent</td>
              <td>
                Cross-domain SLA performance, prosecution timeline risks,
                concrete actions by case ID
              </td>
              <td>Never exceeds 3 bullet points</td>
            </tr>
            <tr>
              <td><strong>Applicant</strong></td>
              <td>Resident Agent</td>
              <td>
                Plain English status updates, empathetic tone, &ldquo;We are
                investigating&rdquo;
              </td>
              <td>
                <span className="tag tag--red">NEVER</span> reveals:
                prosecution, enforcement notices, legal strategy, officer names
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── Data Flow ─────────────────────── */}
        <h2 id="dataflow">Data Flow &mdash; From Raw Case to Actionable View</h2>
        <Mermaid chart={DATA_FLOW} />

        {/* ── Policy RAG ─────────────────────── */}
        <h2 id="rag">Policy RAG Pipeline</h2>
        <p>
          The Policy Admin page lets caseworkers query the full 15-policy corpus
          using natural language. Claude searches the corpus and cites specific
          policy IDs, SLA deadlines, and required actions.
        </p>
        <Mermaid chart={RAG_PIPELINE} />

        {/* ── Data Sources ─────────────────────── */}
        <h2 id="sources">
          Single Source of Truth &mdash; Multi-Source Integration
        </h2>
        <p>
          The repository pattern abstracts data access. Today we load from JSON
          files. Tomorrow, swap in Dynamics 365, Planning Portal, or Historic
          England APIs &mdash; the business logic never changes.
        </p>
        <Mermaid chart={SINGLE_SOURCE} />
        <blockquote>
          Switching from JSON to Dynamics 365 requires only a new{" "}
          <code>DynamicsCaseRepository</code> implementation. The flag engine,
          policy matcher, workflow engine, nudge engine, generative UI, and
          Claude service are completely unchanged.
        </blockquote>

        {/* ── Generative UI ─────────────────────── */}
        <h2 id="generative-ui">
          Generative UI &mdash; Same Components, Different Composition
        </h2>
        <Mermaid chart={GENERATIVE_UI} />
        <p>
          Same 15 components. Different order, different emphasis, different
          count. Criminal offence? Prosecution deadline dominates. Routine? Calm
          and minimal.
        </p>

        {/* ── Challenge 3 Alignment ─────────────────────── */}
        <h2 id="alignment">Challenge 3 Alignment Checklist</h2>
        <table>
          <thead>
            <tr>
              <th>Brief Criterion</th>
              <th>Our Implementation</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Displays a case clearly</strong></td>
              <td>
                Generative UI engine composes 15 React components per case.
                Adaptive layout prioritises critical info.
              </td>
              <td><span className="tag tag--green">DONE</span></td>
            </tr>
            <tr>
              <td>
                <strong>Surfaces the relevant policy matched by case type</strong>
              </td>
              <td>
                <code>matchPolicies(case_type, allPolicies)</code> auto-matches.
                Policy RAG Q&A lets users query the corpus.
              </td>
              <td><span className="tag tag--green">DONE</span></td>
            </tr>
            <tr>
              <td>
                <strong>Shows where the case sits in its workflow</strong>
              </td>
              <td>
                <code>computeWorkflowState()</code> returns current state, days
                in state, and &ldquo;should be in&rdquo; mismatch detection.
              </td>
              <td><span className="tag tag--green">DONE</span></td>
            </tr>
            <tr>
              <td><strong>What action is required next</strong></td>
              <td>
                Nudge engine transforms 14 flag types into one-click action
                prompts sorted by urgency.
              </td>
              <td><span className="tag tag--green">DONE</span></td>
            </tr>
            <tr>
              <td>
                <strong>
                  Flags evidence outstanding beyond policy threshold
                </strong>
              </td>
              <td>
                Flag engine checks every case against policy SLAs. 14 flag
                types, each citing specific policy ID and days overdue.
              </td>
              <td><span className="tag tag--green">DONE</span></td>
            </tr>
            <tr>
              <td>
                <strong>Built entirely without a language model</strong>
              </td>
              <td>
                All core engines are deterministic TypeScript. Claude endpoints
                have cached fallbacks. Remove the API key and everything works.
              </td>
              <td><span className="tag tag--green">DONE</span></td>
            </tr>
            <tr>
              <td>
                <strong>Three user perspectives</strong>
              </td>
              <td>
                Caseworker (case view), Team Leader (dashboard), Applicant
                (status lookup). Role switcher with RBAC.
              </td>
              <td><span className="tag tag--green">DONE</span></td>
            </tr>
          </tbody>
        </table>

        {/* ── Roadmap ─────────────────────── */}
        <h2 id="roadmap">What Would We Do Next</h2>
        <Mermaid chart={ROADMAP} />
        <blockquote>
          The architecture &mdash; policy matching by case type, workflow engine,
          flag engine with configurable thresholds &mdash; works for ANY
          casework domain. Housing, licensing, environmental health, benefits.
          One tool, many case types. The config changes; the engine stays the
          same.
        </blockquote>
      </div>
    </>
  );
}
