# CaseView — AI-Assisted Planning Enforcement & Street Reporting Intelligence

## What This Is

CaseView is a **hackathon prototype** for the GDS AI Engineering Lab Hackathon (16 April 2026). It's our entry for **Challenge 3: Supporting Casework Decisions** (open brief).

The tool helps Westminster City Council **caseworkers**, **team leaders**, and **applicants** manage planning enforcement and street reporting cases. It solves three problems:

1. **Information problem:** caseworkers can't see everything about a case in one place
2. **Policy problem:** knowing which policy applies to this case type
3. **Workflow problem:** knowing where the case is and what comes next

**The evaluation criterion:** "A tool that displays a case clearly, surfaces the relevant policy matched by case type, shows where the case sits in its workflow and what action is required next, and flags evidence that has been outstanding beyond the policy threshold — built entirely without a language model — is a complete and impressive prototype."

## Build & Development Commands

```sh
pnpm install              # Install all dependencies
pnpm dev                  # Run all apps in parallel (web :3000, backend :3001)
pnpm build                # Build all apps and packages
pnpm lint                 # Lint all apps and packages (--max-warnings 0)
pnpm format               # Format all .ts, .tsx, .md files with Prettier
pnpm check-types          # Type-check all packages

# Target a specific app/package
pnpm exec turbo dev --filter=web       # Next.js frontend only (:3000)
pnpm exec turbo dev --filter=backend   # Express API only (:3001)
pnpm exec turbo build --filter=@repo/core
pnpm exec turbo lint --filter=@repo/ui
```

## Architecture

This is a **pnpm + Turborepo monorepo** with two workspaces: `apps/*` and `packages/*`.

```
CaseView/
├── apps/
│   ├── web/              ← Next.js 16 frontend (App Router, port 3000)
│   │   └── app/
│   │       ├── page.tsx                         ← Case list (landing page)
│   │       ├── case/[caseId]/page.tsx           ← Officer case view (generative UI)
│   │       ├── dashboard/page.tsx               ← Team leader dashboard
│   │       ├── resident/page.tsx                ← Applicant status lookup
│   │       ├── compare/page.tsx                 ← Side-by-side case comparison
│   │       └── layout.tsx                       ← Root layout with header + role switcher
│   ├── backend/          ← Express.js API server (port 3001)
│   │   └── src/
│   │       └── index.ts                         ← All API routes
│   └── docs/             ← Documentation site (ignore for hackathon)
├── packages/
│   ├── ui/               ← React components (@repo/ui) — case view components go here
│   ├── core/             ← Business logic (@repo/core) — flag engine, policy matcher, etc.
│   │   └── src/
│   │       ├── types.ts                         ← All TypeScript interfaces
│   │       ├── data-layer.ts                    ← Repository pattern (loads JSON data)
│   │       ├── flag-engine.ts                   ← THE CORE: SLA breach detection
│   │       ├── policy-matcher.ts                ← Match policies by case type
│   │       ├── workflow-engine.ts               ← Workflow state + mismatch detection
│   │       └── resident-service.ts              ← Sanitised status for applicants
│   ├── typescript-config/ ← Shared TS configs
│   └── eslint-config/    ← Shared ESLint configs
└── data/                 ← Synthetic JSON data (cases, policies, workflows)
```

### Apps

- **`apps/web`** — Next.js 16 frontend (App Router, port 3000). Pages only — no API routes. Fetches from backend.
- **`apps/backend`** — Express.js API server (port 3001). All REST endpoints. Imports business logic from `@repo/core`.
- **`apps/docs`** — Documentation site. Ignore for hackathon builds.

### Shared Packages

- **`@repo/ui`** (`packages/ui`) — React component library. Exports via wildcard: `import { Button } from "@repo/ui/button"`. Components may use `"use client"` directive.
- **`@repo/core`** (`packages/core`) — All business logic: flag engine, policy matcher, workflow engine, resident service, data layer. Pure TypeScript functions with no framework dependencies. Testable in isolation. **IMPLEMENTED.**
- **`@repo/eslint-config`** (`packages/eslint-config`) — Three ESLint configs: `base`, `next-js`, `react-internal`.
- **`@repo/typescript-config`** (`packages/typescript-config`) — Three tsconfig bases: `base.json`, `nextjs.json`, `react-library.json`.

### Key Conventions

- **TypeScript strict mode** with `noUncheckedIndexedAccess` enabled.
- **ESLint zero-warning policy** — `--max-warnings 0`.
- **React 19** with the new JSX transform (no `React` import needed).
- **ES modules** throughout (`"type": "module"`).
- **CSS Modules** for component styling (`*.module.css`).
- **Next.js App Router** pattern (`app/` directory with `layout.tsx` and `page.tsx`).

## The Domain: Westminster Planning Enforcement

### Two Case Domains

**Planning Enforcement (DEMO FOCUS — 4 cases):**
Cases involve unauthorised construction in conservation areas, criminal offences against Grade II listed buildings (Section 9, Planning (Listed Buildings and Conservation Areas) Act 1990), change of use breaches, and breach of planning conditions.

**Street Reporting (BREADTH — 10 cases):**
Fly-tipping, potholes, graffiti, lighting, noise, rough sleeping, waste, abandoned vehicles.

### Data Files

All JSON data goes in `data/` at the repo root. Source data is also available at `../synthetic-data/` (sibling directory).

| File | Contents | Count |
|------|----------|-------|
| `cases.json` | Street reporting cases | 10 |
| `planning-cases.json` | Planning enforcement cases | 4 |
| `policy-extracts.json` | Street reporting policies | 10 |
| `planning-policies.json` | Planning enforcement policies | 5 |
| `workflow-states.json` | Street reporting workflows | 9 |
| `planning-workflows.json` | Planning enforcement workflows | 4 |
| `cached-responses.json` | Pre-cached Claude responses | For demo reliability |

### Data Schema

```typescript
interface Case {
  case_id: string;           // "WCC-2026-10301"
  case_type: string;         // "unauthorised_construction" | "fly_tipping" | etc.
  status: string;            // Must exist in corresponding workflow
  reporter: { name: string; reference: string; ward: string };
  location: { street: string; postcode: string; lat: number; lon: number };
  assigned_to: string;
  contractor: string | null;
  priority: "critical" | "high" | "standard" | "low";
  duplicate_count: number;
  created_date: string;      // ISO date
  last_updated: string;
  timeline: Array<{ date: string; event: string; note: string }>;
  case_notes: string;
  // Planning-specific (optional):
  planning_ref?: string;
  conservation_area?: string;
  listed_building?: boolean;
  listed_grade?: string;     // "Grade II"
}

interface Policy {
  policy_id: string;              // "POL-PE-001"
  title: string;
  body: string;
  applicable_case_types: string[];
}

interface Workflow {
  case_type: string;
  states: Array<{
    state: string;
    label: string;
    description: string;
    allowed_transitions: string[];
    required_actions: string[];
    sla_hours?: number;
    sla_days?: number;
  }>;
}
```

### Key Demo Cases

| Case ID | Type | Key Flag | Demo Purpose |
|---------|------|----------|-------------|
| **WCC-2026-10302** | Listed building breach | **CRIMINAL OFFENCE** — prosecution file NOT submitted 12 days after confirmation (14-day deadline from POL-PE-002). Victorian shopfront being irreversibly destroyed. | STAR CASE |
| **WCC-2026-10303** | Change of use | Shisha lounge still operating. **Compliance deadline 17 April** (2 days). 7 complaints. | Imminent deadline |
| **WCC-2026-10301** | Unauthorised construction | 36 days in investigation, no enforcement notice. Conservation area. Councillor chasing. | Process delay |
| **WCC-2026-10304** | Breach of conditions | Partial compliance. Routine. | CONTRAST — calm layout vs critical = generative UI demo |
| WCC-2026-10087 | Pothole (street) | Cyclist injury untriaged 48 hours. | Backup demo |

## The Five Core Engines (`packages/core`)

### 1. Flag Engine — THE CORE VALUE

Deterministic. No LLM. Checks every case against policy SLAs. **Today = 2026-04-15** for all date calculations.

**Planning flags:**

| Flag Type | Trigger | Policy Ref |
|-----------|---------|-----------|
| `prosecution_file_overdue` | Criminal offence confirmed but prosecution file not submitted within 14 working days | POL-PE-002 |
| `enforcement_notice_delay` | Investigation > 56 days (8 weeks) without enforcement notice issued | POL-PE-001 |
| `compliance_deadline_imminent` | Enforcement notice compliance deadline within 3 days | POL-PE-003 |
| `non_compliance_detected` | Monitoring visit confirms breach continuing after notice served | POL-PE-003 |
| `heritage_irreversible_damage` | Listed building works ongoing causing irreversible loss | POL-PE-002 |
| `councillor_enquiry_overdue` | Councillor enquiry not responded to within 5 working days | POL-PE-005 |
| `cross_referral_missing` | Change of use with health/noise issue but no Environmental Health referral | POL-PE-003 |
| `multiple_complaints_escalation` | 3+ complaints requiring senior review | POL-PE-005 |

**Street reporting flags:** `injury_not_triaged`, `sla_breach`, `evidence_not_referred`, `duplicate_escalation`, `member_enquiry_overdue`, `recurrence`

Each flag returns: `{ severity: "critical"|"high"|"standard", type: string, message: string, policy_ref: string, days_overdue: number }`

### 2. Policy Matcher
`matchPolicies(caseType, allPolicies)` → policies where `caseType ∈ applicable_case_types`

### 3. Workflow Engine
`computeWorkflowState(case, workflowDef)` → `{ currentState, label, requiredActions, allowedTransitions, daysInState, shouldBeIn }`

Detects state mismatches (e.g. WCC-10301 in `investigation` 36 days but should have progressed).

### 4. Nudge Engine
Transforms flags into one-click action prompts:
- `prosecution_file_overdue` → "Submit prosecution file to legal NOW" + button
- `enforcement_notice_delay` → "Issue enforcement notice" + button
- `compliance_deadline_imminent` → "Prepare for non-compliance action" + button
- `heritage_irreversible_damage` → "Request urgent heritage assessment" + button
- `councillor_enquiry_overdue` → "Draft councillor response" + button
- `cross_referral_missing` → "Refer to Environmental Health" + button

### 5. Generative UI Layout Engine
Selects and orders 15 pre-built React components per case based on context. Returns:
```typescript
interface CaseLayout {
  nudge_text: string | null;
  components: Array<{
    name: string;    // One of the 15 component names
    emphasis: "critical" | "normal" | "collapsed";
  }>;
}
```

**15 available components:** `nudge_banner`, `flags_panel`, `ai_summary`, `ai_next_action`, `timeline`, `policy_panel`, `case_notes`, `location_map`, `duplicate_panel`, `contractor_info`, `workflow_state`, `evidence_tracker`, `escalation_history`, `resident_impact`, `planning_info`

Pre-computed fallback layouts for demo cases (no LLM required):
- WCC-10302 (critical): nudge_banner → flags_panel → planning_info → ai_summary → evidence_tracker → timeline → policy_panel → workflow_state → case_notes(collapsed)
- WCC-10304 (routine): ai_summary → workflow_state → evidence_tracker → timeline → policy_panel(collapsed) → case_notes(collapsed)

## Three Claude Agents

Model: `claude-sonnet-4-20250514`. API key from `ANTHROPIC_API_KEY` env var.

### Officer Agent
Cites specific policy IDs (POL-PE-001 etc.) and legislation. For listed buildings: always notes criminal offence under Section 9. Never makes decisions — surfaces information and suggests next enforcement steps. 3-sentence summaries, 1-2 specific next actions.

### Resident Agent
Plain English only. **NEVER reveals:** enforcement strategy, prosecution plans, legal advice, officer names, enforcement notice details. Warm and empathetic. "We can't share details of any enforcement action, but we are actively working on this matter."

### Area Manager Agent
Highlights prosecution timeline risks. Flags imminent compliance deadlines. Cross-references planning + street cases. Quantifies SLA performance. 3 bullet points max.

All agents have cached fallback responses in `data/cached-responses.json` for demo reliability.

### QA Validator Agent (Claude Code)
A Claude Code agent (`.claude/agents/qa-validator.md`) that validates all changes are functional. Runs 6 phases: pre-flight checks, API endpoint validation, flag engine verification, resident view security audit, frontend UI testing (Playwright), and generative UI contrast check. Triggered after feature work or before commits.

## Three User Views

### 1. Officer Case View (`/case/[caseId]`)
Generative UI: 15 components composed per case, emphasis levels. Nudge banner for critical cases. Flags, AI summary, timeline, policy panel, workflow state bar, evidence tracker. Chat with officer agent.

### 2. Team Leader Dashboard (`/dashboard`)
Summary cards (Total, Planning Critical, Street Critical, Warnings, Resolved). Split view: Planning (purple accent) + Street (blue accent). AI insight panel. Click-through to cases.

### 3. Applicant Status (`/resident`)
Reference input + lookup. Plain English status, "what happens next", simplified timeline. Optional chat with resident agent.

### 4. Compare View (`/compare`)
Two cases side by side (default: WCC-10302 vs WCC-10304). Demonstrates generative UI: critical case gets urgent layout, routine case gets calm layout.

## Role-Based Access

Role set via UI switcher in header, sent as `X-CaseView-Role` header:
- **officer**: All case endpoints + chat
- **area_manager**: All officer endpoints + dashboard + dashboard insight
- **resident**: `/api/resident/[ref]` + resident chat only

## Styling: GOV.UK Design System

```css
--govuk-blue: #1d70b8;
--govuk-red: #d4351c;
--govuk-green: #00703c;
--govuk-black: #0b0c0e;
--govuk-grey: #505a5f;
--govuk-light-grey: #f3f2f1;
```

- Font: "GDS Transport", Arial, sans-serif. Background: `#f3f2f1`.
- Planning domain: purple accent tag. Street domain: blue accent tag.
- Nudge banner: dark red bg, white text, GOV.UK green action buttons.
- Listed building cases: heritage-gold accent (`#B8860B`).
- Timeline: vertical with dots/line, warning events red, "Today" marker.

## Critical Rules

1. **The tool MUST work without Claude API.** Flag engine, policy matcher, workflow engine, nudge engine — all deterministic. Claude endpoints use cached fallbacks. This is an evaluation criterion.

2. **"Evidence outstanding beyond policy threshold"** is the brief's exact phrase for what the flag engine does. Use this language in UI labels and code comments.

3. **Generative UI** means the same 15 React components exist for every case, but Claude (or fallback logic) selects which to show, in what order, with what emphasis.

4. **Today is 2026-04-15** for all date calculations. Planning cases have deadlines planted around this date.

5. **Never expose enforcement details in the resident view.** No prosecution, enforcement notices, legal strategy, or officer names.

6. **Accessibility:** Semantic HTML, proper heading hierarchy, `role="alert"` on nudge banners, `aria-live` on dynamic content, visible focus states, skip-to-main-content link, keyboard navigation.

7. **Flag engine functions take `today: Date` as parameter** for testability. Never use `new Date()` inside the engine.

8. **Pre-commit quality gate:** A Claude Code hook runs `pnpm check-types && pnpm lint` before every `git commit`. If either fails, the commit is blocked. Fix all type errors and lint warnings (zero-warning policy) before committing.

## Backend API (Express.js — `apps/backend`)

The Express.js server on port 3001 exposes all REST endpoints. The Next.js frontend fetches from this server.

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cases` | List all 14 cases with summary flags. `?domain=planning\|street\|all` |
| GET | `/api/cases/:caseId` | Full case + matched policies + workflow + flags |
| GET | `/api/cases/:caseId/summary` | Deterministic summary + next action (Claude-enhanced later) |
| POST | `/api/cases/:caseId/chat` | Chat endpoint (deterministic fallback, Claude later) |
| GET | `/api/cases/:caseId/view` | Case data + generative layout + nudges |
| GET | `/api/dashboard` | Aggregated stats split by domain |
| GET | `/api/dashboard/insight` | Area manager insight bullets |
| GET | `/api/resident/:reference` | Sanitised applicant status (never leaks enforcement) |

### Running the backend

```sh
pnpm exec turbo dev --filter=backend   # tsx watch on port 3001
```

### Imports from @repo/core

```typescript
import { createRepositories } from "@repo/core/data-layer";
import { computeFlags } from "@repo/core/flag-engine";
import { matchPolicies } from "@repo/core/policy-matcher";
import { computeWorkflowState } from "@repo/core/workflow-engine";
import { getResidentStatus } from "@repo/core/resident-service";
```

## Adding UI Components to `@repo/ui`

Follow existing pattern: one file per component in `packages/ui/src/`. Export via wildcard.

```typescript
// packages/ui/src/nudge-banner.tsx
"use client";
export function NudgeBanner(props: { text: string }) { /* ... */ }

// Usage in apps/web:
import { NudgeBanner } from "@repo/ui/nudge-banner";
```

## Environment Variables

```env
ANTHROPIC_API_KEY=your-key          # Claude API access (optional — works without it)
PORT=3001                            # Backend API port
NEXT_PUBLIC_API_URL=http://localhost:3001  # Backend URL for frontend
```

## What "Done" Looks Like

A judge visits the table and sees:
1. A case list of 14 cases (10 street + 4 planning), filterable by domain
2. WCC-10302 with red nudge banner, prosecution timeline flags, legislation citations — all without an LLM
3. WCC-10304 side by side showing a calm, minimal layout — same tool, different composition
4. Claude adding summaries and chat on top of the deterministic foundation
5. A team leader dashboard splitting planning and street risks
6. An applicant status page in plain English that never leaks enforcement details
7. The architecture explained: deterministic foundation, intelligent enhancement
