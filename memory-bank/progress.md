# Progress

> **Current snapshot — 2026-11-05:** Frontend consolidation migrated public pages, protected Backoffice, and the domain utility panel to Next.js and removed static HTML copies. Backoffice tests (5/5), tracker typecheck, and production build pass. Tracker tests remain 11/15 because three auth tests cannot resolve `app/components/brand-logo.tsx` through the current test harness and the proxy-language test fails on a missing mock request. Runtime HTTP/protection checks and backend tests were not rerun; no commit or deployment was performed.

## Frontend consolidation in progress (2026-11-05)

- Canonical frontend is `uis/talent-pipeline-tracker/`. Native routes now cover the public bilingual pages, authenticated `/backoffice`, and `/domain-lab`; FastAPI remains responsible for incident processing/export.
- Retired root/website/public static landing pages, the unbundled `src/index_test.html`, the static Backoffice entry, and the standalone website server. Kept legacy Next redirects for historical HTML URLs.
- Removed the root `serve:historical` command and updated architecture, root/app/API READMEs and frontend boundary guidance.
- The legacy static Backoffice tests were replaced with five source-contract checks for the native route, same-origin API/token contract, safe aggregate handling, export semantics, and proxy protection. `uis/backoffice/incidents.js` and `style.css` remain unreferenced legacy files; retain pending an explicit cleanup decision because `incidents.js` was already dirty before this migration. Backoffice `npm test` passes 5/5.
- Tracker `npm test` currently passes 11/15. Three auth component tests cannot resolve `app/components/brand-logo.tsx` via the test harness's `../../components/brand-logo` path; the proxy language test fails because its mocked result has no `headers`. These failures are recorded, not claimed as migration regressions or fixed. `npm run typecheck` and `npm run build` pass; build generated 21 routes including `/backoffice`, `/domain-lab`, and the HealthCore proxy.
- Runtime HTTP/protection checks and backend tests were not rerun. Do not treat source-contract checks as a substitute for runtime authenticated/anonymous route verification.
- External or academic hosting consumers were not verifiable from local repository references. No change to FastAPI incident logic or dataset was made.

## Current repository and HealthCore status (2026-11-02)

- HealthCore public-site consolidation follow-up: the four existing Next routes (`/`, `/en`, `/care-request`, `/en/care-request`) are the current route implementation; retained static HTML in `uis/website/` and the root `npm run serve:website` are compatibility/comparison copies, not deleted. The four historical `.html` redirects remain. Navigation is aligned with the static landing reference; English document language is synchronized from the pathname after hydration. Browser visual/responsive equivalence is not claimed where no browser run is available.

- Branch: `feature/healthcore-incidents-analysis`; starting baseline was `3f750ea`. The working tree contains pre-existing normalization edits plus follow-up corrections; no commit, push, merge, rebase, or deployment was performed.
- Compatibility alias `incidents-healthcore.csv` has been restored as a relative symlink to the sole canonical dataset `scripts/incidents-healthcore.csv`. Both legacy and canonical analyzer CLI paths were rerun successfully with identical aggregate JSON. Dataset SHA-256 remains `b13555a640f986cd7e1435e3f96f517406e08595753058a4fb16df731d504740`; no rows were printed.
- Freshly rerun: backoffice 5/5 tests and `node --check incidents.js`; tracker 5/5 tests, `tsc --noEmit`, and Next production build (18 routes). Build still warns about multiple lockfiles/workspace root. The tracker test harness now uses Next's installed SWC transform; this avoids new dependencies but couples the test to a Next internal module.
- Backend pytest could not be rerun: the selected `.venv` interpreter has no `pytest` module. The 76-pass result below is the 2026-10-31 historical run, not current verification. No package was installed during this follow-up.
- Root Spanish/English landing CTAs target the matching forms under `uis/website`; those target files exist, and this is the intended route when serving the repository root as document root. Browser click/submission behavior and standalone-host behavior were not browser-tested. No browser automation/runtime was available.
- `src/index_test.html` points to `../dist/index_test.js`, but that output is absent and no panel build configuration was found. The panel remains not runnable from this checkout alone and its browser runtime is unverified.
- Documentation now explains that one API process allows only the configured `HEALTHCORE_FRONTEND_URL` origin; no CORS middleware behavior was changed. TinyDB is local and single-process; dataset provenance remains unconfirmed; retention/purge and production/regulatory review are outstanding. Do not use with real patient data.
- `git diff --check` passed. The protected `CONTEXT.md` and `AGENTS.md` were not edited. See `AUDIT.md` for the dated follow-up and historical distinctions.

### Prior validation evidence (historical — 2026-10-31)

Backend **76 passed** with two FastAPI deprecation warnings; backoffice **5 passed** and syntax check passed; Next typecheck and production build passed (18 routes, with multiple-lockfile warning). At that point tracker Node tests failed 5/5 at harness setup due to removed TypeScript 7 APIs; that harness was corrected and rerun successfully on 2026-11-02. Earlier public route checks are not evidence of current browser interactions.

The current API/service details and limitations are in [`techContext.md`](./techContext.md) and [`services/healthcore-api/README.md`](../services/healthcore-api/README.md).

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
- The backoffice has no hardcoded cross-navigation to the tracker; the two applications remain independently deployable.
- Local verification with `python3 -m http.server 4174 --directory uis/backoffice` returned HTTP 200 for `/`; HealthCore Digital and business-metric content checks passed.

#### `/services`

- 🟡 **HealthCore API implementation in progress** under `/services/healthcore-api`; an incident CSV analysis prototype has been added on `feature/healthcore-incidents-analysis`.
- FastAPI routes use a layered service/repository design with TinyDB persistence for users and profiles, bcrypt password hashes, JWT authentication, and owner/admin access checks.
- Registration can include an optional `name`/`phone`/`address` profile; `/auth/me` and `/profiles/me` expose current-user operations.
- Registration and successful login now schedule best-effort Resend email notifications, configured with `RESEND_API_KEY` and `RESEND_FROM_EMAIL`.
- El portal comprueba la validez de los enlaces de recuperación antes de mostrar el formulario; la API ofrece `POST /auth/reset-password/validate` sin consumir el token y rechaza enlaces caducados o ya utilizados.
- Verificación puntual: el endpoint devuelve 200 repetidamente para un token vigente y 400 para tokens caducados, malformados o consumidos; el typecheck del portal terminó correctamente.
- Authentication smoke checks passed for registration, login, current-user/profile reads and updates, missing/malformed/expired-token 401s, cross-owner 403, and user/profile cascade deletion. This is not a permanent automated test suite.
- The five additional sensitive endpoints mentioned in the task were not present in the route inventory; do not invent APIs solely to secure them.
- The previous application directly consumes the 4Geeks external practice API through `NEXT_PUBLIC_API_URL`.
- Incident Analysis completed against the official briefing supplied by the user: nine-column CSV, Pydantic v2, shared streaming engine, readable CLI and aggregate export, authenticated API and static backoffice integration. See the 2026-10-31 audit below.
- Required routes are `POST /api/incidents/analyze` and `GET /api/incidents/results/export`. Only the latest aggregate per account is persisted in TinyDB; no raw uploads or patient values are retained in results.
- The feature-only Render blueprint and hosted URL defaults were removed. No deployment was performed.
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

## Incident Analysis delivery — 2026-10-31

- Branch: `feature/healthcore-incidents-analysis`, HEAD `224ee8d`. The already-prepared merge of `origin/main` (`666e17a`) remains pending and untouched; no new merge, commit, push, rebase or deployment was performed.
- Baseline: 10 failing and 4 passing historical tests, due to the old prototype API/CLI/test contract. Corrected consumers and expanded validation rather than replacing the existing engine.
- Source briefing was supplied directly by the user because the documented file path was absent. The explicit 100-record acceptance table governs over the introductory 1,000-row statement.
- At the time of the original incident-analysis delivery, a root relative symlink enabled a compatibility command without copying rows. It was removed in the 2026-10-31 structural follow-up above. Dataset `scripts/incidents-healthcore.csv` retains SHA-256 `b13555a640f986cd7e1435e3f96f517406e08595753058a4fb16df731d504740`; synthetic provenance has not been confirmed, and no raw dataset changes were staged.
- Acceptance: 100 total / 94 valid / 6 invalid; categories 30/20/14/17/13; states 28/52/14; countries 61/33; satisfaction distribution 3/5/12/23/9, 52 scored closed cases, average 3.58. All required invalid-reason counts equal 1.
- QA: 59 Python tests passed, 5 frontend tests passed, zero failed/skipped. Python compilation and JS syntax checks passed. A 100,000-row synthetic streaming case passed. Tests cover independent simultaneous errors, privacy sentinels, export parity, missing uploads, internal errors and user/account-incarnation isolation.
- Real browser verification passed: local JWT upload, rendering, invalid warning, navigation and GET download. The download matches CLI CSV byte for byte. 390px viewport has no horizontal overflow. Screenshots were saved outside the repository as review evidence.
- Prior functionality: auth/profile/reset regression test passed; Talent Pipeline Tracker typecheck and production build passed. Previous domain models, public website, tracker source, environment files and root lockfiles remain unchanged.
- Limitations: TinyDB single-process persistence without aggregate TTL/purge; multipart may spool uploads temporarily before the analysis size check; duplicate detection uses O(n) hash memory. Existing FastAPI/TestClient deprecations and Next.js workspace-root warnings remain. No regulatory certification or production readiness claim.

## Frontend consolidation — 2026-11-05 (pending review, no commit)

- Started from clean `24c5306`, synchronized with the feature branch on origin.
- LanguageProvider is the sole client document-language owner; removed the competing DocumentLanguage component. Nested Spanish Tracker routes now select Spanish explicitly.
- Next Turbopack and output tracing use the explicit monorepo root; build and start no longer emit workspace-root/lockfile warnings. No lockfiles or dependencies changed.
- Missing/blank Tracker API configuration fails before requests, with localized errors. Existing methods, payloads and endpoint paths are preserved; no external API operations performed.
- Active/historical ownership and local API configuration documented in the frontend README. Historical HTML/static server remain intact. Care JSON-LD URLs now refer to the active routes.
- Validation: 10 frontend tests passed, typecheck/build passed, four public routes returned 200 with ES/EN HTML languages, four historical URLs returned 308 to canonical routes. Backend unchanged; its suite was not rerun in this frontend-only phase.


## Historical frontend inventory — 2026-11-05 (phase 3, uncommitted)

- Published existing phase-2 commit `9c9f121c330ec5ae6787d85b3075ae8b322c9ec9`; GitHub branch and local HEAD match. No merge to main.
- Inventory and byte comparisons recorded in `docs/FRONTEND_HISTORY_INVENTORY.md`. Only documentation changed; no historical files removed/moved, no functional code or protected data changed.
- Corrected current references to deleted CONTEXT.es.md in projectbrief/techContext, the root script description and the inaccurate claim that root landing pages load validation.js.
- HTTP checks confirmed active Next routes/redirects and retained static-server pages/assets. Static `/login` and `/talents` are unsupported and now documented.
- Tests/typecheck/build not repeated: documentation-only changes. Cleanup proposal requires explicit approval; no phase-3 commit/push.


## Principal frontend entry point correction

- Root `serve:website` now starts Next.js locally on 4173; `serve:historical` preserves the independent HTML server on configurable port 4187. Root dev/build/start delegate to Next. No production navigation URL is hardcoded.
- Browser verification: clicked Ingresar from the Spanish landing on 4173; Next login rendered at `/login`. Application READMEs explain commands and backend origin configuration; institutional root README and protected agent files untouched.
