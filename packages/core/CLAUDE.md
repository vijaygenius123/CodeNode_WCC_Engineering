# @repo/core — CaseView Business Logic

All deterministic business logic for CaseView lives here. **No framework dependencies.** Pure TypeScript functions testable in isolation.

Read the root `CLAUDE.md` for full project context, data schemas, and domain knowledge.

## Module Overview

| Module | Purpose | LLM Required? |
|--------|---------|---------------|
| `types.ts` | Shared TypeScript interfaces (Case, Policy, Workflow, Flag, Nudge, CaseLayout) | No |
| `data-layer.ts` | Repository pattern. Loads JSON data. Abstract interface for future Dynamics 365. | No |
| `policy-matcher.ts` | Match policies to case types by `applicable_case_types` | No |
| `workflow-engine.ts` | Compute current state, required actions, state mismatches | No |
| `flag-engine.ts` | **THE CORE.** Detect SLA breaches, overdue actions, threshold violations | No |
| `nudge-engine.ts` | Transform flags into actionable prompts with one-click buttons | No |
| `resident-service.ts` | Sanitise case data for public-facing applicant view | No |
| `generative-ui.ts` | Compose UI layout (component selection + ordering + emphasis) | Optional (has fallback) |
| `claude-service.ts` | Claude API integration (3 agents: officer, resident, area manager) | Yes (has cached fallback) |

## Critical Design Rules

1. **Every function that uses dates must accept `today: Date` as a parameter.** Never call `new Date()` inside business logic. This enables testing with the hackathon date (2026-04-15).

2. **Flag engine is deterministic.** No randomness, no LLM calls. Given the same case + policies + workflows + date, it always returns the same flags.

3. **All modules export pure functions.** No side effects, no global state, no file I/O at module level. Data loading happens in `data-layer.ts` and is passed in.

4. **Claude service must have cached fallbacks.** Every function that calls Claude API must accept a `cachedResponses` parameter and use it when the API is unavailable or slow (>3 sec timeout).

5. **Resident service must sanitise.** Never include: prosecution plans, enforcement notice details, legal strategy, officer names, specific timelines for enforcement action.

## Flag Engine Detail

```typescript
// flag-engine.ts
export interface Flag {
  severity: "critical" | "high" | "standard";
  type: string;
  message: string;
  policy_ref: string;
  days_overdue: number;
}

export function computeFlags(
  caseData: Case,
  policies: Policy[],
  workflows: Workflow[],
  today: Date
): Flag[]
```

### Planning Flag Logic

**`prosecution_file_overdue`** (severity: critical)
- Applies to: `listed_building_breach` cases
- Trigger: Timeline contains `site_visit_completed` with note mentioning "criminal offence" or "Section 9", AND no `prosecution_file_submitted` event within 14 working days
- For WCC-10302: offence confirmed 2 April, today is 15 April = 13 days (about to breach 14-day deadline)
- Policy: POL-PE-002

**`enforcement_notice_delay`** (severity: high)
- Applies to: `unauthorised_construction`, `change_of_use`
- Trigger: Case in `investigation` state for > 56 days (8 weeks) without `enforcement_notice_issued` event
- Also flag as "approaching" if > 42 days (6 weeks)
- For WCC-10301: in investigation since 14 March = 32 days. Approaching threshold.
- Policy: POL-PE-001

**`compliance_deadline_imminent`** (severity: critical)
- Trigger: `enforcement_notice_issued` event exists, compliance period in policy, deadline within 3 days of today
- For WCC-10303: EN issued 20 March, 28-day compliance = deadline 17 April, today is 15 April = 2 days
- Policy: POL-PE-003

**`non_compliance_detected`** (severity: critical)
- Trigger: `monitoring_visit` event with note indicating continued breach after enforcement notice
- For WCC-10303: monitoring visit 10 April confirmed lounge still operating
- Policy: POL-PE-003

**`heritage_irreversible_damage`** (severity: critical)
- Trigger: `listed_building: true` AND timeline notes mention "irreversible", "destroyed", "removed", "stripped"
- For WCC-10302: Victorian shopfront removal, ornamental plasterwork stripped
- Policy: POL-PE-002

**`councillor_enquiry_overdue`** (severity: high)
- Trigger: `councillor_enquiry` event in timeline AND no response event within 5 working days
- For WCC-10301: councillor enquiry 12 April, today 15 April = 3 days (not yet overdue, approaching)
- Policy: POL-PE-005

**`cross_referral_missing`** (severity: high)
- Trigger: `change_of_use` case with timeline notes mentioning smoking/noise/health AND no `environmental_health_referral` event OR referral more than 3 working days after issue identified
- For WCC-10303: Indoor smoking confirmed 18 Feb, EH referral 25 March = 25 working days late
- Policy: POL-PE-003

**`multiple_complaints_escalation`** (severity: high)
- Trigger: `duplicate_count >= 3`
- For WCC-10303: 7 complaints. WCC-10301: 4 complaints.
- Policy: POL-PE-005

### Street Reporting Flag Logic

**`injury_not_triaged`** (severity: critical): Case has injury in timeline but not reclassified to Category 1 within 4 hours.

**`sla_breach`** (severity: high): Case past SLA hours/days for current workflow state.

**`evidence_not_referred`** (severity: high): Evidence of crime/antisocial behaviour but no enforcement referral.

**`duplicate_escalation`** (severity: standard): 5+ duplicate reports.

**`member_enquiry_overdue`** (severity: high): MP/councillor enquiry not responded within SLA.

**`recurrence`** (severity: standard): Same issue at same location within 90 days.

## Workflow Engine Detail

```typescript
export function computeWorkflowState(
  caseData: Case,
  workflowDef: Workflow,
  today: Date
): {
  currentState: WorkflowState;
  label: string;
  requiredActions: string[];
  allowedTransitions: string[];
  daysInState: number;
  shouldBeIn: string | null;  // null if state is correct, state name if mismatch
}
```

`shouldBeIn` detects when a case has been stuck too long. Uses `sla_days` from the workflow state definition. If `daysInState > sla_days`, compute the next logical state.

## Data Layer Detail

```typescript
export interface CaseRepository {
  listCases(filters?: { domain?: "planning" | "street" | "all" }): Promise<Case[]>;
  getCase(caseId: string): Promise<Case | null>;
  getCaseByReference(reference: string): Promise<Case | null>;
}

export interface PolicyRepository {
  getPoliciesForType(caseType: string): Promise<Policy[]>;
  getAllPolicies(): Promise<Policy[]>;
}

export interface WorkflowRepository {
  getWorkflow(caseType: string): Promise<Workflow | null>;
  getAllWorkflows(): Promise<Workflow[]>;
}

// JSON implementation loads from data/ directory
export function createRepositories(dataDir: string): {
  cases: CaseRepository;
  policies: PolicyRepository;
  workflows: WorkflowRepository;
}
```

The JSON implementation loads **both** street and planning data files and merges them into single lists. Planning cases are identified by `case_type` being one of: `unauthorised_construction`, `listed_building_breach`, `change_of_use`, `breach_of_conditions`.

## Nudge Engine Detail

```typescript
export interface Nudge {
  text: string;
  urgency: "immediate" | "high" | "normal";
  actions: Array<{
    label: string;
    endpoint: string;
    payload: Record<string, string>;
  }>;
}

export function computeNudges(
  caseData: Case,
  flags: Flag[],
  workflow: WorkflowState
): Nudge[]
```

Returns nudges sorted by urgency. Each nudge has action buttons the UI renders as GOV.UK green buttons.

## Generative UI Detail

```typescript
export interface CaseLayout {
  nudge_text: string | null;
  components: Array<{
    name: string;
    emphasis: "critical" | "normal" | "collapsed";
  }>;
}

// With Claude
export async function generateCaseLayout(
  caseData: Case,
  role: string,
  flags: Flag[],
  policies: Policy[],
  workflow: WorkflowState
): Promise<CaseLayout>

// Deterministic fallback
export function getDefaultLayout(
  caseData: Case,
  flags: Flag[]
): CaseLayout
```

The fallback function uses simple rules: if any flag has `severity: "critical"`, put `nudge_banner` first with `emphasis: "critical"`. If `listed_building: true`, include `planning_info` early. If no critical flags, lead with `ai_summary` in normal emphasis.

## Testing

```bash
# From repo root
pnpm exec turbo test --filter=@repo/core

# Or directly
cd packages/core && npx vitest run
```

Test with `today = new Date("2026-04-15")` to match the hackathon scenario.
