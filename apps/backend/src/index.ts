import cors from "cors";
import express from "express";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createRepositories } from "@repo/core/data-layer";
import { computeFlags } from "@repo/core/flag-engine";
import { matchPolicies } from "@repo/core/policy-matcher";
import { getResidentStatus } from "@repo/core/resident-service";
import type {
  AgentRole,
  Case,
  CaseDetailResponse,
  CaseListItem,
  DashboardResponse,
  Flag,
  FlagSeverity,
} from "@repo/core/types";
import { getCaseDomain } from "@repo/core/types";
import { computeWorkflowState } from "@repo/core/workflow-engine";

// ─── Setup ──────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "..", "..", "data");
const PORT = parseInt(process.env.PORT ?? "3001", 10);
const DEMO_TODAY = new Date("2026-04-15");

const { cases: caseRepo, policies: policyRepo, workflows: workflowRepo } =
  createRepositories(DATA_DIR);

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    credentials: true,
  })
);

// ─── Helpers ────────────────────────────────────────────────────────────────

function getRole(req: express.Request): AgentRole {
  const header = req.headers["x-caseview-role"];
  const role = typeof header === "string" ? header : "officer";
  if (role === "officer" || role === "area_manager" || role === "resident") {
    return role;
  }
  return "officer";
}

function maxSeverity(flags: Flag[]): FlagSeverity | null {
  if (flags.length === 0) return null;
  if (flags.some((f) => f.severity === "critical")) return "critical";
  if (flags.some((f) => f.severity === "high")) return "high";
  return "standard";
}

async function buildCaseListItem(c: Case): Promise<CaseListItem> {
  const policies = await policyRepo.getAllPolicies();
  const flags = computeFlags(c, policies, DEMO_TODAY);

  return {
    case_id: c.case_id,
    case_type: c.case_type,
    status: c.status,
    priority: c.priority,
    location: c.location,
    domain: getCaseDomain(c.case_type),
    flag_count: flags.length,
    max_severity: maxSeverity(flags),
    last_updated: c.last_updated,
    reporter_ward: c.reporter.ward,
  };
}

// ─── Routes ─────────────────────────────────────────────────────────────────

// GET /api/cases — list all cases with summary flags
app.get("/api/cases", async (req, res) => {
  try {
    const domain = (req.query.domain as string) ?? "all";
    const validDomains = ["planning", "street", "all"];
    const filterDomain = validDomains.includes(domain) ? domain : "all";

    const cases = await caseRepo.listCases({
      domain: filterDomain as "planning" | "street" | "all",
    });

    const items = await Promise.all(cases.map(buildCaseListItem));

    // Sort: critical first, then high, then by last_updated desc
    const severityOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      standard: 2,
    };
    items.sort((a, b) => {
      const sevA = a.max_severity ? (severityOrder[a.max_severity] ?? 3) : 3;
      const sevB = b.max_severity ? (severityOrder[b.max_severity] ?? 3) : 3;
      if (sevA !== sevB) return sevA - sevB;
      return (
        new Date(b.last_updated).getTime() -
        new Date(a.last_updated).getTime()
      );
    });

    res.json({ cases: items, total: items.length });
  } catch (err) {
    console.error("GET /api/cases error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/cases/:caseId — full case detail with policies, workflow, flags
app.get("/api/cases/:caseId", async (req, res) => {
  try {
    const caseData = await caseRepo.getCase(req.params.caseId);
    if (!caseData) {
      res.status(404).json({ error: "Case not found" });
      return;
    }

    const [allPolicies, workflowDef] = await Promise.all([
      policyRepo.getAllPolicies(),
      workflowRepo.getWorkflow(caseData.case_type),
    ]);

    const matchedPolicies = matchPolicies(caseData.case_type, allPolicies);
    const flags = computeFlags(caseData, allPolicies, DEMO_TODAY);

    const workflow = workflowDef
      ? computeWorkflowState(caseData, workflowDef, DEMO_TODAY)
      : null;

    const response: CaseDetailResponse = {
      case_data: caseData,
      matched_policies: matchedPolicies,
      workflow: workflow!,
      flags,
      nudges: [],
      layout: { nudge_text: null, components: [] },
      ai_summary: null,
    };

    res.json(response);
  } catch (err) {
    console.error("GET /api/cases/:caseId error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/cases/:caseId/summary — Claude summary (stub with cached fallback)
app.get("/api/cases/:caseId/summary", async (req, res) => {
  try {
    const caseData = await caseRepo.getCase(req.params.caseId);
    if (!caseData) {
      res.status(404).json({ error: "Case not found" });
      return;
    }

    const allPolicies = await policyRepo.getAllPolicies();
    const flags = computeFlags(caseData, allPolicies, DEMO_TODAY);

    // Deterministic summary based on flags (no LLM required)
    const criticalFlags = flags.filter((f) => f.severity === "critical");
    const highFlags = flags.filter((f) => f.severity === "high");

    let summary: string;
    let nextAction: string;

    if (criticalFlags.length > 0) {
      const topFlag = criticalFlags[0]!;
      summary = `URGENT: ${caseData.case_id} has ${criticalFlags.length} critical flag(s). ${topFlag.message}`;
      nextAction = `Immediate action required: address ${topFlag.type.replace(/_/g, " ")} (${topFlag.policy_ref}).`;
    } else if (highFlags.length > 0) {
      const topFlag = highFlags[0]!;
      summary = `${caseData.case_id} has ${highFlags.length} high-priority flag(s). ${topFlag.message}`;
      nextAction = `Priority action: address ${topFlag.type.replace(/_/g, " ")} (${topFlag.policy_ref}).`;
    } else {
      summary = `${caseData.case_id} (${caseData.case_type.replace(/_/g, " ")}) is currently in ${caseData.status.replace(/_/g, " ")} status. No critical issues detected.`;
      nextAction = "Continue standard process as per workflow.";
    }

    res.json({ summary, next_action: nextAction });
  } catch (err) {
    console.error("GET /api/cases/:caseId/summary error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/cases/:caseId/chat — Claude chat (stub)
app.post("/api/cases/:caseId/chat", async (req, res) => {
  try {
    const caseData = await caseRepo.getCase(req.params.caseId);
    if (!caseData) {
      res.status(404).json({ error: "Case not found" });
      return;
    }

    const role = getRole(req);
    const message = req.body?.message as string | undefined;
    if (!message) {
      res.status(400).json({ error: "message field required" });
      return;
    }

    // Deterministic fallback response (no LLM required)
    let response: string;
    if (role === "resident") {
      response =
        "Thank you for your question. We can't share details of any enforcement action, but we are actively working on this matter. If you need further assistance, please contact our customer service team.";
    } else {
      const allPolicies = await policyRepo.getAllPolicies();
      const flags = computeFlags(caseData, allPolicies, DEMO_TODAY);
      const flagSummary =
        flags.length > 0
          ? `This case has ${flags.length} active flag(s): ${flags.map((f) => f.type.replace(/_/g, " ")).join(", ")}.`
          : "No active flags on this case.";
      response = `${flagSummary} Current status: ${caseData.status.replace(/_/g, " ")}. Please refer to the relevant policies for guidance on next steps.`;
    }

    res.json({ role: "assistant", content: response });
  } catch (err) {
    console.error("POST /api/cases/:caseId/chat error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/cases/:caseId/view — case data + generative layout + nudges (stub)
app.get("/api/cases/:caseId/view", async (req, res) => {
  try {
    const caseData = await caseRepo.getCase(req.params.caseId);
    if (!caseData) {
      res.status(404).json({ error: "Case not found" });
      return;
    }

    const [allPolicies, workflowDef] = await Promise.all([
      policyRepo.getAllPolicies(),
      workflowRepo.getWorkflow(caseData.case_type),
    ]);

    const matchedPolicies = matchPolicies(caseData.case_type, allPolicies);
    const flags = computeFlags(caseData, allPolicies, DEMO_TODAY);
    const workflow = workflowDef
      ? computeWorkflowState(caseData, workflowDef, DEMO_TODAY)
      : null;

    // Deterministic generative UI layout based on flags
    const hasCritical = flags.some((f) => f.severity === "critical");
    const isPlanning = getCaseDomain(caseData.case_type) === "planning";

    type LayoutComponent = {
      name: string;
      emphasis: "critical" | "normal" | "collapsed";
    };

    let components: LayoutComponent[];
    let nudgeText: string | null = null;

    if (hasCritical) {
      const topFlag = flags[0]!;
      nudgeText = topFlag.message;
      components = [
        { name: "nudge_banner", emphasis: "critical" },
        { name: "flags_panel", emphasis: "critical" },
        ...(isPlanning
          ? [{ name: "planning_info" as const, emphasis: "critical" as const }]
          : []),
        { name: "ai_summary", emphasis: "normal" },
        { name: "evidence_tracker", emphasis: "normal" },
        { name: "timeline", emphasis: "normal" },
        { name: "workflow_state", emphasis: "normal" },
        { name: "policy_panel", emphasis: "normal" },
        { name: "case_notes", emphasis: "collapsed" },
      ];
    } else if (flags.length > 0) {
      components = [
        { name: "flags_panel", emphasis: "normal" },
        { name: "ai_summary", emphasis: "normal" },
        ...(isPlanning
          ? [{ name: "planning_info" as const, emphasis: "normal" as const }]
          : []),
        { name: "workflow_state", emphasis: "normal" },
        { name: "timeline", emphasis: "normal" },
        { name: "evidence_tracker", emphasis: "normal" },
        { name: "policy_panel", emphasis: "collapsed" },
        { name: "case_notes", emphasis: "collapsed" },
      ];
    } else {
      components = [
        { name: "ai_summary", emphasis: "normal" },
        { name: "workflow_state", emphasis: "normal" },
        ...(isPlanning
          ? [{ name: "planning_info" as const, emphasis: "normal" as const }]
          : []),
        { name: "timeline", emphasis: "normal" },
        { name: "evidence_tracker", emphasis: "collapsed" },
        { name: "policy_panel", emphasis: "collapsed" },
        { name: "case_notes", emphasis: "collapsed" },
      ];
    }

    res.json({
      case_data: caseData,
      matched_policies: matchedPolicies,
      workflow,
      flags,
      nudges: [],
      layout: { nudge_text: nudgeText, components },
      ai_summary: null,
    });
  } catch (err) {
    console.error("GET /api/cases/:caseId/view error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/dashboard — aggregated stats split by domain
app.get("/api/dashboard", async (req, res) => {
  try {
    const allCases = await caseRepo.listCases();

    const items = await Promise.all(allCases.map(buildCaseListItem));

    const planningCases = items.filter((c) => c.domain === "planning");
    const streetCases = items.filter((c) => c.domain === "street");
    const flaggedCases = items
      .filter((c) => c.flag_count > 0)
      .sort((a, b) => {
        const sev: Record<string, number> = {
          critical: 0,
          high: 1,
          standard: 2,
        };
        return (
          (a.max_severity ? (sev[a.max_severity] ?? 3) : 3) -
          (b.max_severity ? (sev[b.max_severity] ?? 3) : 3)
        );
      });

    const response: DashboardResponse = {
      total_cases: items.length,
      planning_critical: planningCases.filter(
        (c) => c.max_severity === "critical"
      ).length,
      street_critical: streetCases.filter(
        (c) => c.max_severity === "critical"
      ).length,
      warnings: items.filter(
        (c) => c.max_severity === "high" || c.max_severity === "standard"
      ).length,
      resolved: allCases.filter(
        (c) => c.status === "closed" || c.status === "resolved"
      ).length,
      planning_cases: planningCases,
      street_cases: streetCases,
      flagged_cases: flaggedCases,
    };

    res.json(response);
  } catch (err) {
    console.error("GET /api/dashboard error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/dashboard/insight — area manager insight (stub)
app.get("/api/dashboard/insight", async (_req, res) => {
  try {
    const allCases = await caseRepo.listCases();
    const allPolicies = await policyRepo.getAllPolicies();

    let criticalCount = 0;
    let planningFlags = 0;
    let streetFlags = 0;

    for (const c of allCases) {
      const flags = computeFlags(c, allPolicies, DEMO_TODAY);
      const hasCritical = flags.some((f) => f.severity === "critical");
      if (hasCritical) criticalCount++;
      if (getCaseDomain(c.case_type) === "planning") {
        planningFlags += flags.length;
      } else {
        streetFlags += flags.length;
      }
    }

    res.json({
      insight: [
        `${criticalCount} case(s) require immediate attention across both domains.`,
        `Planning enforcement has ${planningFlags} active flag(s) — prosecution timeline risk on WCC-2026-10302.`,
        `Street reporting has ${streetFlags} active flag(s) — injury triage failure on WCC-2026-10087 is highest risk.`,
      ],
    });
  } catch (err) {
    console.error("GET /api/dashboard/insight error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/resident/:reference — sanitised applicant status
app.get("/api/resident/:reference", async (req, res) => {
  try {
    const caseData = await caseRepo.getCaseByReference(req.params.reference);
    if (!caseData) {
      res.status(404).json({
        error:
          "We could not find a report with that reference number. Please check and try again.",
      });
      return;
    }

    const status = getResidentStatus(caseData);
    res.json(status);
  } catch (err) {
    console.error("GET /api/resident/:reference error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Start ──────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`CaseView API running on http://localhost:${PORT}`);
  console.log(`Demo date: ${DEMO_TODAY.toISOString().split("T")[0]}`);
  console.log(`Data directory: ${DATA_DIR}`);
});
