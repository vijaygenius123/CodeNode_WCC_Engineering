import type {
  Case,
  CaseLayout,
  CaseViewComponentName,
  ComputedWorkflowState,
  Flag,
  LayoutComponent,
  Policy,
} from "./types.js";
import { getCaseDomain } from "./types.js";

// ─── Pre-computed Fallback Layouts ──────────────────────────────────────────

const DEMO_LAYOUTS: Record<string, CaseLayout> = {
  // WCC-10302: listed building criminal offence — STAR CASE
  "WCC-2026-10302": {
    nudge_text:
      "Prosecution file NOT submitted to legal — 13 days since criminal offence confirmed. Section 9, Planning (Listed Buildings and Conservation Areas) Act 1990.",
    components: [
      { name: "nudge_banner", emphasis: "critical" },
      { name: "flags_panel", emphasis: "critical" },
      { name: "planning_info", emphasis: "critical" },
      { name: "ai_summary", emphasis: "normal" },
      { name: "evidence_tracker", emphasis: "normal" },
      { name: "timeline", emphasis: "normal" },
      { name: "policy_panel", emphasis: "normal" },
      { name: "workflow_state", emphasis: "normal" },
      { name: "case_notes", emphasis: "collapsed" },
    ],
  },
  // WCC-10303: change of use — imminent compliance deadline
  "WCC-2026-10303": {
    nudge_text:
      "Enforcement notice compliance deadline IMMINENT. Non-compliance confirmed — prosecution proceedings should commence.",
    components: [
      { name: "nudge_banner", emphasis: "critical" },
      { name: "flags_panel", emphasis: "critical" },
      { name: "ai_summary", emphasis: "normal" },
      { name: "evidence_tracker", emphasis: "normal" },
      { name: "workflow_state", emphasis: "normal" },
      { name: "timeline", emphasis: "normal" },
      { name: "policy_panel", emphasis: "normal" },
      { name: "duplicate_panel", emphasis: "normal" },
      { name: "case_notes", emphasis: "collapsed" },
    ],
  },
  // WCC-10301: unauthorised construction — process delay
  "WCC-2026-10301": {
    nudge_text: null,
    components: [
      { name: "flags_panel", emphasis: "normal" },
      { name: "ai_summary", emphasis: "normal" },
      { name: "planning_info", emphasis: "normal" },
      { name: "workflow_state", emphasis: "normal" },
      { name: "evidence_tracker", emphasis: "normal" },
      { name: "timeline", emphasis: "normal" },
      { name: "policy_panel", emphasis: "collapsed" },
      { name: "case_notes", emphasis: "collapsed" },
    ],
  },
  // WCC-10304: routine conditions breach — CALM CASE
  "WCC-2026-10304": {
    nudge_text: null,
    components: [
      { name: "ai_summary", emphasis: "normal" },
      { name: "workflow_state", emphasis: "normal" },
      { name: "evidence_tracker", emphasis: "normal" },
      { name: "timeline", emphasis: "normal" },
      { name: "policy_panel", emphasis: "collapsed" },
      { name: "case_notes", emphasis: "collapsed" },
    ],
  },
  // WCC-10087: pothole with injury — critical street case
  "WCC-2026-10087": {
    nudge_text:
      "Injury reported but NOT triaged as Category 1 — 48 hours elapsed. Critical process failure.",
    components: [
      { name: "nudge_banner", emphasis: "critical" },
      { name: "flags_panel", emphasis: "critical" },
      { name: "ai_summary", emphasis: "normal" },
      { name: "location_map", emphasis: "normal" },
      { name: "timeline", emphasis: "normal" },
      { name: "contractor_info", emphasis: "normal" },
      { name: "workflow_state", emphasis: "normal" },
      { name: "case_notes", emphasis: "collapsed" },
    ],
  },
};

// ─── Deterministic Layout Engine ────────────────────────────────────────────

function comp(
  name: CaseViewComponentName,
  emphasis: LayoutComponent["emphasis"]
): LayoutComponent {
  return { name, emphasis };
}

export function getDefaultLayout(
  caseData: Case,
  flags: Flag[],
  _workflow: ComputedWorkflowState | null
): CaseLayout {
  // Check for pre-computed demo layout first
  const demoLayout = DEMO_LAYOUTS[caseData.case_id];
  if (demoLayout) return demoLayout;

  // Dynamic deterministic layout
  const hasCritical = flags.some((f) => f.severity === "critical");
  const hasHigh = flags.some((f) => f.severity === "high");
  const isPlanning = getCaseDomain(caseData.case_type) === "planning";
  const isListedBuilding = caseData.listed_building === true;
  const hasConservationArea = !!caseData.conservation_area;
  const hasDuplicates = caseData.duplicate_count >= 3;
  const hasContractor = !!caseData.contractor;

  const components: LayoutComponent[] = [];
  let nudgeText: string | null = null;

  // Critical cases: nudge banner first
  if (hasCritical) {
    const topFlag = flags[0]!;
    nudgeText = topFlag.message;
    components.push(comp("nudge_banner", "critical"));
    components.push(comp("flags_panel", "critical"));
  } else if (hasHigh) {
    components.push(comp("flags_panel", "normal"));
  }

  // Planning-specific: planning_info early if relevant
  if (isPlanning && (isListedBuilding || hasConservationArea)) {
    components.push(
      comp("planning_info", hasCritical ? "critical" : "normal")
    );
  }

  // AI summary always included
  components.push(comp("ai_summary", "normal"));

  // Evidence tracker for planning cases (enforcement actions done vs pending)
  if (isPlanning) {
    components.push(comp("evidence_tracker", hasCritical ? "normal" : "normal"));
  }

  // Workflow state
  components.push(comp("workflow_state", "normal"));

  // Timeline
  components.push(comp("timeline", "normal"));

  // Location map for street cases
  if (!isPlanning) {
    components.push(comp("location_map", hasCritical ? "normal" : "collapsed"));
  }

  // Contractor info if applicable
  if (hasContractor) {
    components.push(comp("contractor_info", "collapsed"));
  }

  // Duplicate panel if high count
  if (hasDuplicates) {
    components.push(comp("duplicate_panel", "normal"));
  }

  // Resident impact for high duplicate count
  if (caseData.duplicate_count >= 5) {
    components.push(comp("resident_impact", "normal"));
  }

  // Policy panel — collapsed unless critical
  components.push(comp("policy_panel", hasCritical ? "normal" : "collapsed"));

  // Case notes always last and collapsed
  components.push(comp("case_notes", "collapsed"));

  return { nudge_text: nudgeText, components };
}

// ─── Claude-powered Layout (with deterministic fallback) ────────────────────

export async function generateCaseLayout(
  caseData: Case,
  _role: string,
  flags: Flag[],
  _policies: Policy[],
  workflow: ComputedWorkflowState | null
): Promise<CaseLayout> {
  // For now, use deterministic fallback.
  // When Claude API integration is added, this will call Claude with the
  // system prompt: "You are a UI composition engine. Given this case, decide
  // which of the 15 components to show and in what order. Most important
  // information FIRST." and return structured JSON.
  return getDefaultLayout(caseData, flags, workflow);
}
