// CaseView shared types — all domain models for planning enforcement + street reporting

// ─── Cases ───────────────────────────────────────────────────────────────────

export interface TimelineEvent {
  date: string;
  event: string;
  note: string;
}

export interface Reporter {
  name: string;
  reference: string;
  ward: string;
}

export interface Location {
  street: string;
  postcode: string;
  lat: number;
  lon: number;
}

export interface Case {
  case_id: string;
  case_type: CaseType;
  status: string;
  reporter: Reporter;
  location: Location;
  assigned_to: string;
  caseworker: string;
  contractor: string | null;
  priority: Priority;
  duplicate_count: number;
  created_date: string;
  last_updated: string;
  timeline: TimelineEvent[];
  case_notes: string;
  // Planning-specific (optional)
  planning_ref?: string;
  conservation_area?: string;
  listed_building?: boolean;
  listed_grade?: string;
}

export type Priority = "critical" | "high" | "standard" | "low";

// Planning case types
export type PlanningCaseType =
  | "unauthorised_construction"
  | "listed_building_breach"
  | "change_of_use"
  | "breach_of_conditions";

// Street reporting case types
export type StreetCaseType =
  | "fly_tipping"
  | "pothole"
  | "graffiti"
  | "street_lighting"
  | "noise_complaint"
  | "rough_sleeping"
  | "commercial_waste"
  | "abandoned_vehicle"
  | "overflowing_bin";

export type CaseType = PlanningCaseType | StreetCaseType;

export type CaseDomain = "planning" | "street";

export function getCaseDomain(caseType: string): CaseDomain {
  const planningTypes: string[] = [
    "unauthorised_construction",
    "listed_building_breach",
    "change_of_use",
    "breach_of_conditions",
  ];
  return planningTypes.includes(caseType) ? "planning" : "street";
}

// ─── Policies ────────────────────────────────────────────────────────────────

export interface Policy {
  policy_id: string;
  title: string;
  body: string;
  applicable_case_types: string[];
}

// ─── Workflows ───────────────────────────────────────────────────────────────

export interface WorkflowState {
  state: string;
  label: string;
  description: string;
  allowed_transitions: string[];
  required_actions: string[];
  sla_hours?: number;
  sla_days?: number;
}

export interface Workflow {
  case_type: string;
  states: WorkflowState[];
}

export interface ComputedWorkflowState {
  currentState: WorkflowState;
  label: string;
  requiredActions: string[];
  allowedTransitions: string[];
  daysInState: number;
  shouldBeIn: string | null; // null = correct state, string = recommended state
}

// ─── Flags ───────────────────────────────────────────────────────────────────

export type FlagSeverity = "critical" | "high" | "standard";

export type PlanningFlagType =
  | "prosecution_file_overdue"
  | "enforcement_notice_delay"
  | "compliance_deadline_imminent"
  | "non_compliance_detected"
  | "heritage_irreversible_damage"
  | "councillor_enquiry_overdue"
  | "cross_referral_missing"
  | "multiple_complaints_escalation";

export type StreetFlagType =
  | "injury_not_triaged"
  | "sla_breach"
  | "evidence_not_referred"
  | "duplicate_escalation"
  | "member_enquiry_overdue"
  | "recurrence";

export type FlagType = PlanningFlagType | StreetFlagType;

export interface Flag {
  severity: FlagSeverity;
  type: FlagType;
  message: string;
  policy_ref: string;
  days_overdue: number;
}

// ─── Nudges ──────────────────────────────────────────────────────────────────

export type NudgeUrgency = "immediate" | "high" | "normal";

export interface NudgeAction {
  label: string;
  endpoint: string;
  payload: Record<string, string>;
}

export interface Nudge {
  text: string;
  urgency: NudgeUrgency;
  actions: NudgeAction[];
}

// ─── Generative UI ───────────────────────────────────────────────────────────

export type ComponentEmphasis = "critical" | "normal" | "collapsed";

export type CaseViewComponentName =
  | "nudge_banner"
  | "flags_panel"
  | "ai_summary"
  | "ai_next_action"
  | "timeline"
  | "policy_panel"
  | "case_notes"
  | "location_map"
  | "duplicate_panel"
  | "contractor_info"
  | "workflow_state"
  | "evidence_tracker"
  | "escalation_history"
  | "resident_impact"
  | "planning_info";

export interface LayoutComponent {
  name: CaseViewComponentName;
  emphasis: ComponentEmphasis;
}

export interface CaseLayout {
  nudge_text: string | null;
  components: LayoutComponent[];
}

// ─── Claude Service ──────────────────────────────────────────────────────────

export type AgentRole = "officer" | "area_manager" | "resident";

export interface CaseSummary {
  summary: string;
  next_action: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ─── Data Layer ──────────────────────────────────────────────────────────────

export interface CaseFilters {
  domain?: CaseDomain | "all";
  priority?: Priority;
  status?: string;
  ward?: string;
  hasFlags?: boolean;
}

export interface CaseRepository {
  listCases(filters?: CaseFilters): Promise<Case[]>;
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

// ─── API Response Types ──────────────────────────────────────────────────────

export interface CaseListItem {
  case_id: string;
  case_type: string;
  status: string;
  priority: Priority;
  location: Location;
  domain: CaseDomain;
  caseworker: string;
  flag_count: number;
  max_severity: FlagSeverity | null;
  last_updated: string;
  reporter_ward: string;
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
  simplified_timeline: Array<{
    date: string;
    description: string;
  }>;
}
