# CaseView Architecture — Challenge 3 Alignment

## How CaseView Solves the Three Problems

The Challenge 3 brief identifies three problems caseworkers face every day. CaseView addresses each with a specific engine:

```mermaid
graph TB
    subgraph "The Three Problems (Challenge 3 Brief)"
        P1["<b>Information Problem</b><br/>Case data scattered across<br/>systems, notes, emails"]
        P2["<b>Policy Problem</b><br/>Which policy applies?<br/>40-page doc, unclear version"]
        P3["<b>Workflow Problem</b><br/>Where is the case?<br/>What deadline is approaching?"]
    end

    subgraph "CaseView Solutions"
        S1["<b>Generative UI Engine</b><br/>15 components composed per case<br/>Most important info FIRST<br/>Single screen, adaptive layout"]
        S2["<b>Policy Matcher + RAG Q&A</b><br/>Auto-match by case_type<br/>Claude-powered policy queries<br/>Cite specific SLAs & deadlines"]
        S3["<b>Flag Engine + Workflow Engine</b><br/>14 flag types detect breaches<br/>Workflow state bar shows position<br/>Nudge banners say what to do next"]
    end

    P1 --> S1
    P2 --> S2
    P3 --> S3

    style P1 fill:#d4351c,color:#fff
    style P2 fill:#f47738,color:#fff
    style P3 fill:#1d70b8,color:#fff
    style S1 fill:#00703c,color:#fff
    style S2 fill:#00703c,color:#fff
    style S3 fill:#00703c,color:#fff
```

## System Architecture

```mermaid
graph LR
    subgraph "Data Sources (Single Source of Truth)"
        D1[("cases.json<br/>14 cases")]
        D2[("policies.json<br/>15 policies")]
        D3[("workflows.json<br/>13 workflows")]
        D4[("cached-responses.json<br/>Demo fallbacks")]
        D5[("Future: Dynamics 365<br/>CRM API")]
        D6[("Future: Planning Portal<br/>Application data")]
        D7[("Future: Historic England<br/>Heritage at Risk")]
    end

    subgraph "@repo/core — Deterministic Engines"
        FE["Flag Engine<br/>8 planning + 6 street flags"]
        PM["Policy Matcher<br/>match by case_type"]
        WE["Workflow Engine<br/>state + mismatch detection"]
        NE["Nudge Engine<br/>13 action prompts"]
        GU["Generative UI<br/>layout composition"]
        RS["Resident Service<br/>sanitise for public"]
    end

    subgraph "Claude Enhancement Layer"
        CS["Claude Service<br/>3 role-specific agents"]
        PQ["Policy RAG Q&A<br/>query full corpus"]
    end

    subgraph "Express.js API (port 3001)"
        API["11 REST endpoints<br/>+ RBAC middleware"]
    end

    subgraph "Vite + React Frontend (port 3000)"
        UI["5 pages, 15 components<br/>GOV.UK Design System"]
    end

    D1 & D2 & D3 --> API
    D4 --> CS
    D5 & D6 & D7 -.->|"future"| API
    API --> FE & PM & WE & NE & GU & RS
    API --> CS & PQ
    API --> UI
```

## Agentic Architecture — Three Agents, One System

```mermaid
graph TB
    subgraph "User Roles (Challenge 3 Brief)"
        CW["<b>Caseworker</b><br/>Manages 20-40 cases<br/>Needs quick understanding<br/>Needs correct policy"]
        TL["<b>Team Leader</b><br/>Oversees 200-300 cases<br/>Needs risk overview<br/>Needs escalation alerts"]
        AP["<b>Applicant</b><br/>Waiting for decision<br/>Needs plain English status<br/>Cannot see internal details"]
    end

    subgraph "Agent Layer"
        OA["<b>Officer Agent</b><br/>Cites POL-PE-001 etc.<br/>References Section 9 legislation<br/>Suggests enforcement steps<br/>3-sentence summaries"]
        MA["<b>Area Manager Agent</b><br/>Prosecution timeline risks<br/>Cross-domain SLA performance<br/>Concrete actions by case ID<br/>3 bullet points max"]
        RA["<b>Resident Agent</b><br/>Plain English ONLY<br/>NEVER reveals: prosecution,<br/>enforcement notices, legal strategy<br/>Warm and empathetic"]
    end

    subgraph "Deterministic Foundation"
        DE["Flag Engine → Nudge Engine → Generative UI<br/><i>Works WITHOUT any language model</i>"]
    end

    CW -->|"X-CaseView-Role: officer"| OA
    TL -->|"X-CaseView-Role: area_manager"| MA
    AP -->|"X-CaseView-Role: resident"| RA

    OA --> DE
    MA --> DE
    RA --> DE

    style DE fill:#0b0c0e,color:#fff
    style OA fill:#1d70b8,color:#fff
    style MA fill:#4c2c92,color:#fff
    style RA fill:#00703c,color:#fff
```

## Data Flow — From Raw Case to Actionable View

```mermaid
sequenceDiagram
    participant User as Caseworker
    participant UI as React Frontend
    participant API as Express API
    participant Core as @repo/core
    participant Claude as Claude API
    participant Data as JSON Data

    User->>UI: Opens case WCC-10302
    UI->>API: GET /api/cases/WCC-10302/view
    API->>Data: Load case + policies + workflows
    Data-->>API: Raw JSON data

    par Deterministic (no LLM)
        API->>Core: computeFlags(case, policies, today)
        Core-->>API: [prosecution_file_overdue, heritage_damage]
        API->>Core: matchPolicies(case_type, allPolicies)
        Core-->>API: [POL-PE-001, POL-PE-002, POL-PE-005]
        API->>Core: computeWorkflowState(case, workflow)
        Core-->>API: {state: appeal_lodged, shouldBeIn: prosecution}
        API->>Core: computeNudges(case, flags, workflow)
        Core-->>API: ["Submit prosecution file NOW", ...]
        API->>Core: getDefaultLayout(case, flags, workflow)
        Core-->>API: nudge_banner[critical] → flags → planning_info → ...
    end

    opt Claude Enhancement
        API->>Claude: generateSummary(case, flags, policies)
        Claude-->>API: "CRIMINAL OFFENCE: Victorian shopfront..."
    end

    API-->>UI: Full response (case + flags + nudges + layout + summary)
    UI-->>User: Adaptive page with nudge banner, flags, workflow bar
```

## Policy RAG Pipeline

```mermaid
graph TB
    subgraph "Policy Corpus (15 policies)"
        PP["POL-PE-001: Investigation Timelines<br/>POL-PE-002: Heritage Enforcement<br/>POL-PE-003: Change of Use<br/>POL-PE-004: Breach of Conditions<br/>POL-PE-005: Councillor Enquiries<br/>+ 10 street reporting policies"]
    end

    subgraph "Ingestion"
        IN["Load all policies<br/>Build corpus text<br/>Include policy_id, title,<br/>applicable_case_types, body"]
    end

    subgraph "Query Processing"
        Q["User question:<br/>'What is the prosecution deadline<br/>for listed building offences?'"]
        SYS["System prompt:<br/>POLICY_SYSTEM<br/>+ full policy corpus"]
    end

    subgraph "Claude RAG"
        CL["Claude Sonnet<br/>Searches corpus<br/>Cites policy IDs<br/>Quotes relevant sections"]
    end

    subgraph "Response"
        R["'POL-PE-002 states prosecution file<br/>must be submitted within 14 working<br/>days of confirming criminal offence.<br/>Section 9, Listed Buildings Act 1990.'"]
    end

    PP --> IN --> SYS
    Q --> SYS --> CL --> R

    style CL fill:#1d70b8,color:#fff
    style R fill:#00703c,color:#fff
```

## Single Source of Truth — Multi-Source Data Integration

```mermaid
graph TB
    subgraph "Current: JSON Files"
        J1["cases.json + planning-cases.json"]
        J2["policy-extracts.json + planning-policies.json"]
        J3["workflow-states.json + planning-workflows.json"]
    end

    subgraph "Future: Live Data Sources"
        DY["Dynamics 365 CRM<br/>Case records, applicant data,<br/>officer assignments"]
        PP["Planning Portal API<br/>Application data, site plans,<br/>decision history"]
        HE["Historic England API<br/>Heritage at Risk register,<br/>listed building details"]
        GIS["GIS / Mapping<br/>Conservation area boundaries,<br/>ward geography"]
        LIC["Licensing System<br/>Late-night licences,<br/>premises history"]
    end

    subgraph "Repository Pattern (Abstraction Layer)"
        CR["CaseRepository<br/>listCases() getCase() getCaseByRef()"]
        PR["PolicyRepository<br/>getPoliciesForType() getAllPolicies()"]
        WR["WorkflowRepository<br/>getWorkflow() getAllWorkflows()"]
    end

    subgraph "Business Logic (Unchanged)"
        BL["Flag Engine + Policy Matcher +<br/>Workflow Engine + Nudge Engine +<br/>Generative UI + Claude Service"]
    end

    J1 --> CR
    J2 --> PR
    J3 --> WR
    DY -.->|"swap implementation"| CR
    PP -.->|"enrich"| CR
    HE -.->|"enrich"| CR
    GIS -.->|"enrich"| CR
    LIC -.->|"enrich"| PR

    CR & PR & WR --> BL

    style BL fill:#0b0c0e,color:#fff
```

> **Key insight:** The repository pattern means switching from JSON to Dynamics 365 requires only a new `DynamicsCaseRepository` implementation. The flag engine, policy matcher, workflow engine, nudge engine, generative UI, and Claude service are completely unchanged. The business logic never knows where the data came from.

## Generative UI — Same Components, Different Composition

```mermaid
graph LR
    subgraph "WCC-10302: Criminal Offence (CRITICAL)"
        direction TB
        C1["nudge_banner ⬛ CRITICAL"]
        C2["flags_panel ⬛ CRITICAL"]
        C3["planning_info ⬛ CRITICAL"]
        C4["ai_summary"]
        C5["evidence_tracker"]
        C6["timeline"]
        C7["policy_panel"]
        C8["workflow_state"]
        C9["case_notes ▸ collapsed"]
        C1 --- C2 --- C3 --- C4 --- C5 --- C6 --- C7 --- C8 --- C9
    end

    subgraph "WCC-10304: Routine Breach (CALM)"
        direction TB
        R1["ai_summary"]
        R2["workflow_state"]
        R3["evidence_tracker"]
        R4["timeline"]
        R5["policy_panel ▸ collapsed"]
        R6["case_notes ▸ collapsed"]
        R1 --- R2 --- R3 --- R4 --- R5 --- R6
    end

    style C1 fill:#d4351c,color:#fff
    style C2 fill:#d4351c,color:#fff
    style C3 fill:#d4351c,color:#fff
```

> Same 15 components. Different order, different emphasis, different count. The layout adapts to what matters for each case. Criminal offence? Prosecution deadline dominates. Routine? Calm and minimal.

## Challenge 3 Alignment Checklist

| Brief Criterion | Our Implementation | Evidence |
|---|---|---|
| **"Displays a case clearly"** | Generative UI engine composes 15 React components per case. Adaptive layout prioritises critical info. | WCC-10302: nudge banner + flags + planning info first. WCC-10304: calm summary first. |
| **"Surfaces the relevant policy matched by case type"** | `matchPolicies(case_type, allPolicies)` auto-matches. Policy RAG Q&A lets users query the corpus. | WCC-10302 shows POL-PE-002 with "14 working days" highlighted. Admin can ask "what's the prosecution deadline?" |
| **"Shows where the case sits in its workflow"** | `computeWorkflowState()` returns current state, days in state, and "should be in" mismatch detection. | WCC-10302: "appeal_lodged" with red dashed indicator at "prosecution". WCC-10301: 32 days in investigation. |
| **"What action is required next"** | Nudge engine transforms 14 flag types into one-click action prompts sorted by urgency. | WCC-10302: "Submit prosecution file to legal NOW" with green action button. |
| **"Flags evidence outstanding beyond policy threshold"** | Flag engine checks every case against policy SLAs. 8 planning + 6 street flag types. Each cites the specific policy ID and counts days overdue. | WCC-10302: prosecution_file_overdue (13 days, POL-PE-002 14-day threshold). WCC-10303: compliance_deadline_imminent (1 day). |
| **"Built entirely without a language model"** | Flag engine, policy matcher, workflow engine, nudge engine, generative UI — all deterministic TypeScript. Claude endpoints use cached fallbacks. | Remove `ANTHROPIC_API_KEY` and every feature still works. |
| **Three users: caseworker, team leader, applicant** | Role switcher with RBAC. Officer sees enforcement details. Team leader sees cross-domain dashboard. Applicant sees plain English — never sees prosecution/enforcement. | Role switching in header. Resident endpoint returns "We are investigating" — zero sensitive keyword leaks. |
| **"Surfacing the right information at the right moment"** | Generative UI selects and orders components by case context. Critical cases get urgency. Routine cases get calm. | Compare view: WCC-10302 vs WCC-10304 side by side proves adaptive composition. |

## What Would We Do Next

```mermaid
graph LR
    NOW["<b>Today: JSON + Local</b><br/>14 cases, 15 policies<br/>Deterministic engines<br/>Claude enhancement"]

    N1["<b>1. Dynamics 365</b><br/>Swap repository<br/>implementation<br/>Live case data"]
    N2["<b>2. Planning Portal</b><br/>Pull application data<br/>Site plans, decisions<br/>Cross-reference"]
    N3["<b>3. Heritage Register</b><br/>Historic England API<br/>Flag at-risk buildings<br/>Auto-escalate"]
    N4["<b>4. Pilot</b><br/>Westminster enforcement<br/>Measure: complaint → action<br/>Target: days not weeks"]
    N5["<b>5. Generalise</b><br/>Any casework domain<br/>Housing, licensing, benefits<br/>Config changes, engine stays"]

    NOW --> N1 --> N2 --> N3 --> N4 --> N5

    style NOW fill:#0b0c0e,color:#fff
    style N5 fill:#00703c,color:#fff
```

> The architecture — policy matching by case type, workflow engine, flag engine with configurable thresholds — works for ANY casework domain. Housing, licensing, environmental health, benefits. One tool, many case types. The config changes; the engine stays the same.
