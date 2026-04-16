import cors from "cors";
import express from "express";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  caseChat,
  generateSummary,
  managerInsight,
} from "@repo/core/claude-service";
import { createRepositories } from "@repo/core/data-layer";
import { computeFlags } from "@repo/core/flag-engine";
import { getDefaultLayout } from "@repo/core/generative-ui";
import { computeNudges } from "@repo/core/nudge-engine";
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

function requireRole(...roles: AgentRole[]) {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (!roles.includes(getRole(req))) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
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

    const nudges = computeNudges(caseData, flags, workflow);
    const layout = getDefaultLayout(caseData, flags, workflow);

    const response: CaseDetailResponse = {
      case_data: caseData,
      matched_policies: matchedPolicies,
      workflow: workflow!,
      flags,
      nudges,
      layout,
      ai_summary: null,
    };

    res.json(response);
  } catch (err) {
    console.error("GET /api/cases/:caseId error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/cases/:caseId/summary — Claude summary with cached fallback
app.get("/api/cases/:caseId/summary", async (req, res) => {
  try {
    const caseData = await caseRepo.getCase(req.params.caseId);
    if (!caseData) {
      res.status(404).json({ error: "Case not found" });
      return;
    }

    const allPolicies = await policyRepo.getAllPolicies();
    const flags = computeFlags(caseData, allPolicies, DEMO_TODAY);
    const matchedPolicies = matchPolicies(caseData.case_type, allPolicies);

    const result = await generateSummary(
      caseData,
      flags,
      matchedPolicies,
      DATA_DIR
    );
    res.json(result);
  } catch (err) {
    console.error("GET /api/cases/:caseId/summary error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/cases/:caseId/chat — Claude chat with cached fallback
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

    const allPolicies = await policyRepo.getAllPolicies();
    const flags = computeFlags(caseData, allPolicies, DEMO_TODAY);

    const content = await caseChat(
      caseData,
      flags,
      role,
      message,
      [],
      DATA_DIR
    );
    res.json({ role: "assistant", content });
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

    const nudges = computeNudges(caseData, flags, workflow);
    const layout = getDefaultLayout(caseData, flags, workflow);

    res.json({
      case_data: caseData,
      matched_policies: matchedPolicies,
      workflow,
      flags,
      nudges,
      layout,
      ai_summary: null,
    });
  } catch (err) {
    console.error("GET /api/cases/:caseId/view error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/dashboard — aggregated stats split by domain (officer + area_manager only)
app.get("/api/dashboard", requireRole("officer", "area_manager"), async (req, res) => {
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

// GET /api/dashboard/insight — area manager insight (officer + area_manager only)
app.get("/api/dashboard/insight", requireRole("officer", "area_manager"), async (_req, res) => {
  try {
    const allCases = await caseRepo.listCases();
    const allPolicies = await policyRepo.getAllPolicies();

    const allFlags = allCases.map((c) => ({
      caseId: c.case_id,
      flags: computeFlags(c, allPolicies, DEMO_TODAY),
    }));

    const insight = await managerInsight(allFlags, DATA_DIR);
    res.json({ insight });
  } catch (err) {
    console.error("GET /api/dashboard/insight error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/resident/:reference — sanitised applicant status
// Accepts both reporter reference (REP-30101) and case ID (WCC-2026-10301)
app.get("/api/resident/:reference", async (req, res) => {
  try {
    const ref = req.params.reference;
    let caseData = await caseRepo.getCaseByReference(ref);
    // Also try looking up by case ID if reference lookup fails
    if (!caseData) {
      caseData = await caseRepo.getCase(ref);
    }
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

// POST /api/cases/:caseId/action — nudge action handler (stub for demo)
app.post("/api/cases/:caseId/action", async (req, res) => {
  try {
    const caseData = await caseRepo.getCase(req.params.caseId);
    if (!caseData) {
      res.status(404).json({ error: "Case not found" });
      return;
    }

    const action = req.body?.action as string | undefined;
    if (!action) {
      res.status(400).json({ error: "action field required" });
      return;
    }

    // Demo stub — log and confirm
    console.log(`ACTION: ${action} on ${caseData.case_id} by ${getRole(req)}`);
    res.json({
      success: true,
      message: `Action "${action.replace(/_/g, " ")}" queued for ${caseData.case_id}`,
      case_id: caseData.case_id,
      action,
    });
  } catch (err) {
    console.error("POST /api/cases/:caseId/action error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/resident/:reference/chat — resident chat (always uses resident agent)
// Accepts both reporter reference (REP-30101) and case ID (WCC-2026-10301)
app.post("/api/resident/:reference/chat", async (req, res) => {
  try {
    const ref = req.params.reference;
    let caseData = await caseRepo.getCaseByReference(ref);
    if (!caseData) {
      caseData = await caseRepo.getCase(ref);
    }
    if (!caseData) {
      res.status(404).json({
        error:
          "We could not find a report with that reference number. Please check and try again.",
      });
      return;
    }

    const message = req.body?.message as string | undefined;
    if (!message) {
      res.status(400).json({ error: "message field required" });
      return;
    }

    const allPolicies = await policyRepo.getAllPolicies();
    const flags = computeFlags(caseData, allPolicies, DEMO_TODAY);

    // Always use resident role — never leak enforcement details
    const content = await caseChat(
      caseData,
      flags,
      "resident",
      message,
      [],
      DATA_DIR
    );
    res.json({ role: "assistant", content });
  } catch (err) {
    console.error("POST /api/resident/:reference/chat error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Start ──────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`CaseView API running on http://localhost:${PORT}`);
  console.log(`Demo date: ${DEMO_TODAY.toISOString().split("T")[0]}`);
  console.log(`Data directory: ${DATA_DIR}`);
});
