# CaseView -- AI-Assisted Planning Enforcement & Street Reporting Intelligence

**GDS AI Engineering Lab Hackathon | Challenge 3: Supporting Casework Decisions (Open Brief)**

A casework support tool for Westminster City Council that **displays cases clearly**, **surfaces relevant policy matched by case type**, **shows where each case sits in its workflow and what action is required next**, and **flags evidence outstanding beyond policy thresholds** -- built entirely without a language model, with Claude enhancing the experience on top.

## Quick Start

```bash
pnpm install
pnpm dev          # Backend :3001 + Frontend :3000
```

Open http://localhost:3000. Backend API at http://localhost:3001/api/cases.

## The Domain

**Planning Enforcement** (demo focus): 4 cases covering unauthorised construction in conservation areas, criminal offences against Grade II listed buildings (Section 9, Planning (Listed Buildings and Conservation Areas) Act 1990), change of use breaches, and breach of planning conditions.

**Street Reporting** (breadth): 10 cases across fly-tipping, potholes, graffiti, lighting, noise, rough sleeping, commercial waste, abandoned vehicles, overflowing bins.

## Architecture

```
CaseView/
+-- apps/
|   +-- web/         <- Vite + React frontend (port 3000)
|   +-- backend/     <- Express.js API (port 3001)
+-- packages/
|   +-- core/        <- @repo/core: ALL business logic (TypeScript)
|   +-- ui/          <- @repo/ui: React component library
+-- data/            <- 14 cases, 15 policies, 13 workflows (JSON)
```

**Deterministic foundation, intelligent enhancement.** The flag engine, policy matcher, workflow engine, nudge engine, and generative UI layout all work without any LLM. Claude adds summaries, chat, and dashboard insights -- with cached fallbacks for demo reliability.

## Features

- **Flag Engine** (14 flag types): Detects prosecution timeline breaches, SLA violations, compliance deadline risks, evidence not referred, heritage damage -- each referencing the specific policy and counting days overdue
- **Policy Matcher**: Automatically surfaces relevant policy matched by case type
- **Workflow Engine**: Shows current state, required actions, allowed transitions, days in state, and detects state mismatches
- **Nudge Engine** (13 nudge types): Transforms flags into one-click action prompts sorted by urgency
- **Generative UI**: Same 15 React components composed differently per case -- critical cases get nudge banners and red emphasis, routine cases get calm minimal layouts
- **3 Claude Agents**: Officer (cites legislation), Resident (plain English, never leaks enforcement), Area Manager (cross-domain insight)
- **Role-Based Access**: Caseworker sees enforcement details; applicant sees "We are investigating" -- same data, different views

## Three User Perspectives

| Role | View | What They See |
|------|------|--------------|
| **Caseworker** | Case list + case view | Flags, policies, workflow, nudges, chat with officer agent |
| **Team Leader** | Dashboard | Planning vs street split, AI insight, prosecution timeline risks |
| **Applicant** | Status lookup | Plain English status, "what happens next", no enforcement details |

## Data

14 synthetic cases (4 planning + 10 street), 15 policies (5 planning + 10 street), 13 workflows (4 planning + 9 street). All JSON. Demo date: 2026-04-15.

## How We Used AI

**To build:** Claude Code generated the flag engine, policy matcher, React components, Express routes, and test suite. We described Westminster planning enforcement domain knowledge; the tool proposed architecture and implementation.

**In the product:** Claude API provides 3 role-specific agents (officer cites Section 9 legislation, resident gets plain English, area manager gets cross-domain insight), case summaries, and chat. All with deterministic fallbacks -- the tool works offline.

## What Would We Do Next

1. **Dynamics 365 integration** -- swap JSON data layer for live CRM via the repository pattern
2. **Planning portal API** -- pull live application data from Westminster's planning portal
3. **Heritage at Risk register** -- flag when enforcement cases affect Historic England at-risk buildings
4. **Pilot with Westminster** -- measure time from complaint to enforcement action (target: days, not weeks)
5. **Generalise case types** -- the architecture works for any casework domain: housing, licensing, environmental health, benefits

## Commands

```bash
pnpm dev                         # Run everything
pnpm check-types                 # Type-check all packages
pnpm lint                        # Lint (zero-warning policy)
pnpm --filter @repo/core test    # Run 33 flag engine tests
```
