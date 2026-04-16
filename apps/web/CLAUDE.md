# CaseView Web App — Frontend Context

This is the main CaseView Next.js application. Read the root `CLAUDE.md` for full project context.

## App Structure

```
app/
├── layout.tsx              ← Root layout: GOV.UK header + role switcher + domain tabs
├── page.tsx                ← Case list (landing page for officer/area_manager)
├── case/[caseId]/page.tsx  ← Officer case view with generative UI
├── dashboard/page.tsx      ← Team leader dashboard
├── resident/page.tsx       ← Applicant status lookup
├── compare/page.tsx        ← Side-by-side case comparison
├── globals.css             ← GOV.UK-inspired styles + CaseView tokens
└── api/                    ← API routes (Next.js Route Handlers)
    ├── cases/route.ts
    ├── cases/[caseId]/route.ts
    ├── cases/[caseId]/summary/route.ts
    ├── cases/[caseId]/chat/route.ts
    ├── cases/[caseId]/view/route.ts
    ├── dashboard/route.ts
    ├── dashboard/insight/route.ts
    └── resident/[reference]/route.ts
```

## Pages

### `/` — Case List
- Fetches `GET /api/cases?domain={selected}`
- Table: Case ID, Type, Status badge, Priority, Location, Flags (count + severity colour), Domain tag
- Planning cases: purple left border. Street cases: blue.
- Sort by severity (critical first), then date.
- Click row → navigate to `/case/{caseId}`
- Domain filter tabs: All | Planning | Street

### `/case/[caseId]` — Officer Case View (THE KEY PAGE)
- Fetches `GET /api/cases/{caseId}/view`
- Renders components in AI-determined order from `layout.components[]`
- Each component mapped from a `COMPONENT_REGISTRY` object
- Emphasis styling: `critical` (red left border, expanded), `normal`, `collapsed` (details/summary toggle)
- If `layout.nudge_text`: render NudgeBanner at top
- Fixed header: case ID + type + status badge + conservation area tag + listed building tag

### `/dashboard` — Team Leader Dashboard
- Summary cards row: Total Cases, Planning Critical, Street Critical, Warnings, Resolved
- Split view: Planning Enforcement section (purple accent) + Street Reporting section (blue accent)
- "Cases Requiring Attention" list sorted by severity
- AI Insight panel from `/api/dashboard/insight`
- Click-through to any case

### `/resident` — Applicant Status
- Reference input + submit button
- Fetches `GET /api/resident/{reference}`
- Plain English status, "what happens next", simplified timeline
- Optional collapsible chat: "Ask about your report"
- **NEVER shows enforcement details, prosecution plans, or officer names**

### `/compare` — Compare View
- Two dropdowns selecting from all 14 cases
- Default: WCC-2026-10302 (critical) vs WCC-2026-10304 (routine)
- Two panels side by side, each rendering mini CaseView (nudge + flags + summary + workflow)
- "vs" divider. Labels: "Critical Case" / "Routine Case"
- This is the "wow moment" for generative UI demo

## Case View Components (15 total, in `@repo/ui`)

| Component | Purpose | Import |
|-----------|---------|--------|
| `NudgeBanner` | Red alert bar with nudge text + action buttons. `role="alert"` | `@repo/ui/nudge-banner` |
| `FlagsPanel` | Flags with severity icon, message, policy ref link | `@repo/ui/flags-panel` |
| `AISummary` | Blue card with AI summary + recommended action | `@repo/ui/ai-summary` |
| `Timeline` | Vertical timeline with dots/line. Warning events red. "Today" marker. | `@repo/ui/timeline` |
| `PolicyPanel` | Collapsible policy cards. Flagged policies expanded. | `@repo/ui/policy-panel` |
| `CaseNotes` | Expandable text panel | `@repo/ui/case-notes` |
| `WorkflowState` | Horizontal state bar. Current=blue, "should be"=red dashed, past=green. | `@repo/ui/workflow-state` |
| `DuplicatePanel` | Linked reports count | `@repo/ui/duplicate-panel` |
| `ContractorInfo` | Contractor name + SLA status | `@repo/ui/contractor-info` |
| `LocationMap` | Street, postcode, ward, conservation area, listed status badges | `@repo/ui/location-map` |
| `EvidenceTracker` | Enforcement milestones done vs pending. Overdue items red. | `@repo/ui/evidence-tracker` |
| `NudgeActions` | Nudge action buttons with urgency styling | `@repo/ui/nudge-actions` |
| `EscalationHistory` | Previous escalations from timeline | `@repo/ui/escalation-history` |
| `ResidentImpact` | Community impact for high duplicate count | `@repo/ui/resident-impact` |
| `PlanningInfo` | Planning ref, conservation area, listed grade, legislation | `@repo/ui/planning-info` |

## Layout Root: Header + Role Switcher

In `layout.tsx`:
- Black GOV.UK header bar with "CaseView" logo text left
- Role switcher pills right: **Caseworker** | **Team Leader** | **Applicant** (display these names, map internally to officer/area_manager/resident)
- Active role: white bg, black text
- Domain tabs below header: All | Planning | Street
- Role stored in React context, sent as `X-CaseView-Role` header in all API calls
- Role change redirects: officer→`/`, area_manager→`/dashboard`, resident→`/resident`

## Custom Hook

```typescript
// hooks/use-api.ts
function useApi<T>(endpoint: string, options?: RequestInit): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}
// Reads role from context, adds X-CaseView-Role header
// Base URL: process.env.NEXT_PUBLIC_APP_URL || ''
```

## API Routes

All API routes import business logic from `@repo/core`. They are thin wrappers that:
1. Parse request params
2. Read `X-CaseView-Role` header for access control
3. Call core functions
4. Return JSON response

```typescript
// Example: app/api/cases/[caseId]/route.ts
import { getCaseWithContext } from "@repo/core/data-layer";
import { computeFlags } from "@repo/core/flag-engine";
import { matchPolicies } from "@repo/core/policy-matcher";
import { computeWorkflowState } from "@repo/core/workflow-engine";
```

## Styling Notes

- All custom styles in `globals.css` using CSS custom properties
- Component-specific styles in CSS Modules (`.module.css`)
- Planning domain: `var(--govuk-purple)` accent
- Street domain: `var(--govuk-blue)` accent
- Nudge banner: `var(--govuk-red)` background
- Listed building header: heritage-gold `#B8860B`
- All interactive elements: visible focus outline, keyboard reachable
- Responsive: stack below 768px
