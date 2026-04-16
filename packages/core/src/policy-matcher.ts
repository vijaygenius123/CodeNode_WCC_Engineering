import type { Policy } from "./types.js";

/**
 * Return all policies whose applicable_case_types include the given case type.
 */
export function matchPolicies(
  caseType: string,
  allPolicies: Policy[]
): Policy[] {
  return allPolicies.filter((p) => p.applicable_case_types.includes(caseType));
}
