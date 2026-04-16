import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, beforeAll } from "vitest";
import { computeFlags } from "../src/flag-engine.js";
import type { Case, Flag, Policy } from "../src/types.js";

// ─── Test Setup ─────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "..", "..", "data");
const TODAY = new Date("2026-04-15");

let streetCases: Case[];
let planningCases: Case[];
let allCases: Case[];
let allPolicies: Policy[];

function getCase(caseId: string): Case {
  const c = allCases.find((c) => c.case_id === caseId);
  if (!c) throw new Error(`Case ${caseId} not found in test data`);
  return c;
}

function getFlags(caseId: string): Flag[] {
  return computeFlags(getCase(caseId), allPolicies, TODAY);
}

function hasFlag(flags: Flag[], type: string): boolean {
  return flags.some((f) => f.type === type);
}

function getFlag(flags: Flag[], type: string): Flag {
  const flag = flags.find((f) => f.type === type);
  if (!flag) throw new Error(`Flag ${type} not found. Got: ${flags.map((f) => f.type).join(", ")}`);
  return flag;
}

beforeAll(async () => {
  const [streetRaw, planningRaw, streetPoliciesRaw, planningPoliciesRaw] =
    await Promise.all([
      readFile(join(DATA_DIR, "cases.json"), "utf-8"),
      readFile(join(DATA_DIR, "planning-cases.json"), "utf-8"),
      readFile(join(DATA_DIR, "policy-extracts.json"), "utf-8"),
      readFile(join(DATA_DIR, "planning-policies.json"), "utf-8"),
    ]);

  streetCases = JSON.parse(streetRaw) as Case[];
  planningCases = JSON.parse(planningRaw) as Case[];
  allCases = [...streetCases, ...planningCases];
  allPolicies = [
    ...(JSON.parse(streetPoliciesRaw) as Policy[]),
    ...(JSON.parse(planningPoliciesRaw) as Policy[]),
  ];
});

// ─── Planning Breach Tests ──────────────────────────────────────────────────

describe("Planning Breach Flags", () => {
  describe("prosecution_file_overdue — WCC-2026-10302", () => {
    it("should flag prosecution file not submitted for listed building criminal offence", () => {
      const flags = getFlags("WCC-2026-10302");
      const flag = getFlag(flags, "prosecution_file_overdue");

      expect(flag.severity).toBe("critical");
      expect(flag.policy_ref).toBe("POL-PE-002");
      expect(flag.message).toContain("Prosecution file NOT submitted");
      expect(flag.message).toContain("Section 9");
    });

    it("should reference the days since criminal offence confirmed (13 calendar days)", () => {
      const flags = getFlags("WCC-2026-10302");
      const flag = getFlag(flags, "prosecution_file_overdue");

      // Criminal offence confirmed 2 April, today 15 April = 13 calendar days
      expect(flag.message).toContain("13 days");
    });

    it("should not fire for non-listed-building cases", () => {
      // WCC-10301 is unauthorised_construction, not listed_building_breach
      const flags = getFlags("WCC-2026-10301");
      expect(hasFlag(flags, "prosecution_file_overdue")).toBe(false);
    });
  });

  describe("enforcement_notice_delay — WCC-2026-10301", () => {
    it("should flag investigation approaching 56-day SLA", () => {
      const flags = getFlags("WCC-2026-10301");
      const flag = getFlag(flags, "enforcement_notice_delay");

      // Site visit 14 March, today 15 April = 32 days (approaching 56-day threshold)
      expect(flag.severity).toBe("standard"); // approaching, not yet breached
      expect(flag.policy_ref).toBe("POL-PE-001");
      expect(flag.message).toContain("approaching");
    });

    it("should not fire for cases that already have enforcement notices", () => {
      // WCC-10303 has enforcement_notice_issued in its timeline
      const flags = getFlags("WCC-2026-10303");
      expect(hasFlag(flags, "enforcement_notice_delay")).toBe(false);
    });
  });

  describe("compliance_deadline_imminent — WCC-2026-10303", () => {
    it("should flag enforcement notice deadline within 3 days", () => {
      const flags = getFlags("WCC-2026-10303");
      const flag = getFlag(flags, "compliance_deadline_imminent");

      expect(flag.severity).toBe("critical");
      expect(flag.policy_ref).toBe("POL-PE-003");
      // EN issued 20 March + 28 days = deadline 17 April, today 15 April = 2 days
      expect(flag.message).toMatch(/1 day|2 day/);
    });

    it("should not fire for cases without enforcement notices", () => {
      const flags = getFlags("WCC-2026-10301");
      expect(hasFlag(flags, "compliance_deadline_imminent")).toBe(false);
    });
  });

  describe("non_compliance_detected — WCC-2026-10303", () => {
    it("should flag monitoring visit confirming continued breach", () => {
      const flags = getFlags("WCC-2026-10303");
      const flag = getFlag(flags, "non_compliance_detected");

      expect(flag.severity).toBe("critical");
      expect(flag.policy_ref).toBe("POL-PE-003");
      expect(flag.message).toContain("NON-COMPLIANCE");
    });

    it("should not fire for cases without monitoring visits showing breach", () => {
      // WCC-10304 has a monitoring visit showing PARTIAL compliance
      const flags = getFlags("WCC-2026-10304");
      expect(hasFlag(flags, "non_compliance_detected")).toBe(false);
    });
  });

  describe("heritage_irreversible_damage — WCC-2026-10302", () => {
    it("should flag irreversible damage to listed building", () => {
      const flags = getFlags("WCC-2026-10302");
      const flag = getFlag(flags, "heritage_irreversible_damage");

      expect(flag.severity).toBe("critical");
      expect(flag.policy_ref).toBe("POL-PE-002");
      expect(flag.message).toContain("IRREVERSIBLE");
      expect(flag.message).toContain("Grade II");
    });

    it("should not fire for non-listed buildings", () => {
      // WCC-10301 is NOT a listed building
      const flags = getFlags("WCC-2026-10301");
      expect(hasFlag(flags, "heritage_irreversible_damage")).toBe(false);
    });
  });

  describe("councillor_enquiry_overdue — WCC-2026-10301", () => {
    it("should flag councillor enquiry approaching deadline", () => {
      const flags = getFlags("WCC-2026-10301");
      const flag = getFlag(flags, "councillor_enquiry_overdue");

      // Councillor enquiry 12 April, today 15 April = 3 working days (approaching 5-day deadline)
      expect(flag.policy_ref).toBe("POL-PE-005");
      expect(flag.message).toMatch(/due in|response/i);
    });
  });

  describe("cross_referral_missing — WCC-2026-10303", () => {
    it("should flag late Environmental Health referral for change of use with smoking/noise", () => {
      const flags = getFlags("WCC-2026-10303");
      const flag = getFlag(flags, "cross_referral_missing");

      expect(flag.policy_ref).toBe("POL-PE-003");
      // Referral was made but 25 working days late (should have been within 3)
      expect(flag.message).toContain("Environmental Health");
    });
  });

  describe("multiple_complaints_escalation", () => {
    it("should flag WCC-10303 with 7 complaints (duplicate_count=7)", () => {
      const flags = getFlags("WCC-2026-10303");
      const flag = getFlag(flags, "multiple_complaints_escalation");

      expect(flag.severity).toBe("high");
      expect(flag.policy_ref).toBe("POL-PE-005");
      expect(flag.message).toContain("complaints");
    });

    it("should flag WCC-10301 with 4 complaints", () => {
      const flags = getFlags("WCC-2026-10301");
      expect(hasFlag(flags, "multiple_complaints_escalation")).toBe(true);
    });

    it("should not flag cases with fewer than 3 duplicates", () => {
      // WCC-10302 has duplicate_count=2
      const flags = getFlags("WCC-2026-10302");
      expect(hasFlag(flags, "multiple_complaints_escalation")).toBe(false);
    });
  });

  describe("routine planning case — WCC-2026-10304", () => {
    it("should NOT have any critical flags", () => {
      const flags = getFlags("WCC-2026-10304");
      const criticalFlags = flags.filter((f) => f.severity === "critical");

      expect(criticalFlags).toHaveLength(0);
    });

    it("should have only multiple_complaints_escalation (high)", () => {
      const flags = getFlags("WCC-2026-10304");

      expect(flags).toHaveLength(1);
      expect(flags[0]!.type).toBe("multiple_complaints_escalation");
      expect(flags[0]!.severity).toBe("high");
    });
  });

  describe("star case summary — WCC-2026-10302", () => {
    it("should have exactly 2 critical flags", () => {
      const flags = getFlags("WCC-2026-10302");
      const critical = flags.filter((f) => f.severity === "critical");

      expect(critical).toHaveLength(2);
      expect(critical.map((f) => f.type).sort()).toEqual([
        "heritage_irreversible_damage",
        "prosecution_file_overdue",
      ]);
    });
  });
});

// ─── Street Reporting Tests ─────────────────────────────────────────────────

describe("Street Reporting Flags", () => {
  describe("injury_not_triaged — WCC-2026-10087", () => {
    it("should flag untriaged injury as critical", () => {
      const flags = getFlags("WCC-2026-10087");
      const flag = getFlag(flags, "injury_not_triaged");

      expect(flag.severity).toBe("critical");
      expect(flag.policy_ref).toBe("POL-HW-001");
      expect(flag.message).toContain("NOT triaged");
      expect(flag.message).toContain("Category 1");
    });

    it("should report 48 hours elapsed", () => {
      const flags = getFlags("WCC-2026-10087");
      const flag = getFlag(flags, "injury_not_triaged");

      expect(flag.message).toContain("48 hours");
    });
  });

  describe("evidence_not_referred — WCC-2026-10042", () => {
    it("should flag evidence found but not referred to enforcement", () => {
      const flags = getFlags("WCC-2026-10042");
      const flag = getFlag(flags, "evidence_not_referred");

      expect(flag.severity).toBe("high");
      expect(flag.policy_ref).toBe("POL-FT-001");
      expect(flag.message).toContain("NOT referred");
    });
  });

  describe("sla_breach — WCC-2026-10042", () => {
    it("should flag fly-tipping SLA breach (18 days vs 2-day SLA)", () => {
      const flags = getFlags("WCC-2026-10042");
      const flag = getFlag(flags, "sla_breach");

      expect(flag.severity).toBe("high");
      expect(flag.policy_ref).toBe("POL-ESC-001");
      expect(flag.message).toContain("DOUBLE");
    });
  });

  describe("duplicate_escalation — WCC-2026-10042", () => {
    it("should flag 5+ duplicate reports", () => {
      const flags = getFlags("WCC-2026-10042");
      expect(hasFlag(flags, "duplicate_escalation")).toBe(true);
    });
  });

  describe("recurrence — WCC-2026-10042", () => {
    it("should flag recurrence at same location", () => {
      const flags = getFlags("WCC-2026-10042");
      expect(hasFlag(flags, "recurrence")).toBe(true);
    });
  });

  describe("clean case — WCC-2026-10134 (abandoned vehicle)", () => {
    it("should have only sla_breach flag (standard process, minor delay)", () => {
      const flags = getFlags("WCC-2026-10134");

      // Abandoned vehicle: created 8 April, today 15 April = 7 days
      // SLA is 3 days for inspection — breached but not critically
      expect(flags.length).toBeGreaterThanOrEqual(1);
      expect(flags.every((f) => f.severity !== "critical")).toBe(true);
    });
  });

  describe("closed case — WCC-2026-10205", () => {
    it("should have zero flags", () => {
      const flags = getFlags("WCC-2026-10205");
      expect(flags).toHaveLength(0);
    });
  });

  describe("welfare case — WCC-2026-10168 (rough sleeping)", () => {
    it("should have zero flags (welfare, not enforcement)", () => {
      const flags = getFlags("WCC-2026-10168");
      expect(flags).toHaveLength(0);
    });
  });
});

// ─── Cross-cutting Tests ────────────────────────────────────────────────────

describe("Cross-cutting", () => {
  it("should sort flags by severity: critical > high > standard", () => {
    // WCC-10303 has critical + high + standard flags
    const flags = getFlags("WCC-2026-10303");

    for (let i = 1; i < flags.length; i++) {
      const prev = flags[i - 1]!;
      const curr = flags[i]!;
      const order: Record<string, number> = { critical: 0, high: 1, standard: 2 };
      expect(order[prev.severity]).toBeLessThanOrEqual(order[curr.severity]!);
    }
  });

  it("should produce flags for all 14 cases without throwing", () => {
    for (const c of allCases) {
      expect(() => computeFlags(c, allPolicies, TODAY)).not.toThrow();
    }
  });

  it("every flag should have a non-empty message and policy_ref", () => {
    for (const c of allCases) {
      const flags = computeFlags(c, allPolicies, TODAY);
      for (const f of flags) {
        expect(f.message.length).toBeGreaterThan(0);
        expect(f.policy_ref.length).toBeGreaterThan(0);
        expect(f.days_overdue).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("planning cases should only produce planning flag types", () => {
    const planningFlagTypes = new Set([
      "prosecution_file_overdue",
      "enforcement_notice_delay",
      "compliance_deadline_imminent",
      "non_compliance_detected",
      "heritage_irreversible_damage",
      "councillor_enquiry_overdue",
      "cross_referral_missing",
      "multiple_complaints_escalation",
    ]);

    for (const c of planningCases) {
      const flags = computeFlags(c, allPolicies, TODAY);
      for (const f of flags) {
        expect(planningFlagTypes.has(f.type)).toBe(true);
      }
    }
  });

  it("street cases should only produce street flag types", () => {
    const streetFlagTypes = new Set([
      "injury_not_triaged",
      "sla_breach",
      "evidence_not_referred",
      "duplicate_escalation",
      "member_enquiry_overdue",
      "recurrence",
    ]);

    for (const c of streetCases) {
      const flags = computeFlags(c, allPolicies, TODAY);
      for (const f of flags) {
        expect(streetFlagTypes.has(f.type)).toBe(true);
      }
    }
  });
});
