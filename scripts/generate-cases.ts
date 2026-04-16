/**
 * Generate additional cases for CaseView demo.
 * Adds caseworker field to existing cases and creates 30 new ones.
 * Run: pnpm exec tsx scripts/generate-cases.ts
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");

// ─── Caseworkers ────────────────────────────────────────────────────────────

const CASEWORKERS = {
  planning: ["Sarah Chen", "Marcus Williams"],
  street: ["Priya Patel", "James O'Brien"],
  cross: ["David Kim"],
};

// ─── Westminster data ───────────────────────────────────────────────────────

const WARDS = [
  "St James's", "Bayswater", "Marylebone", "West End", "Hyde Park",
  "Church Street", "Pimlico South", "Maida Vale", "Westbourne",
  "Knightsbridge", "Regent's Park", "Queen's Park", "Little Venice",
  "Lancaster Gate", "Vincent Square",
];

const STREETS: Record<string, { street: string; postcode: string; lat: number; lon: number }[]> = {
  planning: [
    { street: "Baker Street", postcode: "W1U 6TJ", lat: 51.5208, lon: -0.1567 },
    { street: "Harley Street", postcode: "W1G 9PF", lat: 51.5218, lon: -0.1492 },
    { street: "Great Portland Street", postcode: "W1W 7LT", lat: 51.5235, lon: -0.1439 },
    { street: "Wigmore Street", postcode: "W1U 1AT", lat: 51.5174, lon: -0.1512 },
    { street: "Weymouth Street", postcode: "W1G 7DT", lat: 51.5225, lon: -0.1467 },
    { street: "Chiltern Street", postcode: "W1U 5QJ", lat: 51.5216, lon: -0.1530 },
    { street: "George Street", postcode: "W1H 5BJ", lat: 51.5177, lon: -0.1591 },
    { street: "Seymour Place", postcode: "W1H 2NS", lat: 51.5182, lon: -0.1625 },
    { street: "Blandford Street", postcode: "W1U 3DG", lat: 51.5197, lon: -0.1533 },
    { street: "Manchester Square", postcode: "W1U 3PY", lat: 51.5181, lon: -0.1530 },
    { street: "Lisson Grove", postcode: "NW1 6TS", lat: 51.5249, lon: -0.1693 },
    { street: "St John's Wood High Street", postcode: "NW8 7SH", lat: 51.5313, lon: -0.1720 },
  ],
  street: [
    { street: "Victoria Street", postcode: "SW1E 5ND", lat: 51.4975, lon: -0.1411 },
    { street: "Buckingham Palace Road", postcode: "SW1W 0QP", lat: 51.4949, lon: -0.1468 },
    { street: "Warwick Way", postcode: "SW1V 1QT", lat: 51.4912, lon: -0.1420 },
    { street: "Churton Street", postcode: "SW1V 2LP", lat: 51.4913, lon: -0.1385 },
    { street: "Tachbrook Street", postcode: "SW1V 2NA", lat: 51.4900, lon: -0.1372 },
    { street: "Vauxhall Bridge Road", postcode: "SW1V 2SA", lat: 51.4918, lon: -0.1367 },
    { street: "Horseferry Road", postcode: "SW1P 2AF", lat: 51.4949, lon: -0.1310 },
    { street: "Great Smith Street", postcode: "SW1P 3BU", lat: 51.4989, lon: -0.1286 },
    { street: "Rochester Row", postcode: "SW1P 1JU", lat: 51.4960, lon: -0.1342 },
    { street: "Regency Street", postcode: "SW1P 4BH", lat: 51.4937, lon: -0.1332 },
    { street: "Strutton Ground", postcode: "SW1P 2HR", lat: 51.4972, lon: -0.1327 },
    { street: "Marsham Street", postcode: "SW1P 4DF", lat: 51.4942, lon: -0.1303 },
    { street: "Abbey Orchard Street", postcode: "SW1P 2JJ", lat: 51.4969, lon: -0.1294 },
    { street: "Caxton Street", postcode: "SW1H 0PZ", lat: 51.4985, lon: -0.1338 },
    { street: "Palmer Street", postcode: "SW1H 0PH", lat: 51.4988, lon: -0.1345 },
    { street: "Petty France", postcode: "SW1H 9EA", lat: 51.4998, lon: -0.1342 },
    { street: "Broadway", postcode: "SW1H 0BG", lat: 51.4993, lon: -0.1343 },
    { street: "Old Pye Street", postcode: "SW1P 2DG", lat: 51.4965, lon: -0.1318 },
  ],
};

const CONSERVATION_AREAS = [
  "Bayswater", "Mayfair", "Marylebone", "Pimlico", "St James's",
  "Belgravia", "Knightsbridge", "Soho", "Fitzrovia", null, null, null,
];

const REPORTERS = [
  "Anonymous Reporter", "Local Resident", "Neighbourhood Watch",
  "Street Patrol Officer", "Community Group", "Business Owner",
  "Property Manager", "WCC Officer", "Councillor Office",
];

// ─── Case generators ────────────────────────────────────────────────────────

interface CaseData {
  case_id: string;
  case_type: string;
  status: string;
  reporter: { name: string; reference: string; ward: string };
  location: { street: string; postcode: string; lat: number; lon: number };
  assigned_to: string;
  caseworker: string;
  contractor: string | null;
  priority: string;
  duplicate_count: number;
  created_date: string;
  last_updated: string;
  timeline: { date: string; event: string; note: string }[];
  case_notes: string;
  planning_ref?: string | null;
  conservation_area?: string | null;
  listed_building?: boolean;
  listed_grade?: string | null;
}

let caseCounter = 10400;
let refCounter = 40000;

function nextCaseId() { return `WCC-2026-${++caseCounter}`; }
function nextRef() { return `REP-${++refCounter}`; }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]!; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function daysAgo(n: number): string {
  const d = new Date("2026-04-15");
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0]!;
}

// Street case types
const STREET_TYPES = [
  { type: "fly_tipping", team: "veolia_waste", contractor: "Veolia", statuses: ["report_received", "assigned", "cleared", "awaiting_evidence", "closed"] },
  { type: "pothole", team: "fm_conway_highways", contractor: "FM Conway", statuses: ["report_received", "inspection_scheduled", "repair_scheduled", "closed"] },
  { type: "graffiti", team: "veolia_cleansing", contractor: "Veolia", statuses: ["report_received", "assigned", "cleared", "closed"] },
  { type: "street_lighting", team: "citelum_lighting", contractor: "Citelum", statuses: ["report_received", "assigned", "under_review", "closed"] },
  { type: "noise_complaint", team: "wcc_environmental_health", contractor: "WCC (in-house)", statuses: ["report_received", "investigation", "notice_served", "closed"] },
  { type: "commercial_waste", team: "wcc_waste_enforcement", contractor: "WCC (in-house)", statuses: ["report_received", "evidence_gathering", "notice_served", "closed"] },
  { type: "abandoned_vehicle", team: "nsl_parking", contractor: "NSL", statuses: ["report_received", "inspection_scheduled", "notice_affixed", "closed"] },
  { type: "overflowing_bin", team: "veolia_waste", contractor: "Veolia", statuses: ["report_received", "assigned", "cleared", "closed"] },
];

const PLANNING_TYPES = [
  { type: "unauthorised_construction", team: "planning_enforcement_team", statuses: ["complaint_received", "site_visit_scheduled", "investigation", "pcn_issued", "enforcement_notice_issued", "resolved"] },
  { type: "change_of_use", team: "planning_enforcement_team", statuses: ["complaint_received", "site_visit_scheduled", "investigation", "enforcement_notice_issued", "compliance_monitoring", "resolved"] },
  { type: "breach_of_conditions", team: "planning_enforcement_team", statuses: ["complaint_received", "site_visit_scheduled", "investigation", "bcn_issued", "compliance_monitoring", "resolved"] },
  { type: "listed_building_breach", team: "heritage_enforcement_team", statuses: ["complaint_received", "urgent_investigation", "temporary_stop_notice", "listed_building_enforcement_notice", "resolved"] },
];

function generateStreetCase(caseworker: string): CaseData {
  const def = pick(STREET_TYPES)!;
  const loc = pick(STREETS.street)!;
  const daysOld = randInt(2, 45);
  const status = pick(def.statuses)!;
  const priority = pick(["critical", "high", "standard", "standard", "low"])!;

  const timeline: { date: string; event: string; note: string }[] = [
    { date: daysAgo(daysOld), event: "report_received", note: `${def.type.replace(/_/g, " ")} reported at ${loc.street}.` },
  ];

  if (daysOld > 3) {
    timeline.push({ date: daysAgo(daysOld - 2), event: "auto_assigned", note: `Routed to ${def.contractor ?? def.team}.` });
  }
  if (daysOld > 10 && status !== "report_received") {
    timeline.push({ date: daysAgo(daysOld - 7), event: "site_visit", note: "Officer attended and assessed. Photographs taken." });
  }
  if (status === "closed" || status === "cleared") {
    timeline.push({ date: daysAgo(randInt(0, 3)), event: status, note: "Issue resolved. Reporter notified." });
  }

  return {
    case_id: nextCaseId(),
    case_type: def.type,
    status,
    reporter: { name: pick(REPORTERS)!, reference: nextRef(), ward: pick(WARDS)! },
    location: loc,
    assigned_to: def.team,
    caseworker,
    contractor: def.contractor,
    priority,
    duplicate_count: randInt(0, 4),
    created_date: daysAgo(daysOld),
    last_updated: daysAgo(randInt(0, Math.min(3, daysOld))),
    timeline,
    case_notes: `Standard ${def.type.replace(/_/g, " ")} case at ${loc.street}, ${loc.postcode}. ${status === "closed" ? "Resolved within SLA." : "Processing in progress."}`,
  };
}

function generatePlanningCase(caseworker: string): CaseData {
  const def = pick(PLANNING_TYPES)!;
  const loc = pick(STREETS.planning)!;
  const daysOld = randInt(5, 60);
  const status = pick(def.statuses)!;
  const priority = pick(["critical", "high", "high", "standard"])!;
  const isListed = def.type === "listed_building_breach" || Math.random() < 0.15;
  const conservation = pick(CONSERVATION_AREAS);

  const timeline: { date: string; event: string; note: string }[] = [
    { date: daysAgo(daysOld), event: "complaint_received", note: `Report of ${def.type.replace(/_/g, " ")} at ${loc.street}.` },
  ];

  if (daysOld > 5) {
    timeline.push({ date: daysAgo(daysOld - 3), event: "site_visit_completed", note: "Inspector visited. Breach confirmed. Photographs taken." });
  }
  if (daysOld > 15 && status !== "complaint_received") {
    timeline.push({ date: daysAgo(daysOld - 10), event: "planning_contravention_notice_issued", note: "PCN issued to owner requiring information within 21 days." });
  }
  if (status === "resolved") {
    timeline.push({ date: daysAgo(randInt(0, 3)), event: "resolved", note: "Breach remedied. Case closed." });
  }

  const planningRef = Math.random() > 0.3 ? `${randInt(20, 25)}/${String(randInt(1000, 9999)).padStart(5, "0")}/FULL` : null;

  return {
    case_id: nextCaseId(),
    case_type: def.type,
    status,
    reporter: { name: pick(REPORTERS)!, reference: nextRef(), ward: pick(WARDS)! },
    location: loc,
    assigned_to: def.team,
    caseworker,
    contractor: null,
    priority,
    duplicate_count: randInt(0, 5),
    created_date: daysAgo(daysOld),
    last_updated: daysAgo(randInt(0, Math.min(5, daysOld))),
    timeline,
    case_notes: `${def.type.replace(/_/g, " ")} case at ${loc.street}. ${conservation ? `Within ${conservation} Conservation Area. ` : ""}${isListed ? "Listed building — heritage sensitivity. " : ""}${status === "resolved" ? "Resolved." : "Under investigation."}`,
    planning_ref: planningRef,
    conservation_area: conservation,
    listed_building: isListed,
    listed_grade: isListed ? pick(["Grade II", "Grade II", "Grade II*", "Grade I"]) : undefined,
  };
}

// ─── Main ───────────────────────────────────────────────────────────────────

// Load existing cases
const existingStreet = JSON.parse(readFileSync(join(DATA_DIR, "cases.json"), "utf-8")) as CaseData[];
const existingPlanning = JSON.parse(readFileSync(join(DATA_DIR, "planning-cases.json"), "utf-8")) as CaseData[];

// Assign caseworkers to existing cases
const streetWorkers = [...CASEWORKERS.street, ...CASEWORKERS.cross];
const planningWorkers = [...CASEWORKERS.planning, ...CASEWORKERS.cross];

existingStreet.forEach((c, i) => {
  c.caseworker = streetWorkers[i % streetWorkers.length]!;
});

existingPlanning.forEach((c, i) => {
  c.caseworker = planningWorkers[i % planningWorkers.length]!;
});

// Generate new street cases (20 more)
const newStreet: CaseData[] = [];
for (let i = 0; i < 20; i++) {
  const worker = i < 8 ? "Priya Patel" : i < 14 ? "James O'Brien" : "David Kim";
  newStreet.push(generateStreetCase(worker));
}

// Generate new planning cases (10 more)
const newPlanning: CaseData[] = [];
for (let i = 0; i < 10; i++) {
  const worker = i < 5 ? "Sarah Chen" : i < 8 ? "Marcus Williams" : "David Kim";
  newPlanning.push(generatePlanningCase(worker));
}

// Write files
const allStreet = [...existingStreet, ...newStreet];
const allPlanning = [...existingPlanning, ...newPlanning];

writeFileSync(join(DATA_DIR, "cases.json"), JSON.stringify(allStreet, null, 2));
writeFileSync(join(DATA_DIR, "planning-cases.json"), JSON.stringify(allPlanning, null, 2));

console.log(`Street cases: ${existingStreet.length} existing + ${newStreet.length} new = ${allStreet.length}`);
console.log(`Planning cases: ${existingPlanning.length} existing + ${newPlanning.length} new = ${allPlanning.length}`);
console.log(`Total: ${allStreet.length + allPlanning.length} cases`);
console.log(`\nCaseworker distribution:`);
const all = [...allStreet, ...allPlanning];
const dist = new Map<string, number>();
for (const c of all) {
  dist.set(c.caseworker, (dist.get(c.caseworker) ?? 0) + 1);
}
for (const [name, count] of [...dist.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${name}: ${count} cases`);
}
