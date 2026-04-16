// API response types for the CaseView frontend.
// Mirrors the shapes returned by apps/backend/src/index.ts.

export type Priority = "critical" | "high" | "standard" | "low";
export type FlagSeverity = "critical" | "high" | "standard";
export type CaseDomain = "planning" | "street";
export type AgentRole = "officer" | "area_manager" | "resident";
export type ComponentEmphasis = "critical" | "normal" | "collapsed";

export interface Location {
  street: string;
  postcode: string;
  lat: number;
  lon: number;
}

export interface TimelineEvent {
  date: string;
  event: string;
  note: string;
}

export interface Case {
  case_id: string;
  case_type: string;
  status: string;
  reporter: { name: string; reference: string; ward: string };
  location: Location;
  assigned_to: string;
  contractor: string | null;
  priority: Priority;
  duplicate_count: number;
  created_date: string;
  last_updated: string;
  timeline: TimelineEvent[];
  case_notes: string;
  planning_ref?: string;
  conservation_area?: string;
  listed_building?: boolean;
  listed_grade?: string;
}

export interface Policy {
  policy_id: string;
  title: string;
  body: string;
  applicable_case_types: string[];
}

export interface WorkflowState {
  state: string;
  label: string;
  description: string;
  allowed_transitions: string[];
  required_actions: string[];
  sla_hours?: number;
  sla_days?: number;
}

export interface ComputedWorkflowState {
  currentState: WorkflowState;
  label: string;
  requiredActions: string[];
  allowedTransitions: string[];
  daysInState: number;
  shouldBeIn: string | null;
}

export interface Flag {
  severity: FlagSeverity;
  type: string;
  message: string;
  policy_ref: string;
  days_overdue: number;
}

export interface NudgeAction {
  label: string;
  endpoint: string;
  payload: Record<string, string>;
}

export interface Nudge {
  text: string;
  urgency: "immediate" | "high" | "normal";
  actions: NudgeAction[];
}

export interface LayoutComponent {
  name: string;
  emphasis: ComponentEmphasis;
}

export interface CaseLayout {
  nudge_text: string | null;
  components: LayoutComponent[];
}

// ─── API Response shapes ──────────────────────────────────────────────────────

export interface CaseListItem {
  case_id: string;
  case_type: string;
  status: string;
  priority: Priority;
  location: Location;
  domain: CaseDomain;
  flag_count: number;
  max_severity: FlagSeverity | null;
  last_updated: string;
  reporter_ward: string;
}

export interface CaseSummary {
  summary: string;
  next_action: string;
}

export interface CaseDetailResponse {
  case_data: Case;
  matched_policies: Policy[];
  workflow: ComputedWorkflowState;
  flags: Flag[];
  nudges: Nudge[];
  layout: CaseLayout;
  ai_summary: CaseSummary | null;
}

export interface DashboardResponse {
  total_cases: number;
  planning_critical: number;
  street_critical: number;
  warnings: number;
  resolved: number;
  planning_cases: CaseListItem[];
  street_cases: CaseListItem[];
  flagged_cases: CaseListItem[];
}

export interface ResidentStatusResponse {
  reference: string;
  case_type_display: string;
  location_display: string;
  status_display: string;
  what_happens_next: string;
  last_updated: string;
  simplified_timeline: Array<{ date: string; description: string }>;
}
