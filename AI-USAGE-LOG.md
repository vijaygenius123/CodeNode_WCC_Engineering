# AI Usage Log -- CaseView

## AI Tools Used to Build

**Claude Code (Claude Opus)** was used throughout development for:

- **Architecture design**: Proposed the monorepo structure (pnpm + Turborepo), @repo/core shared package pattern, Express.js backend, Vite + React frontend
- **Flag engine implementation**: Generated all 14 flag types (8 planning + 6 street) with correct policy references, SLA thresholds, and working day calculations from domain descriptions
- **Business logic**: Policy matcher, workflow engine with state mismatch detection, nudge engine (13 nudge types), generative UI layout engine with pre-computed demo layouts
- **Data layer**: Repository pattern with JSON implementations loading all 6 data files
- **Express API**: 11 endpoints with RBAC middleware, CORS, error handling
- **Claude service**: 3 agent system prompts (officer/resident/area manager) with cached fallbacks and 5-second timeout
- **React components**: 15 case view components, 5 pages, role context, API hooks, GOV.UK styling
- **Test suite**: 33 vitest tests covering all flag types, positive/negative cases, cross-cutting validation
- **Resident service**: Status sanitisation with timeline scrubbing, keyword filtering to prevent enforcement detail leaks
- **QA validation agent**: Custom Claude Code agent that runs 24+ automated checks across API, flags, security, and generative UI

## AI Used in the Product

**Claude API (claude-sonnet-4-20250514)** powers three features:

1. **Case summaries**: 3-sentence synthesis of timeline, flags, and policies. Falls back to deterministic summary from flag data.
2. **Case chat**: Officer agent cites specific policy IDs and legislation (Section 9, Listed Buildings Act). Resident agent uses plain English, never reveals enforcement strategy.
3. **Dashboard insight**: Area manager gets 3 bullet points highlighting prosecution timeline risks and cross-domain issues.

All Claude features have **cached fallback responses** in `data/cached-responses.json` for demo reliability. The tool works fully without Claude API access.

## Key Design Decision

The flag engine, policy matcher, workflow engine, nudge engine, and generative UI layout are **entirely deterministic**. No LLM is involved in detecting SLA breaches, matching policies, computing workflow state, or composing the UI layout. Claude enhances -- but is not required.
