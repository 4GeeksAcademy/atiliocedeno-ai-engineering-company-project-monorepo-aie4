# Progress

## Current milestone: AI-driven Engineering

The canonical source of business context for agents is [`CONTEXT.md`](../CONTEXT.md). [`CONTEXT.es.md`](../CONTEXT.es.md) is retained as the Spanish version/source and must remain synchronized.

## Current status

### Agent infrastructure

| Component | Status | Current situation |
|---|---|---|
| `memory-bank/` | ✅ Complete | Exists and contains `projectbrief.md`, `techContext.md`, `progress.md`, and `AUDIT.md`. |
| `AGENTS.md` | ✅ Verified | Root guide exists and documents session-start reading order, the pre-commit workflow, protected files, scope rules, Memory Bank responsibilities, and no automatic commits. |
| `.agents/rules/` | ✅ Complete | `frontend-boundaries.md` and `context-and-memory.md` exist with frontend boundaries and context/memory rules. |
| `.agents/skills/<skill>/SKILL.md` | ✅ Complete | `.agents/skills/delivery-check/SKILL.md` exists with the review, validation, and delivery procedure. |
| `agents/` | 🟡 Partial | The template structure and documentation exist, but no HealthCore agent has been implemented. |
| `skills/` | 🟡 Partial | `skills/_template/SKILL.md` and example skills (`code-review`, `data-analysis`, `research`) exist, but a milestone-specific skill has not been verified. |
| `mcps/` | 🟡 Partial | Base documentation exists, without a custom MCP server implemented. |

### Application

#### `/uis/website`

- ✅ **Verified**.
- The public website now exists under `/uis/website` with its own README, bilingual landing pages, bilingual care-request forms, stylesheet, and validation script.
- The `/` entry point is `uis/website/index.html` when the application is served as the website root.
- The implementation intentionally reuses the Milestone 1 content and visual identity from the root files without adding a backend API or patient-data persistence.
- Local verification with `python3 -m http.server 4173 --directory uis/website` returned HTTP 200 for `/`, `index.en.html`, and `aplication.html`; the root content check passed.

#### `/uis/backoffice`

- ✅ **Verified initial entry view**.
- The application now has a dedicated static HealthCore Digital operations overview at `/uis/backoffice/index.html`, with its own responsive layout, internal navigation, company metrics, operational priorities, and HIPAA/UK GDPR context.
- The view intentionally contains no backend, API, authentication, persistence, or patient data. Talent Pipeline Tracker remains a separate application under `/uis/talent-pipeline-tracker` and was not merged into or duplicated within this entry view.
- Local verification with `python3 -m http.server 4174 --directory uis/backoffice` returned HTTP 200 for `/`; HealthCore Digital and business-metric content checks passed.

#### `/services`

- ✅ **No implementation required in this milestone**.
- The folder contains only template documentation; any backend that is implemented must be located under `/services`.
- The previous application directly consumes the 4Geeks external practice API through `NEXT_PUBLIC_API_URL`.
- FastAPI, backups, observability, and monitoring are not marked as deliverables for this milestone unless the official brief explicitly requires them.

## `CONTEXT.md` status

- ✅ `CONTEXT.md` contains the actual HealthCore brief and substantially matches `CONTEXT.es.md`.
- ✅ Includes the main company data, departments, problems, needs, and HIPAA/UK GDPR constraints.
- 🟡 `CONTEXT.es.md` is retained as the Spanish version/source; both files must remain synchronized if the brief is updated.

## Branches and reusable code

- `feature/agent-memory-bank`: working branch for this documentation.
- `feature/talent-tracker`: merged into the current branch; the previous Talent Pipeline Tracker remains under `/uis/talent-pipeline-tracker`.
- `feature/domain-models`: identified remote branch; its relationship to the current milestone has not been verified.
- Milestone 1, the Talent Pipeline Tracker, and the Milestone 4 static applications are separate deliverables; the tracker is preserved without being treated as the backoffice entry view.

## Current gaps

- The specific `.agents/` infrastructure has been created; root `AGENTS.md` exists in the working tree and should be maintained as a curated project guide. No `uis/AGENTS.md` exists in the current tree, and no historical Git entry for that path was found.
- The static applications have no package-local development, typecheck, build, lint, or test scripts.
- The root `package.json` intentionally has no application scripts because the current website and backoffice are static applications without package-level build tooling.
- `packages/shared` contains only `Id` and `BaseEntity`; tracker types are still defined locally.
- The previous application depends on an external practice API rather than a HealthCore-owned service.
- No test suite or lint configuration has been verified for the target structure.

## Validations

| Validation | Status | Notes |
|---|---|---|
| `CONTEXT.md` against `CONTEXT.es.md` | ✅ Complete | Both contain the actual HealthCore brief; `CONTEXT.md` is the canonical source for agents and `CONTEXT.es.md` is the Spanish version/source. |
| Memory Bank | ✅ Complete | All four documents exist and were reorganized according to their responsibilities. |
| Root `AGENTS.md` | ✅ Verified | Exists in the working tree and satisfies the session-start, pre-commit, protected-file, scope, and no-automatic-commit requirements. |
| `.agents/rules/` | ✅ Complete | Frontend boundary and context/memory rules created. |
| `.agents/skills/<skill>/SKILL.md` | ✅ Complete | `delivery-check` skill created. |
| `/uis/website` | ✅ Verified | Static bilingual public website served successfully at `/`, with English and care-request routes also returning HTTP 200. |
| `/uis/backoffice` | ✅ Verified | Dedicated static internal entry view served successfully at `/`, with visible HealthCore Digital branding and business metrics. |
| `/uis/talent-pipeline-tracker` | ✅ Verified | Preserved previous milestone application; package-local typecheck and production build completed successfully after the merge. |
| `/services` | ✅ Compliant | Implementing a backend service is not required in this milestone; any existing backend must be located there. |
| TypeScript | ➖ Not configured | No root or package-local TypeScript check applies to the current static website and backoffice applications. |
| Build | ➖ Not configured | No root or package-local build command applies to the current static website and backoffice applications. |
| Lint | ❓ Not verified | No lint configuration applicable to the target areas was found. |
| Tests | ❓ Not verified | No milestone test suite was found. |
| External API | 🟡 Partial | The tracker references `https://playground.4geeks.com/tracker/api/v1`; real-time integration was not tested in this update. |

## Prioritized next steps

1. Decide separately whether future internal workflows should integrate with `/uis/backoffice`; do not duplicate the preserved Talent Pipeline Tracker application without an explicit architectural decision.
2. Add application-specific lint, test, or build tooling only if a future milestone requires it.
