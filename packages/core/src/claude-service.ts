import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "node:fs/promises";
import type { Case, CaseSummary, ChatMessage, Flag, Policy } from "./types.js";

// ─── Agent System Prompts ───────────────────────────────────────────────────

const OFFICER_SYSTEM = `You are a Westminster City Council enforcement advisor helping a planning enforcement officer or street reporting officer.

Rules:
- Cite specific policy IDs (POL-PE-001, POL-HW-001, etc.) when referencing timelines and requirements
- For planning cases: note conservation area status, listed building grade, and applicable legislation (Town & Country Planning Act 1990, Planning (Listed Buildings and Conservation Areas) Act 1990)
- For listed building cases: always note that unauthorised works are a CRIMINAL OFFENCE under Section 9
- Never make decisions — surface information and suggest next enforcement steps
- Flag prosecution timeline risks explicitly
- Flag councillor enquiry deadlines
- Keep summaries to 3 sentences. Keep next actions to 1-2 specific steps.
- Use plain professional English`;

const RESIDENT_SYSTEM = `You are a Westminster City Council public information assistant helping a resident who reported a planning concern or street issue.

Rules:
- Use plain English only. No legal terminology, no enforcement jargon.
- NEVER reveal: enforcement strategy, prosecution plans, legal advice, officer names, specific enforcement notice details, stop notices, contravention notices, penalty amounts
- Do not speculate on outcomes or timelines for enforcement action
- Be warm and acknowledge frustration if implied
- For planning cases, you can say: "We are looking into the matter you reported" — never "We are preparing prosecution"
- If asked about legal proceedings: "We can't share details of any enforcement action, but we are actively working on this matter"
- Only discuss the specific report linked to their reference number`;

const MANAGER_SYSTEM = `You are a Westminster City Council operations advisor helping a team leader reviewing enforcement caseload.

Rules:
- Highlight prosecution timeline risks — any overdue prosecution files
- Flag imminent compliance deadlines
- Note heritage cases with irreversible damage as highest priority
- Cross-reference planning and street cases for the same location/ward
- Quantify: cases breaching SLA, average investigation duration
- Recommend concrete next actions with specific case IDs
- Keep to 3 bullet points maximum`;

// ─── Cached Responses ───────────────────────────────────────────────────────

interface CachedResponses {
  summaries: Record<string, CaseSummary>;
  chat_responses: Record<string, Record<string, string>>;
  manager_insight: string[];
}

let cachedData: CachedResponses | null = null;

async function loadCachedResponses(
  dataDir: string
): Promise<CachedResponses | null> {
  if (cachedData) return cachedData;
  try {
    const raw = await readFile(
      `${dataDir}/cached-responses.json`,
      "utf-8"
    );
    cachedData = JSON.parse(raw) as CachedResponses;
    return cachedData;
  } catch {
    return null;
  }
}

// ─── Claude Client ──────────────────────────────────────────────────────────

function createClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

const MODEL = "claude-sonnet-4-20250514";
const TIMEOUT_MS = 15000;

// ─── Public API ─────────────────────────────────────────────────────────────

export async function generateSummary(
  caseData: Case,
  flags: Flag[],
  policies: Policy[],
  dataDir: string
): Promise<CaseSummary> {
  // Try cached first for demo reliability
  const cached = await loadCachedResponses(dataDir);
  const cachedSummary = cached?.summaries[caseData.case_id];

  const client = createClient();
  if (!client) {
    return cachedSummary ?? buildDeterministicSummary(caseData, flags);
  }

  try {
    const flagList = flags
      .map((f) => `[${f.severity}] ${f.type}: ${f.message}`)
      .join("\n");
    const policyList = policies
      .map((p) => `${p.policy_id}: ${p.title}`)
      .join("\n");

    const userMessage = `Summarise this case for the enforcement officer.

Case: ${caseData.case_id} (${caseData.case_type})
Status: ${caseData.status}
Location: ${caseData.location.street}, ${caseData.location.postcode}
${caseData.conservation_area ? `Conservation Area: ${caseData.conservation_area}` : ""}
${caseData.listed_building ? `Listed Building: ${caseData.listed_grade}` : ""}

Active flags:
${flagList || "None"}

Applicable policies:
${policyList}

Case notes: ${caseData.case_notes}

Respond with JSON: {"summary": "3 sentence summary", "next_action": "1-2 specific next steps"}`;

    const response = await Promise.race([
      client.messages.create({
        model: MODEL,
        max_tokens: 500,
        system: OFFICER_SYSTEM,
        messages: [{ role: "user", content: userMessage }],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS)
      ),
    ]);

    const text =
      response.content[0]?.type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text) as CaseSummary;
    return parsed;
  } catch (err) {
    console.error("Claude summary error:", err instanceof Error ? err.message : err);
    return cachedSummary ?? buildDeterministicSummary(caseData, flags);
  }
}

export async function caseChat(
  caseData: Case,
  flags: Flag[],
  role: string,
  userMessage: string,
  _history: ChatMessage[],
  dataDir: string
): Promise<string> {
  // Check cached responses for exact match
  const cached = await loadCachedResponses(dataDir);
  const cachedChat = cached?.chat_responses[caseData.case_id];

  const systemPrompt = role === "resident" ? RESIDENT_SYSTEM : OFFICER_SYSTEM;

  const client = createClient();
  if (!client) {
    return (
      cachedChat?.[userMessage] ??
      buildDeterministicChat(caseData, flags, role)
    );
  }

  try {
    const context = `Case: ${caseData.case_id} (${caseData.case_type})
Status: ${caseData.status}
${caseData.listed_building ? `LISTED BUILDING: ${caseData.listed_grade}. Unauthorised works are a CRIMINAL OFFENCE under Section 9.` : ""}
${caseData.conservation_area ? `Conservation Area: ${caseData.conservation_area}` : ""}
Flags: ${flags.map((f) => `${f.type} (${f.severity})`).join(", ") || "none"}
Case notes: ${caseData.case_notes}`;

    const response = await Promise.race([
      client.messages.create({
        model: MODEL,
        max_tokens: 400,
        system: `${systemPrompt}\n\nCase context:\n${context}`,
        messages: [{ role: "user", content: userMessage }],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS)
      ),
    ]);

    return response.content[0]?.type === "text"
      ? response.content[0].text
      : buildDeterministicChat(caseData, flags, role);
  } catch (err) {
    console.error("Claude chat error:", err instanceof Error ? err.message : err);
    return (
      cachedChat?.[userMessage] ??
      buildDeterministicChat(caseData, flags, role)
    );
  }
}

export async function managerInsight(
  allFlags: { caseId: string; flags: Flag[] }[],
  dataDir: string
): Promise<string[]> {
  const cached = await loadCachedResponses(dataDir);
  if (cached?.manager_insight) return cached.manager_insight;

  const client = createClient();
  if (!client) return buildDeterministicInsight(allFlags);

  try {
    const flagSummary = allFlags
      .filter((c) => c.flags.length > 0)
      .map(
        (c) =>
          `${c.caseId}: ${c.flags.map((f) => `${f.type}(${f.severity})`).join(", ")}`
      )
      .join("\n");

    const response = await Promise.race([
      client.messages.create({
        model: MODEL,
        max_tokens: 300,
        system: MANAGER_SYSTEM,
        messages: [
          {
            role: "user",
            content: `Review this caseload and provide 3 bullet points of insight:\n${flagSummary}`,
          },
        ],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS)
      ),
    ]);

    const text =
      response.content[0]?.type === "text" ? response.content[0].text : "";
    return text
      .split("\n")
      .filter((l) => l.trim().startsWith("-") || l.trim().startsWith("*"))
      .map((l) => l.replace(/^[\s\-*]+/, "").trim())
      .slice(0, 3);
  } catch {
    return buildDeterministicInsight(allFlags);
  }
}

// ─── Policy RAG Q&A ─────────────────────────────────────────────────────────

const POLICY_SYSTEM = `You are a Westminster City Council policy advisor. You have access to the council's full policy library for planning enforcement and street reporting.

Rules:
- Answer questions by referencing specific policy IDs (POL-PE-001, POL-FT-001, etc.)
- Quote relevant sections of policy text when answering
- If a question spans multiple policies, reference all applicable ones
- Highlight SLA deadlines, required actions, and escalation thresholds
- If no policy covers the question, say so clearly
- Keep answers concise but comprehensive — cite the policy, state the rule, note the deadline`;

export async function queryPolicies(
  question: string,
  policies: Policy[]
): Promise<string> {
  const client = createClient();

  const policyCorpus = policies
    .map((p) => `--- ${p.policy_id}: ${p.title} ---\nApplies to: ${p.applicable_case_types.join(", ")}\n\n${p.body}`)
    .join("\n\n");

  if (!client) {
    // Deterministic fallback: find policies mentioning keywords from the question
    const questionLower = question.toLowerCase();
    const relevant = policies.filter(
      (p) =>
        p.title.toLowerCase().includes(questionLower) ||
        p.body.toLowerCase().includes(questionLower) ||
        p.applicable_case_types.some((t) => questionLower.includes(t.replace(/_/g, " ")))
    );
    if (relevant.length > 0) {
      return `Relevant policies:\n\n${relevant.map((p) => `**${p.policy_id}: ${p.title}**\n${p.body.substring(0, 300)}...`).join("\n\n")}`;
    }
    return "Unable to process your query at this time. Please review the policy documents directly.";
  }

  try {
    const response = await Promise.race([
      client.messages.create({
        model: MODEL,
        max_tokens: 800,
        system: `${POLICY_SYSTEM}\n\n--- POLICY LIBRARY ---\n\n${policyCorpus}`,
        messages: [{ role: "user", content: question }],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS)
      ),
    ]);

    return response.content[0]?.type === "text"
      ? response.content[0].text
      : "Unable to process your query.";
  } catch (err) {
    console.error("Claude policy query error:", err instanceof Error ? err.message : err);
    // Fallback: return matching policies
    const questionLower = question.toLowerCase();
    const relevant = policies.filter(
      (p) =>
        p.body.toLowerCase().includes(questionLower) ||
        p.title.toLowerCase().includes(questionLower)
    );
    if (relevant.length > 0) {
      return `Relevant policies:\n\n${relevant.map((p) => `**${p.policy_id}: ${p.title}**\n${p.body.substring(0, 300)}...`).join("\n\n")}`;
    }
    return "Unable to process your query at this time. Please review the policy documents directly.";
  }
}

// ─── Deterministic Fallbacks ────────────────────────────────────────────────

function buildDeterministicSummary(
  caseData: Case,
  flags: Flag[]
): CaseSummary {
  const critical = flags.filter((f) => f.severity === "critical");
  if (critical.length > 0) {
    const top = critical[0]!;
    return {
      summary: `URGENT: ${caseData.case_id} has ${critical.length} critical flag(s). ${top.message}`,
      next_action: `Immediate action required: address ${top.type.replace(/_/g, " ")} (${top.policy_ref}).`,
    };
  }
  const high = flags.filter((f) => f.severity === "high");
  if (high.length > 0) {
    const top = high[0]!;
    return {
      summary: `${caseData.case_id} has ${high.length} high-priority flag(s). ${top.message}`,
      next_action: `Priority action: address ${top.type.replace(/_/g, " ")} (${top.policy_ref}).`,
    };
  }
  return {
    summary: `${caseData.case_id} (${caseData.case_type.replace(/_/g, " ")}) is in ${caseData.status.replace(/_/g, " ")} status. No critical issues.`,
    next_action: "Continue standard process as per workflow.",
  };
}

function buildDeterministicChat(
  caseData: Case,
  flags: Flag[],
  role: string
): string {
  if (role === "resident") {
    return "Thank you for your question. We can't share details of any enforcement action, but we are actively working on this matter. If you need further assistance, please contact our customer service team.";
  }
  const flagSummary =
    flags.length > 0
      ? `This case has ${flags.length} active flag(s): ${flags.map((f) => f.type.replace(/_/g, " ")).join(", ")}.`
      : "No active flags on this case.";
  return `${flagSummary} Current status: ${caseData.status.replace(/_/g, " ")}. Please refer to the relevant policies for guidance on next steps.`;
}

function buildDeterministicInsight(
  allFlags: { caseId: string; flags: Flag[] }[]
): string[] {
  let criticalCount = 0;
  for (const c of allFlags) {
    if (c.flags.some((f) => f.severity === "critical")) criticalCount++;
  }
  return [
    `${criticalCount} case(s) require immediate attention across both domains.`,
    `Planning enforcement: prosecution timeline risk on WCC-2026-10302. Compliance deadline imminent on WCC-2026-10303.`,
    `Street reporting: injury triage failure on WCC-2026-10087 is highest risk — liability exposure if not actioned.`,
  ];
}
