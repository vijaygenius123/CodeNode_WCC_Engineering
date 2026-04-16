# CaseView Hackathon Execution Playbook v2

**GDS AI Engineering Lab | 16 April 2026 | CodeNode, London**
**Team:** Vijay (Person A — Backend + AI) & Friend (Person B — Frontend + Design)
**Stack:** pnpm + Turborepo monorepo | Express.js backend | Vite + React frontend | @repo/core shared business logic | Claude API | GOV.UK styling
**Demo Focus:** Planning breach enforcement (with street reporting cases also present)

---

## How to Use This Document

Every prompt is copy-paste ready. Person A owns the backend, Person B owns the frontend.
- **PLANNING BREACH** is the demo star — 4 cases with planted enforcement failures
- **Street reporting** cases (10) remain as breadth — show the tool handles multiple domains
- **Monorepo architecture** — pnpm + Turborepo. `@repo/core` for shared business logic, `apps/backend` for Express API (port 3001), `apps/web` for Vite + React frontend (port 3000)
- **All business logic is in TypeScript** — flag engine, policy matcher, workflow engine, nudge engine, generative UI, resident service, Claude service all live in `packages/core/src/`

---

## DATA OVERVIEW — What We Built

### Planning Breach Cases (THE DEMO FOCUS)

| Case ID | Type | Flag | Demo Purpose |
|---------|------|------|-------------|
| WCC-10301 | Unauthorised construction | **Enforcement notice NOT issued 36 days after breach confirmed** in Bayswater Conservation Area. Councillor chasing. 4 complaints. | Process delay — should have acted weeks ago |
| WCC-10302 | Listed building breach | **CRIMINAL OFFENCE** — Victorian shopfront being destroyed on Jermyn Street. Prosecution file NOT submitted 12 days after offence confirmed. Irreversible heritage loss. | Most dramatic case. Criminal offence timeline breach. |
| WCC-10303 | Change of use | Shisha lounge operating despite enforcement notice. **Compliance deadline in 2 days.** Prosecution file not prepared. 7 complaints, councillor enquiry. | Non-compliance + imminent deadline |
| WCC-10304 | Breach of conditions | Restaurant breaching hours + seating conditions. Partial compliance only. Noise assessment pending. | Manageable case — good contrast |

### Street Reporting Cases (BREADTH — already built)

10 cases across fly-tipping, pothole, graffiti, lighting, noise, rough sleeping, commercial waste, abandoned vehicle, overflowing bin. WCC-10087 (pothole with cyclist injury) remains a strong secondary demo.

### Planning Policies (5 NEW)

| Policy ID | Covers | Key SLAs |
|-----------|--------|----------|
| POL-PE-001 | Investigation timelines | Urgent=same day, High=5 days, Standard=15 days. Acknowledge in 3 days. Decision in 8 weeks. |
| POL-PE-002 | Heritage enforcement | Listed building works = criminal offence. Prosecution file within 14 working days. |
| POL-PE-003 | Change of use | Enforcement notice within 6 weeks. Non-compliance prosecution within 14 days. |
| POL-PE-004 | Breach of conditions | BCN has NO appeal right. Noise assessment within 10 working days. |
| POL-PE-005 | Councillor enquiries | Response within 5 working days. 3+ complaints = automatic senior review. |

### Planning Workflows (4 NEW)

Unauthorised construction (9 states), Listed building breach (8 states), Change of use (8 states), Breach of conditions (8 states).

---

## PHASE 0: PRE-BUILD (Tonight, 15 April)

---

### 0.0 — Environment Setup (Both, 15 min) — DONE

**Architecture:** pnpm + Turborepo monorepo. All TypeScript.

```
CaseView/
├── apps/
│   ├── web/         ← Vite + React frontend (port 3000)
│   └── backend/     ← Express.js API server (port 3001)
├── packages/
│   ├── core/        ← @repo/core — ALL business logic (flag engine, policy matcher, etc.)
│   ├── ui/          ← @repo/ui — React components
│   ├── typescript-config/
│   └── eslint-config/
├── data/            ← All 6 JSON data files + cached-responses.json
└── turbo.json
```

```bash
pnpm install              # Install all dependencies
pnpm dev                  # Run web + backend in parallel
pnpm check-types          # Type-check all packages (must pass before commit)
pnpm lint                 # Lint all packages (zero-warning policy)
pnpm --filter @repo/core test  # Run flag engine tests (33 tests)
```

---

### 0.1 — Backend Scaffold (Person A — Claude Code)

**PROMPT — Scaffold the entire Express.js backend:**

```
I'm building a Express.js backend for "CaseView" — a council case management intelligence tool for Westminster City Council. It handles TWO domains: street reporting (potholes, fly-tipping etc.) AND planning enforcement breaches.

Data files in data/ directory:

STREET REPORTING:
- cases.json: 10 cases (case_id, case_type, status, reporter{name,reference,ward}, location{street,postcode,lat,lon}, assigned_to, contractor, priority, duplicate_count, created_date, last_updated, timeline[], case_notes)
- policy-extracts.json: 10 policies (policy_id, title, body, applicable_case_types[])
- workflow-states.json: 9 workflows keyed by case_type, each with states[] containing state, label, description, allowed_transitions[], required_actions[], sla_hours/sla_days

PLANNING BREACH:
- planning-cases.json: 4 cases (same structure as above PLUS planning_ref, conservation_area, listed_building, listed_grade)
- planning-policies.json: 5 policies (same structure — policy_id, title, body, applicable_case_types[])
- planning-workflows.json: 4 workflows (unauthorised_construction, listed_building_breach, change_of_use, breach_of_conditions)

Create these backend files:

1. backend/data_layer.py
   - Abstract CaseRepository, PolicyRepository, WorkflowRepository (ABC classes)
   - JsonCaseRepository: loads BOTH cases.json AND planning-cases.json into one list. Implements list_cases(filters=None), get_case(case_id), get_case_by_reference(reference)
   - JsonPolicyRepository: loads BOTH policy files. get_policies_for_type(case_type) matches where case_type is in applicable_case_types
   - JsonWorkflowRepository: loads BOTH workflow files. get_workflow(case_type) returns the workflow definition
   - create_repositories(mode="json") factory

2. backend/policy-matcher.ts (@repo/core)
   - match_policies(case_type, all_policies) -> matching policies
   - Planning types: unauthorised_construction, listed_building_breach, change_of_use, breach_of_conditions
   - Street types: fly_tipping, pothole, graffiti, street_lighting, noise_complaint, rough_sleeping, commercial_waste, abandoned_vehicle, overflowing_bin

3. backend/workflow-engine.ts (@repo/core)
   - compute_workflow_state(case, workflow_def) -> {current_state, label, required_actions, allowed_transitions, days_in_state, should_be_in}
   - Planning state mismatches to detect:
     * WCC-10301: investigation for 36 days but enforcement_notice_issued should have happened (8-week / 56-day SLA for investigation stage)
     * WCC-10302: urgent_investigation but prosecution file not submitted within 14 days of criminal offence confirmation

4. backend/flag-engine.ts (@repo/core) — THE CORE VALUE
   compute_flags(case, policies, workflow_states, today=date(2026,4,15)) -> list of flags

   PLANNING BREACH FLAGS:
   a) prosecution_file_overdue: listed building case where criminal offence confirmed but prosecution file not submitted to legal within 14 working days (POL-PE-002)
   b) enforcement_notice_delay: investigation > 56 days (8 weeks) without enforcement notice issued (POL-PE-001)
   c) compliance_deadline_imminent: enforcement notice compliance deadline within 3 days (POL-PE-003)
   d) non_compliance_detected: monitoring visit confirms breach continuing after notice served (POL-PE-003)
   e) councillor_enquiry_overdue: councillor enquiry not responded to within 5 working days (POL-PE-005)
   f) heritage_irreversible_damage: listed building works ongoing causing irreversible loss (POL-PE-002)
   g) cross_referral_missing: change of use with smoking/noise but no Environmental Health referral (POL-PE-003)
   h) multiple_complaints_escalation: 3+ complaints requiring senior review (POL-PE-005)
   
   STREET REPORTING FLAGS (keep existing):
   injury_not_triaged, sla_breach, evidence_not_referred, duplicate_escalation, member_enquiry_overdue, recurrence

   Each flag: {severity, type, message, policy_ref, days_overdue or hours_overdue}
   Today is 2026-04-15.

5. backend/app.py — Express.js routes
   - GET /api/cases -> all 14 cases with summary flags, filterable by ?domain=planning|street|all
   - GET /api/cases/{case_id} -> full case + policies + workflow + flags
   - GET /api/cases/{case_id}/summary -> Claude summary
   - POST /api/cases/{case_id}/chat -> Claude chat
   - GET /api/cases/{case_id}/view -> case data + generative layout + nudges (stub for now)
   - GET /api/dashboard -> aggregated stats (split by domain: planning vs street)
   - GET /api/resident/{reference} -> sanitised status
   - Serve React build from frontend/dist/ in production
   - CORS enabled for Vite dev server (localhost:3000)

6. backend/resident_service.py
   - translate_status for planning cases:
     * "complaint_received" -> "We have received your report about possible planning irregularities"
     * "investigation" -> "We are investigating the matter you reported"
     * "enforcement_notice_issued" -> "We have taken formal action to address the breach"
     * "compliance_monitoring" -> "We are monitoring compliance with our enforcement action"
     * "resolved" -> "This case has been resolved"
   - Never reveal enforcement details, legal strategy, or prosecution plans to residents

All functions async. Pydantic models for responses. Error handling. Load data once at startup.
```

---

### 0.2 — React Frontend Scaffold (Person B — Claude Code)

**PROMPT — Scaffold the Vite React app with GOV.UK styling:**

```
I'm building a React frontend for "CaseView" — a council case management tool. It uses Vite + React. The project is already scaffolded at frontend/ with npm create vite.

The app has 5 views: Case List, Officer Case View, Area Manager Dashboard, Resident Status, and Compare View. It talks to a Express.js backend at http://localhost:3001.

Create/update these files:

1. frontend/src/App.jsx
   - React Router with routes: / (case list), /case/:caseId (case view), /dashboard (manager), /resident (status), /compare (side-by-side)
   - Global layout with header and role switcher
   - Role state (officer/area_manager/resident) stored in React state, passed as X-CaseView-Role header in all API calls
   - When role changes: officer->/, area_manager->/dashboard, resident->/resident

2. frontend/src/components/Header.jsx
   - Black GOV.UK-style header bar
   - "CaseView" logo text left
   - Role switcher pills right: Officer | Area Manager | Resident
   - Active role highlighted (white bg, black text)
   - Domain filter: "All | Planning | Street" tabs below header (filters case list by domain)

3. frontend/src/components/CaseList.jsx
   - Fetches GET /api/cases?domain={selected}
   - Table with columns: Case ID, Type, Status (coloured badge), Priority, Location, Flags (count with severity colour), Domain (Planning/Street tag)
   - Planning cases highlighted with a subtle left border or tag
   - Click row -> navigate to /case/{caseId}
   - Sort by: severity (critical first), then date

4. frontend/src/components/CaseView.jsx — THE KEY COMPONENT
   - Fetches GET /api/cases/{caseId}/view
   - Fixed header: case ID, type, status badge, flag count badge, conservation area tag (if applicable), listed building tag (if applicable)
   - Below header: renders components in AI-determined order from layout.components[]
   - Each component mapped from COMPONENT_REGISTRY
   - Emphasis styling: critical (red left border, expanded), normal, collapsed (details/summary toggle)
   - If layout.nudge_text: render NudgeBanner at top

5. frontend/src/components/case/ — Individual case view components:
   
   a) NudgeBanner.jsx: Red/dark alert bar with nudge text + action buttons. role="alert"
   b) FlagsPanel.jsx: List of flags with severity icon (CircleAlert from lucide-react), message, policy ref link
   c) AISummary.jsx: Blue-tinted card with summary text and "Recommended:" action
   d) Timeline.jsx: Vertical timeline with dots/line. Warning events get red styling. "Today" marker.
   e) PolicyPanel.jsx: Collapsible policy cards. Flagged policies expanded by default. "Expand full text" toggle.
   f) CaseNotes.jsx: Expandable text panel
   g) WorkflowState.jsx: Horizontal state bar showing all states, current highlighted, "should be here" arrow if mismatch
   h) DuplicatePanel.jsx: Linked reports count with locations
   i) ContractorInfo.jsx: Contractor name + SLA status
   j) LocationMap.jsx: Street, postcode, ward, conservation area, listed status badges
   k) EvidenceTracker.jsx: Checklist of evidence/actions done vs pending (from timeline analysis)
   l) NudgeActions.jsx: List of nudge action buttons with urgency styling
   m) EscalationHistory.jsx: Previous escalations from timeline
   n) ResidentImpact.jsx: Community impact when high duplicate count
   o) PlanningInfo.jsx: Planning reference, conservation area, listed building grade, applicable conditions

6. frontend/src/components/Dashboard.jsx
   - Fetches GET /api/dashboard
   - Summary cards row: Total Cases, Planning Critical, Street Critical, Warnings, Resolved
   - "Cases Requiring Attention" list — sorted by severity, shows domain tag
   - Split view: Planning Enforcement section + Street Reporting section
   - Each has flagged cases, SLA performance bar
   - AI Insight panel (fetched from /api/dashboard/insight)

7. frontend/src/components/ResidentStatus.jsx
   - Clean, simple lookup page
   - Reference input + submit
   - Fetches GET /api/resident/{reference}
   - Shows plain English status, what happens next, simplified timeline
   - Optional chat: "Ask about your report" with collapsible chat

8. frontend/src/components/CompareView.jsx
   - Two case selectors (dropdowns with all 14 case IDs)
   - Two CaseView panels side by side
   - Default: WCC-10302 (critical listed building) vs WCC-10304 (routine conditions breach)
   - This is the "wow moment" for generative UI demo

9. frontend/src/hooks/useApi.js
   - Custom hook: useApi(endpoint, options) — handles fetch with role header, loading state, error state
   - getRole() reads from app context
   - Base URL: import.meta.env.VITE_API_URL || 'http://localhost:3001'

10. frontend/src/styles/govuk.css
    GOV.UK-inspired styles:
    - Vars: --govuk-blue: #1d70b8, --govuk-red: #d4351c, --govuk-green: #00703c, --govuk-black: #0b0c0e, --govuk-grey: #505a5f, --govuk-light-grey: #f3f2f1
    - Body: font-family: "GDS Transport", Arial, sans-serif; background: #f3f2f1
    - .govuk-header: black bg, white text
    - .govuk-tag: coloured pill badges (red/amber/green/blue/purple)
    - .govuk-tag--planning: purple background for planning domain
    - .govuk-tag--street: blue background for street domain
    - .govuk-panel, .govuk-panel--critical, .govuk-panel--warning
    - .nudge-banner: dark red bg, white text, action buttons
    - .timeline, .timeline-event, .timeline-event--warning
    - .flag-row with severity icon and styling
    - .emphasis-critical: 4px red left border
    - .emphasis-collapsed: collapsed with expand toggle
    - .summary-card-row, .summary-card
    - .compare-view: two-column equal layout
    - Responsive: stack below 768px
    - Focus states, high contrast, ARIA support

Install react-router-dom: cd frontend && npm install react-router-dom

The API returns all 14 cases (10 street + 4 planning). Planning cases have extra fields: planning_ref, conservation_area, listed_building, listed_grade.
```

---

### 0.3 — Wireframe Prompts for Pencil/Tldraw (Person B)

**PROMPT 1 — Officer Case View (Planning Breach focus):**

```
Design a wireframe for a planning enforcement case view. Westminster City Council CaseView tool.

Case: WCC-10302 — Listed Building, Jermyn Street, Grade II. Criminal offence — Victorian shopfront being destroyed.

Layout (top to bottom):
1. Header: "CaseView" left, role switcher right, domain tabs (Planning | Street | All) below
2. Back link + Case ID + badges: "Grade II Listed" purple tag, "St James's Conservation Area" tag, "CRIMINAL OFFENCE" red tag
3. NUDGE BANNER (red, full-width, prominent):
   "Submit prosecution file to legal NOW. Criminal offence confirmed 12 days ago — POL-PE-002 requires submission within 14 working days. Heritage fabric being irreversibly destroyed."
   [Submit prosecution file] [Request urgent heritage assessment] buttons
4. FLAGS PANEL (red border): "Prosecution file overdue", "Irreversible heritage damage ongoing", "Appeal lodged — damage during appeal period"
5. Two-column: Left = Planning Details (Ref, Conservation Area, Listed Grade, Status) + Location. Right = AI Summary (3 sentences about the criminal offence and urgency)
6. TIMELINE: vertical with events. Criminal offence confirmation, TSN served, enforcement notice, appeal lodged — each with dates. RED markers for missed deadlines.
7. POLICY PANEL: POL-PE-002 expanded with relevant section highlighted ("prosecution file within 14 working days")
8. WORKFLOW STATE: horizontal bar — complaint_received -> urgent_investigation -> temporary_stop_notice -> LBEN -> [appeal_lodged] current. "Should be at: prosecution" indicator.
9. EVIDENCE TRACKER: photos/video done, prosecution file NOT done, heritage assessment NOT done
10. Chat panel at bottom

GOV.UK Design System. Black/white/red. Clean, urgent, professional.
```

**PROMPT 2 — Dashboard (Planning + Street split):**

```
Design a wireframe for an area manager dashboard showing BOTH planning enforcement and street reporting.

Layout:
1. Header with "CaseView — Westminster Area Manager Dashboard" + date
2. Summary cards: Total (14), Planning Critical (2), Street Critical (3), Warnings (5), Resolved (2)
3. PLANNING ENFORCEMENT section:
   - "Planning Cases Requiring Attention" table: case ID, type (Unauthorised Construction / Listed Building / Change of Use / Conditions Breach), location, key flag, status, [Open]
   - Planning SLA Performance bar (on track / breached / approaching)
4. STREET REPORTING section:
   - Same format but for street cases
   - Contractor breakdown horizontal bars
5. CROSS-DOMAIN INSIGHTS (AI panel):
   "2 criminal offence timelines breaching. Shisha lounge enforcement deadline in 2 days. Jermyn Street prosecution file 2 days from being overdue. Pothole injury liability risk."
6. Duplicate hotspots map/list

Two-column where possible. Planning section has purple accent, street section has blue accent.
```

**PROMPT 3 — Resident Status (Planning):**

```
Wireframe for a resident checking the status of their planning enforcement complaint.

Very simple, very clean:
1. Westminster header
2. "Check the status of your planning complaint"
3. Reference input + [Check status]
4. Results: "Unauthorised construction, Porchester Terrace"
   Status: "We are investigating this matter"
   "What happens next": "Our enforcement team is assessing the case..."
   Timeline: complaint received -> investigation started -> [current]
   "Last updated" date

NO internal details. No mention of enforcement notices, prosecution, legal strategy. Just: "we received it, we're looking into it, here's what happens next."
```

---

### 0.4 — Claude API Integration (Person A — Claude Code)

**PROMPT — Add Claude integration with planning-aware agents:**

```
Add Claude API integration to CaseView. API key from ANTHROPIC_API_KEY env var.

Create backend/claude_service.py:

1. ClaudeService class with Anthropic client, model="claude-sonnet-4-20250514"

2. Three agent system prompts:

OFFICER_SYSTEM = """You are a Westminster City Council enforcement advisor helping a planning enforcement officer or street reporting officer.

Rules:
- Cite specific policy IDs (POL-PE-001, POL-HW-001, etc.) when referencing timelines and requirements
- For planning cases: note conservation area status, listed building grade, and applicable legislation (Town & Country Planning Act 1990, Planning (Listed Buildings and Conservation Areas) Act 1990)
- For listed building cases: always note that unauthorised works are a CRIMINAL OFFENCE under Section 9
- Never make decisions — surface information and suggest next enforcement steps
- Flag prosecution timeline risks explicitly
- Flag councillor enquiry deadlines
- Keep summaries to 3 sentences. Keep next actions to 1-2 specific steps.
- Use plain professional English"""

RESIDENT_SYSTEM = """You are a Westminster City Council public information assistant helping a resident who reported a planning concern or street issue.

Rules:
- Use plain English only. No legal terminology, no enforcement jargon.
- NEVER reveal: enforcement strategy, prosecution plans, legal advice, officer names, specific enforcement notice details
- Do not speculate on outcomes or timelines for enforcement action
- Be warm and acknowledge frustration if implied
- For planning cases, you can say: "We are looking into the matter you reported" — never "We are preparing prosecution"
- If asked about legal proceedings: "We can't share details of any enforcement action, but we are actively working on this matter"
- Only discuss the specific report linked to their reference number"""

MANAGER_SYSTEM = """You are a Westminster City Council operations advisor helping a team leader reviewing enforcement caseload.

Rules:
- Highlight prosecution timeline risks — any overdue prosecution files
- Flag imminent compliance deadlines
- Note heritage cases with irreversible damage as highest priority
- Cross-reference planning and street cases for the same location/ward
- Quantify: cases breaching SLA, average investigation duration
- Recommend concrete next actions with specific case IDs
- Keep to 3 bullet points maximum"""

3. Functions:
   - generate_summary(case, flags, policies) -> {summary, next_action}
   - case_chat(case, policies, flags, workflow, user_message, history) -> str
   - manager_insight(dashboard_data) -> str
   - All with graceful fallback if API fails

4. Pre-cached responses for demo cases in data/cached_responses.json:
   - WCC-10302 summary MUST mention: criminal offence, prosecution file overdue, irreversible heritage loss
   - WCC-10301 summary MUST mention: 36 days since breach confirmed, enforcement notice not issued, conservation area
   - WCC-10303 summary MUST mention: compliance deadline 17 April (2 days away), still operating, prosecution file needed
   - WCC-10087 summary MUST mention: cyclist injury, 48 hours untriaged, Category 1

5. Update backend/app.py: wire all Claude endpoints with try/except falling back to cached responses
```

---

### 0.5 — Generative UI + Nudge Engine (Person A — Claude Code)

**PROMPT — Build the generative UI layout engine:**

```
Create the generative UI and nudge engine for CaseView.

1. backend/generative_ui.py:

generate_case_layout(case, role, flags, policies, workflow) -> dict

Calls Claude to select and order UI components. 15 available components:
"nudge_banner", "flags_panel", "ai_summary", "ai_next_action", "timeline",
"policy_panel", "case_notes", "location_map", "duplicate_panel", "contractor_info",
"workflow_state", "evidence_tracker", "escalation_history", "resident_impact",
"planning_info"

The prompt tells Claude: "You are a UI composition engine. Given this case, decide which components to show and in what order. Most important information FIRST."

Returns: { nudge_text: str|null, components: [{name, emphasis: critical|normal|collapsed}] }

PLANNING-SPECIFIC LOGIC in the prompt:
- If listed_building=true: always include planning_info with emphasis=critical
- If criminal offence timeline breached: nudge_banner MUST be first
- If conservation_area set: include planning_info
- For planning cases: always include evidence_tracker (enforcement actions done vs pending)

Pre-computed fallback layouts:
- WCC-10302 (listed building criminal offence): nudge_banner(critical) -> flags_panel(critical) -> planning_info(critical) -> ai_summary -> evidence_tracker -> timeline -> policy_panel -> workflow_state -> case_notes(collapsed)
- WCC-10304 (routine conditions breach): ai_summary -> workflow_state -> evidence_tracker -> timeline -> policy_panel(collapsed) -> case_notes(collapsed)

2. backend/nudge_engine.py:

compute_nudges(case, flags, workflow) -> list of nudges

PLANNING NUDGES:
- prosecution_file_overdue -> "Submit prosecution file to legal", button: {label: "Prepare prosecution file", api_call: "/api/cases/{id}/action", payload: {action: "prepare_prosecution"}}
- enforcement_notice_delay -> "Issue enforcement notice", button: {label: "Draft enforcement notice", api_call: "/api/cases/{id}/action", payload: {action: "draft_enforcement_notice"}}  
- compliance_deadline_imminent -> "Prepare for non-compliance action", button: {label: "Start prosecution prep", api_call: "/api/cases/{id}/action", payload: {action: "prosecution_prep"}}
- non_compliance_detected -> "Initiate prosecution proceedings", button: {label: "Submit prosecution file", ...}
- heritage_irreversible_damage -> "Request urgent heritage assessment", button: {label: "Commission heritage assessment", ...}
- cross_referral_missing -> "Refer to Environmental Health", button: {label: "Create EH referral", ...}
- councillor_enquiry_overdue -> "Draft councillor response", button: {label: "Draft response", api_call: "/api/cases/{id}/chat", payload: {message: "Draft a response to the councillor enquiry"}}

STREET REPORTING NUDGES (keep existing):
- injury_not_triaged -> "Reclassify as Cat 1"
- evidence_not_referred -> "Create enforcement referral"
- sla_breach -> "Chase contractor"

Sort by urgency: immediate > high > normal

3. Wire into backend/app.py:
GET /api/cases/{case_id}/view returns:
{case, matched_policies, workflow, flags, nudges, layout, ai_summary, ai_next_action}
```

---

### 0.6 — Flag Engine Tests (Person A — Claude Code)

**PROMPT — Write tests covering planning breach flags:**

```
Write pytest tests for the CaseView flag engine covering BOTH planning breach and street reporting flags. File: tests/test_flags.py

PLANNING BREACH TESTS:

1. test_prosecution_file_overdue:
   - Case WCC-10302 (listed building breach, criminal offence confirmed 3 April)
   - compute_flags should return flag type="prosecution_file_overdue", severity="critical"
   - Should reference POL-PE-002
   - 12 days since criminal offence confirmed, 14-day deadline

2. test_enforcement_notice_delay:
   - Case WCC-10301 (unauthorised construction, investigation since 14 March)
   - Should return flag about enforcement notice delay (36 days in investigation, approaching 56-day/8-week SLA)
   - Reference POL-PE-001

3. test_compliance_deadline_imminent:
   - Case WCC-10303 (change of use, compliance deadline 17 April = 2 days away)
   - Should return flag type="compliance_deadline_imminent"
   - Reference POL-PE-003

4. test_non_compliance:
   - Case WCC-10303 (monitoring visit confirmed shisha lounge still operating)
   - Should return flag type="non_compliance_detected"

5. test_heritage_irreversible_damage:
   - Case WCC-10302 (Victorian shopfront being destroyed)
   - Should return flag about irreversible heritage loss

6. test_councillor_enquiry_planning:
   - Case WCC-10301 and WCC-10303 both have councillor enquiries
   - Should return member_enquiry flags

7. test_multiple_complaints_escalation:
   - WCC-10303 has 7 complaints -> should trigger senior review escalation

8. test_routine_planning_case_no_critical:
   - WCC-10304 (breach of conditions, progressing normally)
   - Should NOT have critical flags

STREET REPORTING TESTS (keep from v1):
9. test_injury_not_triaged (WCC-10087)
10. test_evidence_not_referred (WCC-10042)
11. test_clean_case (WCC-10134)

Use today = date(2026, 4, 15). Load actual data files.
Run: pnpm --filter @repo/core test  # 33 vitest tests
```

---

### CHECKPOINT 0.6 — Pre-Build Complete

**Both verify:**
```bash
# Person A
pnpm --filter @repo/core test
pnpm exec turbo dev --filter=backend  # Express on port 3001

# Person B  
cd frontend && npm run dev
# Open http://localhost:3000
```

Test:
- [ ] Case list shows 14 cases (10 street + 4 planning)
- [ ] Planning cases show domain tag
- [ ] WCC-10302 shows critical flags and nudge banner
- [ ] WCC-10304 shows calm layout
- [ ] Dashboard splits planning/street sections
- [ ] Resident lookup works

```bash
git add -A && git commit -m "CaseView pre-build: Express.js + React + planning breach + street reporting"
git push
```

---

## PHASE 1: HACKATHON DAY — ARRIVAL (08:30-09:15)

**Person A (08:30):** Register repo on hackathon dashboard. **MILESTONE 1: Repo.**

**Person B (08:30):** Display laptop running. React dev server + API. All views open in tabs.

**FDE Brief (09:15, 30 sec):**
```
"We've pre-built a planning enforcement and street reporting tool for Westminster.
Open brief — we have operational experience with this domain. Planning breach
enforcement is the focus: unauthorised construction in conservation areas, criminal
offences on listed buildings, non-compliance with enforcement notices. Plus 10
street reporting cases for breadth. React frontend with generative UI — the
layout adapts to each case."
```

---

## PHASE 2: BUILD PHASE 1 (09:55-11:00)

### 2.1 — Adaptive CaseView Polish (Person B, 40 min)

**PROMPT for Claude Code — Polish the case view components:**

```
Polish the CaseView React components for demo quality. Focus on the planning breach cases.

1. Update CaseView.jsx:
   - When case has conservation_area: show purple "Conservation Area: {name}" badge in header
   - When case has listed_building: show red "Grade {grade} Listed" badge
   - When case has planning_ref: show "Planning Ref: {ref}" in info panel
   - For listed building cases: add a red bar at top saying "Criminal Offence — Listed Buildings Act 1990"

2. Update PlanningInfo.jsx:
   - Show: planning reference (linked), conservation area name, listed building grade
   - If listed building: show "Section 9 offence" warning
   - Show applicable legislation
   - Show enforcement notice details if issued (from timeline)
   - Show appeal status if appeal lodged

3. Update EvidenceTracker.jsx:
   - For planning cases, track enforcement milestones:
     [done/pending] Site visit
     [done/pending] PCN issued
     [done/pending] PCN response received
     [done/pending] Enforcement notice issued
     [done/pending] Prosecution file submitted
     [done/pending] Compliance monitoring visit
   - Parse these from the timeline events
   - Overdue items get red styling with "OVERDUE" tag

4. Update WorkflowState.jsx:
   - For planning workflows (8-9 states), use a horizontal scrollable bar
   - Current state: blue highlighted
   - "Should be" state: red dashed outline
   - Past states: green checkmark
   - Future states: grey

5. Update NudgeBanner.jsx:
   - Planning nudges should show the legislation reference (e.g., "Section 9, Planning (Listed Buildings) Act 1990")
   - Action buttons should be GOV.UK green buttons with white text
   - Multiple nudges stack vertically
   - Most urgent at top

6. Update Timeline.jsx:
   - Planning timelines are longer and more complex — add date grouping by week
   - Events with legal significance get a gavel icon (Scale from lucide-react)
   - Councillor enquiry events get a person icon
   - Criminal offence events get a red alert icon

Make all components keyboard navigable. ARIA labels on interactive elements.
```

---

### 2.2 — Claude Prompt Tuning for Planning (Person A, 25 min)

**PROMPT for Claude Code — Tune Claude for planning breach demos:**

```
Tune the Claude prompts in CaseView for planning breach demo quality.

1. Test and adjust the OFFICER summary for each planning case:

WCC-10302 (listed building) — MUST produce something like:
"CRIMINAL OFFENCE: Unauthorised removal of a Grade II listed Victorian shopfront at 47 Jermyn Street, St James's Conservation Area. Temporary Stop Notice served but original fabric is being irreversibly destroyed during the appeal period. Prosecution file has NOT been submitted to legal — POL-PE-002 requires submission within 14 working days of offence confirmation; 12 days have elapsed."
Next action: "Submit prosecution file to legal immediately. Commission urgent heritage impact assessment to quantify irreversible loss for the prosecution evidence bundle."

WCC-10301 (unauthorised construction) — MUST mention:
"36 days since site visit confirmed breach, no enforcement notice issued, conservation area, councillor chasing"

WCC-10303 (change of use) — MUST mention:
"Enforcement notice compliance deadline is 17 April (2 days). Monitoring visit confirmed non-compliance. Prosecution file not prepared."

WCC-10304 (routine) — should be calm:
"Breach of conditions case progressing through normal enforcement process. Partial compliance achieved on operating hours. Noise assessment pending — due by 25 April."

2. Test OFFICER CHAT responses:

For WCC-10302, test:
- "Is this a criminal offence?" -> YES, cite Section 9 of the Listed Buildings Act, explain penalties
- "What should I do first?" -> Submit prosecution file, cite POL-PE-002 14-day deadline
- "Can they continue during appeal?" -> Explain TSN vs enforcement notice appeal process
- "What's the maximum penalty?" -> Unlimited fine and/or 2 years imprisonment

For WCC-10303, test:
- "What happens if they don't comply by the 17th?" -> Prosecution proceedings, cite POL-PE-003
- "Should we refer to licensing?" -> Yes, POL-PE-003 requires licensing referral within 5 working days + Health Act 2006 for indoor smoking

3. Pre-cache all responses in data/cached_responses.json for demo reliability. Structure:
{
  "summaries": {"WCC-2026-10302": {...}, ...},
  "chat_responses": {"WCC-2026-10302": {"Is this a criminal offence?": "...", ...}}
}

Fall back to cached when Claude is slow (>3 sec timeout).
```

---

### 2.3 — Access Control + Role Demo (Person A, 15 min)

**PROMPT for Claude Code — Add role-based access:**

```
Add role-based access to CaseView.

backend/app.py updates:
- Read role from X-CaseView-Role header (default: "officer")
- require_role(*roles) Express.js dependency
- Officer: all case endpoints + chat
- Area Manager: all officer endpoints + dashboard + dashboard/insight
- Resident: /api/resident/{ref} + /api/resident/{ref}/chat only

For the React frontend:
- Role switcher in Header.jsx sets role in React context
- All useApi() calls include the role header
- When resident role: redirect to /resident, hide case list and dashboard nav
- When officer: show case list, hide dashboard aggregates
- When area_manager: show dashboard as home, can drill into cases

Key demo: switch from officer (seeing full enforcement details, prosecution timeline, policy refs) to resident (seeing "We are investigating this matter" — no enforcement details leaked).
```

---

### CHECKPOINT 2.3 (11:00) — "First Working Prototype"

- [ ] 14 cases visible, filterable by domain
- [ ] WCC-10302 shows criminal offence nudge banner + prosecution timeline flags
- [ ] WCC-10304 shows calm layout, no nudge
- [ ] Dashboard splits planning/street with AI insight
- [ ] Resident view shows sanitised planning status
- [ ] Role switcher changes visible data
- [ ] Chat works (cached or live)

**Hit "First Working Prototype" milestone.**

```bash
git add -A && git commit -m "Working prototype — planning breach + street reporting + generative UI"
git push
```

---

## PHASE 3: BUILD PHASE 2 (11:45-12:30)

### 3.1 — Compare View for Demo (Person B, 20 min)

**PROMPT for Claude Code — Build the compare view:**

```
Build the CompareView component for CaseView React app.

frontend/src/components/CompareView.jsx:

- Two panels side by side (50/50 split)
- Each has a dropdown to select a case from all 14 cases
- Default: Left = WCC-2026-10302 (critical listed building), Right = WCC-2026-10304 (routine conditions)
- Each panel renders a mini version of CaseView (just nudge banner + flags + summary + workflow state)
- Responsive: stack vertically on mobile

The demo purpose: judge sees TWO planning cases side by side:
- Left: red nudge banner, criminal offence flags, urgent prosecution timeline
- Right: calm, no nudge, "progressing normally"
- Same tool, completely different layouts = generative UI

Also add a "Quick Compare" button on the case list page that pre-selects WCC-10302 vs WCC-10304.

Style: thin divider between panels. Planning domain purple accent on both.
```

### 3.2 — Resident Chat for Planning (Person B, 15 min)

**PROMPT for Claude Code — Add resident planning chat:**

```
Add a chat feature to the resident status page for planning enforcement complaints.

In ResidentStatus.jsx:
- Below status display, collapsible "Ask about your complaint" section
- Chat input + send button
- POST to /api/resident/{reference}/chat
- Show typing indicator

The RESIDENT agent for planning MUST:
- Never say "prosecution", "enforcement notice", "criminal offence", "legal action"
- Say: "We are actively looking into the matter", "Our team is working on this"
- If asked "will they be forced to stop?": "We have formal processes to address planning breaches. We can't share specific details of our approach."
- If asked "is it illegal?": "There are rules about changes to buildings in protected areas. Our enforcement team is investigating."

Test with REP-30101 (planning complaint):
- "Has anyone looked at my complaint?" -> warm, yes we have, investigating
- "When will the building work stop?" -> can't share enforcement details, but we are acting on it
- "This is ruining my quality of life" -> empathetic, acknowledge impact
```

### 3.3 — Dashboard AI Insight (Person A, 10 min)

**PROMPT for Claude Code — Wire dashboard AI insight:**

```
Wire the area manager AI insight for the dashboard.

GET /api/dashboard/insight calls ClaudeService.manager_insight() with:
- All 14 cases, their flags, and domain tags
- Planning enforcement summary: cases by type, prosecution timelines, compliance deadlines
- Street reporting summary: SLA performance, contractor breakdown

The insight should say something like:
"URGENT: Two prosecution timeline risks. The Jermyn Street listed building prosecution file is 2 days from exceeding the 14-working-day deadline — submit today. The Edgware Road shisha lounge enforcement notice expires on 17 April with confirmed non-compliance — prosecution preparation should begin immediately. On the street reporting side, the Westbourne Grove pothole has a cyclist injury untriaged for 48 hours — liability exposure if not actioned."

Pre-cache this as the fallback in data/cached_responses.json.
```

---

### CHECKPOINT 3.3 (12:15) — "Complete User Journey"

Walk through:
1. Officer opens case list -> sees 14 cases, planning + street
2. Filters to "Planning" -> sees 4 planning breach cases
3. Opens WCC-10302 -> nudge banner: "Submit prosecution file NOW"
4. Asks chat: "Is this a criminal offence?" -> gets Section 9 citation
5. Opens WCC-10304 -> calm layout, no nudge
6. Compare view: WCC-10302 vs WCC-10304 side by side
7. Switches to Area Manager -> dashboard with cross-domain AI insight
8. Switches to Resident -> enters REP-30101 -> "We are investigating"
9. Asks: "When will the work stop?" -> warm response, no enforcement details

**Hit "Complete User Journey" milestone.**

```bash
git add -A && git commit -m "Complete user journey — planning + street + 3 roles"
git push
```

---

## PHASE 4: LUNCH + BUILD PHASE 3 (12:30-14:30)

### 4.1 — Visual Polish (Person B, 20 min)

**PROMPT for Claude Code — Final visual polish:**

```
Final visual polish for CaseView React app.

1. Planning domain styling:
   - Planning cases get a subtle purple left accent everywhere they appear
   - Listed building cases get a heritage-gold accent (#B8860B) in the header
   - Conservation area badge: outlined purple pill
   - "Criminal Offence" badge: solid red, white text, slightly larger

2. Nudge banner animations:
   - Gentle pulse animation on the nudge banner icon (not distracting, just draws eye)
   - Smooth slide-down when nudge banner appears on page load

3. Dashboard cards:
   - Critical count cards: red background with white text
   - Warning: amber
   - OK: green
   - Planning section card: purple top border
   - Street section card: blue top border

4. Compare view:
   - Subtle shadow on each panel
   - "vs" divider between panels
   - Labels: "Critical Case" on left, "Routine Case" on right

5. Loading states:
   - Skeleton loading for case view components
   - Spinner for chat responses
   - Fade-in for AI-generated content

6. Mobile responsive:
   - Compare view stacks vertically
   - Dashboard cards wrap to 2 per row
   - Nudge banner full width on mobile

Keep GOV.UK clean aesthetic. Professional, not flashy.
```

### 4.2 — Accessibility Pass (Person B, 10 min)

**PROMPT for Claude Code — Accessibility:**

```
Accessibility pass on all CaseView React components:
1. All pages: <html lang="en">, proper <title>, <meta viewport>
2. Nudge banner: role="alert", aria-live="assertive"
3. Flags: aria-label with severity description
4. Chat: role="log" on message container, aria-live="polite" for new messages
5. All form inputs: associated <label> elements
6. Focus states: visible blue outline on all focusable elements
7. Skip to main content link
8. Timeline: semantic <ol> markup
9. Collapsible sections: aria-expanded on toggles
10. Keyboard: all interactive elements reachable with Tab, Enter/Space to activate
```

### 4.3 — README + AI Log (Person A, 10 min)

**PROMPT for Claude Code — README:**

```
Create README.md for CaseView:

1. Title: CaseView — AI-Assisted Planning Enforcement & Street Reporting Intelligence
2. Challenge 3 (Open Brief): Supporting Casework Decisions
3. Domain: Westminster City Council planning enforcement + street reporting
4. Stack: pnpm Turborepo + Express.js + Claude API + Vite React
5. Quick start instructions
6. Features: Generative UI, Planning breach enforcement flags, 3 role-specific Claude agents, Policy matching, Workflow state tracking
7. Data: 14 synthetic cases (4 planning breach + 10 street reporting), 15 policies, 13 workflows
8. "How we used AI tools": double answer
9. "What would we do next": Connect to Dynamics CRM, planning portal integration, Heritage at Risk register, cross-council pattern detection

Also create AI-USAGE-LOG.md.
```

### 4.4 — Feature Freeze + Demo Prep (Both, 14:30)

**FEATURE FREEZE. No new features.**

Person B: Run demo 3 times. Time each section. Fix visual glitches.

Person A: Verify all cached responses work. Test offline mode (no Claude API).

```bash
git add -A && git commit -m "Feature freeze — demo ready"
git push
```

Browser tabs for demo:
1. Case list (filtered to Planning)
2. WCC-10302 (listed building — the star case)
3. WCC-10303 (shisha lounge — imminent deadline)
4. WCC-10304 (routine — for contrast)
5. Compare view (10302 vs 10304)
6. Dashboard
7. Resident status (REP-30101)

---

## PHASE 5: JUDGE TABLE VISIT (15:15) — Demo Script

**[0:00-0:30] THE PROBLEM — Person A**
"A planning enforcement officer in Westminster manages dozens of active cases. Unauthorised construction in conservation areas. Criminal offences against listed buildings. Businesses ignoring enforcement notices. Each case has different legislation, different timelines, different escalation paths. They're checking the planning portal, Dynamics CRM, and policy documents separately. CaseView puts it all on one screen — and the screen adapts to each case."

**[0:30-2:15] LIVE DEMO — THE CRIMINAL OFFENCE — Person B drives**
Open WCC-10302.

"This is a Grade II listed building on Jermyn Street. The original Victorian shopfront is being ripped out and replaced with aluminium. That's a criminal offence under Section 9 of the Listed Buildings Act."

"See the nudge banner? 'Submit prosecution file to legal NOW.' The system detected that a criminal offence was confirmed 12 days ago. POL-PE-002 requires the prosecution file within 14 working days. Two days left. The system caught a deadline the officer might have missed."

"The evidence tracker shows what's been done and what hasn't: Temporary Stop Notice served — yes. Police notified — yes. Prosecution file — NOT DONE. Heritage assessment — NOT DONE."

"Now watch..." [open WCC-10304] "Same tool, completely different layout. No nudge, no critical flags. 'Progressing normally.' The AI composed a different page because this case doesn't need urgency."

[Show compare view: 10302 vs 10304 side by side] "That's generative UI — the layout adapts to what matters for each case."

**[2:15-3:00] SHISHA LOUNGE — Person B shows WCC-10303**
"Different type of breach. A shisha lounge operating despite an enforcement notice. Compliance deadline is the 17th — two days from now. Our monitoring visit confirmed they're still open with 40 customers. The system flags both: non-compliance AND the imminent deadline. The nudge says 'Start prosecution preparation.'"

**[3:00-3:30] DASHBOARD — Person B**
"Area manager sees everything. Planning breaches on the left, street reporting on the right. The AI insight names the two prosecution timelines at risk and the pothole liability exposure."

**[3:30-3:45] RESIDENT VIEW — Person B**
Enter REP-30101. "Plain English. 'We are investigating this matter.' No mention of enforcement notices, prosecution, or legal strategy. Safe for public view."

**[3:45-4:15] HOW WE USED AI — Person A**
"Two layers. AI coding tools built this — Claude Code generated the React components, the flag engine, the policy matcher. We described planning enforcement, the tool proposed the architecture.

Claude's API is the intelligence layer: three role-specific agents (officer cites legislation, resident gets plain English, never leaks enforcement details), generative UI composition, case summaries.

The flag engine is deterministic. Prosecution timelines, SLA breaches, compliance deadlines — all rules. Claude is enhancement, not dependency."

**[4:15-5:00] WHAT'S NEXT — Person A**
"Four things. One: data abstraction layer switches from JSON to Dynamics 365 with one env var — field mapping is documented. Two: connect to Westminster's planning portal API for live application data. Three: Historic England's Heritage at Risk register integration — flag when enforcement cases affect at-risk buildings. Four: pilot with Westminster's enforcement team. Measure: time from complaint to enforcement action. Current average: weeks. Target: days."

---

## JUDGE Q&A CHEAT SHEET

| Question | Answer |
|----------|--------|
| **Hallucination?** | "Flag engine is deterministic — prosecution timelines, SLA breaches, compliance deadlines are all rule-based. Claude is advisory. Source policy and legislation shown alongside every recommendation." |
| **Data security?** | "Synthetic data today. Production: within council's Azure tenant. Planning enforcement data is sensitive — role-based access ensures residents never see enforcement strategy." |
| **Why planning breach?** | "Westminster has 56 conservation areas and thousands of listed buildings. Planning enforcement is complex — multiple legislation frameworks, criminal offence timelines, appeal processes. This is where officers need the most support." |
| **Scale?** | "REST API + React. Westminster processes hundreds of enforcement cases per year. Flag engine is O(n). The pattern works for any council — planning, licensing, housing, environmental health." |
| **Why not Dynamics?** | "Dynamics stores cases. CaseView interprets them. Dynamics can't cross-reference a case against 5 different policy documents, detect a prosecution timeline breach, or compose a different UI for a criminal offence vs a routine conditions breach." |
| **Generative UI?** | "Static forms show the same layout for every case. Our tool asks Claude to compose the page based on what matters NOW. Criminal offence? Prosecution deadline dominates. Routine? Calm and minimal." |
| **Listed building legislation?** | "Section 9 of the Planning (Listed Buildings and Conservation Areas) Act 1990. Unauthorised works are a criminal offence — unlimited fine and/or 2 years. We flag when prosecution timelines are at risk." |

---

## BACKUP PLANS

| Scenario | Response |
|----------|----------|
| Claude API down | Cached responses for all 4 planning demo cases. Flag engine still works. |
| WiFi unreliable | Everything runs locally. Vite dev server + Express.js + cached responses. |
| Behind at lunch | Cut to: WCC-10302 case view + compare view + resident. Three screens, make them perfect. |
| React build issues | Serve from Vite dev server directly. No need for production build during hackathon. |
| Judge asks about street cases | WCC-10087 (pothole injury) ready as backup demo. Same tool, different domain. |

---

## KEY DEMO CASES

| Case | Domain | What to Show | Why |
|------|--------|-------------|-----|
| WCC-10302 | Planning | Listed building criminal offence | **STAR CASE.** Prosecution file overdue. Irreversible heritage loss. |
| WCC-10303 | Planning | Shisha lounge non-compliance | Imminent deadline (17 April). Still operating. |
| WCC-10301 | Planning | Unauthorised construction | Conservation area. 36-day enforcement delay. Councillor chasing. |
| WCC-10304 | Planning | Conditions breach (routine) | Calm contrast case. Shows generative UI difference. |
| WCC-10087 | Street | Pothole cyclist injury | Secondary demo. Strongest street case. |
| REP-30101 | Planning | Resident reference | For resident status demo. |
| REP-30201 | Planning | Conservation Trust ref | Backup resident demo. |

---

## TIMELINE

| Time | Person A (Backend + AI) | Person B (Frontend + Design) | Checkpoint |
|------|------------------------|------------------------------|------------|
| **TONIGHT** | | | |
| 20:00 | Backend scaffold + data layer | Vite React scaffold + routing | |
| 21:00 | Flag engine (planning + street) | React components (15 case view components) | |
| 21:45 | Claude integration + cached responses | GOV.UK CSS styling | |
| 22:15 | Flag engine tests | | **CP: Pre-build works** |
| 22:30 | Generative UI + nudge engine | | `git commit + push` |
| **TOMORROW** | | | |
| 08:30 | Register repo | Display laptop ready | **M1: Repo** |
| 09:15 | FDE brief | Show prototype | |
| 09:55 | Claude prompt tuning (planning) | Case view component polish | |
| 10:30 | Access control | Compare view | |
| 11:00 | | | **M2: Working prototype** |
| 11:45 | Dashboard AI insight | Resident planning chat | |
| 12:00 | | | **CP: User journey test** |
| 12:15 | | | **M3: Complete journey** |
| 12:30 | LUNCH | LUNCH | |
| 13:55 | | Visual polish + animations | |
| 14:15 | README + AI log | Accessibility pass | |
| 14:30 | | | **FEATURE FREEZE** |
| 14:45 | Cached responses verified | Demo run-throughs x3 | |
| 15:15 | **JUDGES** | **DEMO** | |

---

*Print this. Bring it tomorrow. Planning breach is the story. Generative UI is the differentiator. Every prompt is ready to go.*

---

## ALIGNMENT ADDENDUM — Challenge 3 Brief Compliance Check

*This section maps every evaluation criterion from the Challenge 3 brief to our specific implementation, identifies terminology fixes for the demo, and ensures nothing is missed.*

---

### 1. TERMINOLOGY ALIGNMENT — Use the Brief's Words

The brief uses specific terms the judges will be listening for. Our internal naming is different. **During the demo and FDE brief, use the LEFT column. Internal code uses the RIGHT column — that's fine, but when speaking, match the brief.**

| Brief Says | We Say | Action |
|------------|--------|--------|
| **Caseworker** | Officer | Say "caseworker" in FDE brief, demo intro, and judge Q&A. Code can say "officer" — judges won't read the code. |
| **Team leader** | Area manager | Say "team leader" when presenting the dashboard. |
| **Applicant** | Resident | Say "applicant" when demoing the status page. |
| **Case management tool** | CaseView | Fine — "CaseView" is our product name. But describe it as "a case management tool" in the opening. |
| **Surfaces the relevant policy** | Policy matcher/panel | Use the phrase "surfaces the relevant policy matched by case type" verbatim — it's from the evaluation criteria. |
| **Workflow** | Workflow state | Say "shows where the case sits in its workflow and what action is required next" — exact brief language. |
| **Evidence outstanding beyond policy threshold** | Flag engine (prosecution_file_overdue, enforcement_notice_delay, etc.) | This is the most critical mapping. See section 3 below. |

**Updated FDE Brief (replace the one in Phase 1):**

```
"We've pre-built a casework support tool for Westminster City Council planning
enforcement. Challenge 3, open brief. Three users: caseworker, team leader,
applicant. The tool displays a case clearly, surfaces the relevant policy
matched by case type, shows where the case sits in its workflow and what action
is required next, and flags where evidence and actions have been outstanding
beyond policy thresholds. It works entirely without a language model. Claude
makes it better — but it works without it."
```

Note: this FDE brief deliberately mirrors the brief's "good outcome" description almost word-for-word. The judges wrote that sentence. Give it back to them.

---

### 2. THE "GOOD OUTCOME" CHECKLIST

The brief defines a "good outcome" explicitly. Every item must be demonstrable:

| Brief Criterion | Our Implementation | Where to Demo | Status |
|----------------|-------------------|--------------|--------|
| **Displays a case clearly** | CaseView.jsx with generative UI layout — 15 components composed per case | WCC-10302 case view | COVERED |
| **Surfaces the relevant policy matched by case type** | policy-matcher.ts (@repo/core): `match_policies(case_type, all_policies)` returns matching policies. PolicyPanel.jsx renders them, flagged ones expanded. | WCC-10302 shows POL-PE-002 expanded with "prosecution file within 14 working days" highlighted | COVERED |
| **Shows where the case sits in its workflow** | workflow-engine.ts (@repo/core): `compute_workflow_state()` returns current_state, label, required_actions. WorkflowState.jsx renders horizontal state bar with current state highlighted. | WCC-10302 shows "appeal_lodged" as current, with "should be at: prosecution" indicator | COVERED |
| **What action is required next** | Nudge engine transforms flags into specific action prompts. NudgeBanner.jsx + NudgeActions.jsx render as one-click buttons. | WCC-10302 nudge: "Submit prosecution file to legal NOW" | COVERED |
| **Flags evidence outstanding beyond policy threshold** | flag-engine.ts (@repo/core) checks every case against policy SLAs. 8 planning flags + 6 street flags. Each flag references the specific policy and counts days overdue. | WCC-10302: prosecution_file_overdue (12 days, 14-day threshold from POL-PE-002). WCC-10301: enforcement_notice_delay (36 days in investigation). WCC-10303: compliance_deadline_imminent (2 days). | COVERED — but see section 3 for framing |
| **Built entirely without a language model** | Flag engine, policy matcher, workflow engine, deadline checker — all deterministic TypeScript. Claude endpoints have cached fallbacks. The tool renders all flags, policies, workflow, and nudges WITHOUT any LLM call. | Demo this FIRST. Show flags + policy + workflow BEFORE showing Claude summary. | COVERED — needs demo order adjustment (see section 4) |

---

### 3. "EVIDENCE OUTSTANDING BEYOND POLICY THRESHOLD" — Framing Fix

The brief's exact phrase is **"flags evidence that has been outstanding beyond the policy threshold."** Our planning cases don't use the word "evidence" — they track enforcement milestones (prosecution files, enforcement notices, heritage assessments). But the concept is identical: **something that should have happened by a policy-defined deadline hasn't happened yet.**

**How to frame this in the demo:**

When showing WCC-10302's flags, say:

> "The system flags where actions and evidence are outstanding beyond policy thresholds. Here: POL-PE-002 requires the prosecution file within 14 working days of confirming a criminal offence. It's been 12 days. The policy threshold is about to be breached. The caseworker sees this flag, the exact policy reference, and a one-click action to start the prosecution file."

When showing WCC-10303, say:

> "Different threshold. The enforcement notice gave 28 days to comply. The compliance deadline is in 2 days. Our monitoring visit confirmed non-compliance. The system flags both: the imminent deadline AND the confirmed non-compliance — each tied to its policy."

**The key insight:** "evidence outstanding" in the brief is a general term. It covers any case requirement (evidence submission, enforcement action, response deadline, prosecution file) that exceeds its policy-defined SLA. Our flag engine does exactly this — but the demo language should use the brief's phrase, not our internal terminology.

**Flag-to-Brief mapping for each planning case:**

| Case | Flag | "Evidence/Action Outstanding" | "Beyond Policy Threshold" |
|------|------|------------------------------|--------------------------|
| WCC-10302 | prosecution_file_overdue | Prosecution file not submitted to legal | POL-PE-002: 14 working days from offence confirmation (12 days elapsed) |
| WCC-10302 | heritage_irreversible_damage | Heritage impact assessment not commissioned | POL-PE-002: immediate for irreversible works |
| WCC-10301 | enforcement_notice_delay | Enforcement notice not issued | POL-PE-001: 8-week investigation SLA (36 days elapsed, approaching 56) |
| WCC-10301 | councillor_enquiry_overdue | Councillor response not sent | POL-PE-005: 5 working days from enquiry |
| WCC-10303 | compliance_deadline_imminent | Compliance with enforcement notice | POL-PE-003: 28-day compliance period (expires 17 April) |
| WCC-10303 | non_compliance_detected | Cessation of unauthorised use | Monitoring visit confirmed non-compliance |
| WCC-10303 | cross_referral_missing | Environmental Health referral | POL-PE-003: 3 working days for EH referral |

---

### 4. DEMO ORDER FIX — Show "Works Without LLM" FIRST

The brief says a tool that does everything **"built entirely without a language model — is a complete and impressive prototype."** This means the judges value the deterministic layer highly. Our current demo script leads with the nudge banner and flags (good) but immediately mixes in AI summaries.

**Fix the demo flow to make the LLM-free layer explicit:**

**[0:30-1:30] DETERMINISTIC LAYER (no Claude):**
Open WCC-10302.

"Everything you see here runs without a language model. The flag engine checked this case against POL-PE-002 and detected the prosecution file is overdue. The policy matcher surfaced the relevant policy and highlighted the specific SLA. The workflow engine shows where the case sits — appeal_lodged — and that it should be at prosecution. The nudge banner tells the caseworker exactly what to do next. All deterministic. All rules."

**[1:30-2:00] CLAUDE ENHANCEMENT LAYER:**
"Now here's what Claude adds on top." Show the AI Summary panel. "Three sentences that synthesise the timeline, flags, and policies into a narrative the caseworker reads in 10 seconds. And if they want to ask a question..." [demo chat]. "Claude cites the specific legislation — Section 9, the Listed Buildings Act."

"The tool works without Claude. Claude makes it dramatically better. That's the architecture: deterministic foundation, intelligent enhancement."

**This two-beat structure directly answers the brief's implied question: "Can it work without an LLM?" YES, and here's proof. "Does the LLM add value?" YES, and here's how.**

---

### 5. HINT 2 ALIGNMENT — The Three Problems

The brief's Hint 2 identifies three problems caseworkers face. Name them explicitly in the demo:

| Problem (from Hint 2) | Our Solution | Demo Moment |
|-----------------------|-------------|-------------|
| **Information problem:** caseworker can't see everything about a case in one place | CaseView single screen: timeline, flags, policies, workflow, notes, location, evidence tracker — all in one view. Generative UI prioritises what matters. | "Instead of checking three systems, the caseworker sees everything on one screen." |
| **Policy problem:** knowing which policy applies to this case type | policy-matcher.ts (@repo/core) + PolicyPanel.jsx: automatic matching by case_type with relevant sections highlighted | "The system surfaces the relevant policy matched by case type — the caseworker doesn't have to look it up." |
| **Workflow problem:** knowing where the case is and what comes next | workflow-engine.ts (@repo/core) + WorkflowState.jsx + NudgeBanner.jsx: current state, required actions, deadline flags, specific next steps | "The workflow bar shows where this case sits. The nudge tells them what to do next." |

**Updated demo intro (replace [0:00-0:30]):**

"A caseworker in planning enforcement faces three problems every day. First, information is scattered across systems — they can't see everything about a case in one place. Second, they have to figure out which policy applies to this case type. Third, they need to know where the case is in its workflow and what action is required next. CaseView solves all three — and the screen adapts to each case."

---

### 6. DATA FORMAT ALIGNMENT

The brief specifies that Challenge 3 provides data in JSON format. Our data matches:

| Brief Expects | Our Data | Notes |
|--------------|---------|-------|
| Cases in JSON | cases.json (10) + planning-cases.json (4) | 14 total, all JSON |
| Policy extracts matched by case type | policy-extracts.json (10) + planning-policies.json (5) | Each has `applicable_case_types[]` for matching |
| Workflow states with transitions | workflow-states.json (9) + planning-workflows.json (4) | Each has `states[]` with `allowed_transitions[]`, `required_actions[]`, `sla_hours/sla_days` |
| Thresholds for evidence/escalation | Built into policies + workflows | 28-day reminder, 56-day escalation (street); 14-day prosecution, 8-week investigation, 28-day compliance (planning) |

---

### 7. "WHAT WOULD YOU DO NEXT?" — Brief Alignment

The brief asks teams to consider "what would you do next." Our current answer covers Dynamics CRM, planning portal, Heritage at Risk register, and pilot. Add one more that directly echoes the brief:

**Add to the "What's next" section:**

"Fifth: generalise the case type configuration. Right now we have planning enforcement and street reporting. But the architecture — policy matching by case type, workflow engine, flag engine with configurable thresholds — works for ANY casework domain. Housing, licensing, environmental health, benefits. One tool, many case types. The config changes; the engine stays the same."

This echoes the brief's statement that "caseworking is one of the largest categories of work in the civil service" and shows you're thinking beyond the demo domain.

---

### 8. EVALUATION FOCUS AREAS — Final Checklist

Based on the brief's evaluation section, judges are looking for:

- [ ] **Quality of prototype:** Does it work end-to-end? Can the judge try it? → YES: 3 working views, 14 cases, click-through everywhere
- [ ] **Quality of approach:** Is the architecture sound? Could this scale? → YES: repository pattern, deterministic flag engine, LLM as enhancement layer
- [ ] **How AI tools were used (to build):** Claude Code / Copilot for scaffold, architecture, components → YES: AI-USAGE-LOG.md documents this
- [ ] **How AI tools were used (in the product):** Claude API for summaries, chat, generative UI, dashboard insight → YES: but emphasise it works WITHOUT Claude first
- [ ] **Displays a case clearly** → YES: generative UI with 15 components
- [ ] **Surfaces relevant policy matched by case type** → YES: policy-matcher.ts (@repo/core) + PolicyPanel.jsx
- [ ] **Shows workflow state and required next action** → YES: workflow-engine.ts (@repo/core) + WorkflowState.jsx + NudgeBanner.jsx
- [ ] **Flags evidence outstanding beyond policy threshold** → YES: flag-engine.ts (@repo/core) with 14 flag types, each referencing specific policy and days overdue
- [ ] **Works without a language model** → YES: all core features are deterministic with cached LLM fallbacks
- [ ] **Three user perspectives (caseworker, team leader, applicant)** → YES: officer view, dashboard, resident status
- [ ] **Milestone: Repo registered** → Pre-built repo, register at 08:30
- [ ] **Milestone: Working prototype** → Pre-built, refine by 11:00
- [ ] **Milestone: Complete user journey** → End-to-end by 12:15

---

### 9. LANGUAGE TO USE IN EVERY JUDGE INTERACTION

These phrases come directly from the brief. Use them:

- "Displays a case clearly" — when showing CaseView
- "Surfaces the relevant policy matched by case type" — when showing PolicyPanel
- "Shows where the case sits in its workflow and what action is required next" — when showing WorkflowState + NudgeBanner
- "Flags evidence outstanding beyond the policy threshold" — when showing flags
- "Works entirely without a language model" — when explaining architecture
- "Caseworker, team leader, applicant" — when naming the three views
- "Surfacing the right information at the right moment" — when explaining generative UI
- "The largest categories of work in the civil service" — when explaining why this matters

---

*This addendum ensures every word of the Challenge 3 brief is reflected in what we build and what we say. Print this page alongside the main playbook.*

Sources:
- [Westminster Planning Enforcement Guide](https://www.westminster.gov.uk/planning-building-control-and-environmental-regulations/planning-enforcement/planning-enforcement-guide)
- [Westminster Local Enforcement Plan](https://www.westminster.gov.uk/planning-building-control-and-environmental-regulations/planning-enforcement/planning-enforcement-guide/local-enforcement-plan)
- [GOV.UK Enforcement Guidance](https://www.gov.uk/guidance/ensuring-effective-enforcement)
- [Planning (Listed Buildings and Conservation Areas) Act 1990](https://www.legislation.gov.uk/ukpga/1990/8/part/VII/crossheading/enforcement-notices)
- [Westminster Conservation Areas](https://www.westminster.gov.uk/planning-building-control-and-environmental-regulations/design-and-heritage/conservation-areas)
