import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  Case,
  CaseFilters,
  CaseRepository,
  Policy,
  PolicyRepository,
  Workflow,
  WorkflowRepository,
  WorkflowState,
} from "./types.js";
import { getCaseDomain } from "./types.js";

// ─── JSON Implementations ───────────────────────────────────────────────────

async function loadJson<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

export class JsonCaseRepository implements CaseRepository {
  private cases: Case[] | null = null;

  constructor(private dataDir: string) {}

  private async load(): Promise<Case[]> {
    if (this.cases) return this.cases;

    const [streetCases, planningCases] = await Promise.all([
      loadJson<Case[]>(join(this.dataDir, "cases.json")),
      loadJson<Case[]>(join(this.dataDir, "planning-cases.json")),
    ]);
    this.cases = [...streetCases, ...planningCases];
    return this.cases;
  }

  async listCases(filters?: CaseFilters): Promise<Case[]> {
    let cases = await this.load();

    if (!filters) return cases;

    if (filters.domain && filters.domain !== "all") {
      cases = cases.filter(
        (c) => getCaseDomain(c.case_type) === filters.domain
      );
    }
    if (filters.priority) {
      cases = cases.filter((c) => c.priority === filters.priority);
    }
    if (filters.status) {
      cases = cases.filter((c) => c.status === filters.status);
    }
    if (filters.ward) {
      cases = cases.filter((c) => c.reporter.ward === filters.ward);
    }

    return cases;
  }

  async getCase(caseId: string): Promise<Case | null> {
    const cases = await this.load();
    return cases.find((c) => c.case_id === caseId) ?? null;
  }

  async getCaseByReference(reference: string): Promise<Case | null> {
    const cases = await this.load();
    return cases.find((c) => c.reporter.reference === reference) ?? null;
  }
}

export class JsonPolicyRepository implements PolicyRepository {
  private policies: Policy[] | null = null;

  constructor(private dataDir: string) {}

  private async load(): Promise<Policy[]> {
    if (this.policies) return this.policies;

    const [streetPolicies, planningPolicies] = await Promise.all([
      loadJson<Policy[]>(join(this.dataDir, "policy-extracts.json")),
      loadJson<Policy[]>(join(this.dataDir, "planning-policies.json")),
    ]);
    this.policies = [...streetPolicies, ...planningPolicies];
    return this.policies;
  }

  async getPoliciesForType(caseType: string): Promise<Policy[]> {
    const all = await this.load();
    return all.filter((p) => p.applicable_case_types.includes(caseType));
  }

  async getAllPolicies(): Promise<Policy[]> {
    return this.load();
  }
}

// Planning workflows JSON is keyed by case_type (object), street workflows
// are under case_types.<type> (nested object). Normalise both into Workflow[].

interface StreetWorkflowsFile {
  case_types: Record<string, { states: WorkflowState[] }>;
}

type PlanningWorkflowsFile = Record<
  string,
  { case_type: string; label: string; states: WorkflowState[] }
>;

export class JsonWorkflowRepository implements WorkflowRepository {
  private workflows: Workflow[] | null = null;

  constructor(private dataDir: string) {}

  private async load(): Promise<Workflow[]> {
    if (this.workflows) return this.workflows;

    const [streetRaw, planningRaw] = await Promise.all([
      loadJson<StreetWorkflowsFile>(
        join(this.dataDir, "workflow-states.json")
      ),
      loadJson<PlanningWorkflowsFile>(
        join(this.dataDir, "planning-workflows.json")
      ),
    ]);

    const streetWorkflows: Workflow[] = Object.entries(
      streetRaw.case_types
    ).map(([caseType, def]) => ({
      case_type: caseType,
      states: def.states,
    }));

    const planningWorkflows: Workflow[] = Object.entries(planningRaw).map(
      ([caseType, def]) => ({
        case_type: caseType,
        states: def.states,
      })
    );

    this.workflows = [...streetWorkflows, ...planningWorkflows];
    return this.workflows;
  }

  async getWorkflow(caseType: string): Promise<Workflow | null> {
    const all = await this.load();
    return all.find((w) => w.case_type === caseType) ?? null;
  }

  async getAllWorkflows(): Promise<Workflow[]> {
    return this.load();
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────

export function createRepositories(dataDir: string) {
  return {
    cases: new JsonCaseRepository(dataDir) as CaseRepository,
    policies: new JsonPolicyRepository(dataDir) as PolicyRepository,
    workflows: new JsonWorkflowRepository(dataDir) as WorkflowRepository,
  };
}
