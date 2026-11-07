# Tech Context

> This document describes the architecture and technologies identified in the repository. The canonical business context for agents is [`CONTEXT.md`](../CONTEXT.md).

## Current implementation snapshot (2026-11-05; validated build)

- `services/healthcore-api/`: FastAPI service with JWT authentication, TinyDB local persistence, account/profile/password flows, and authenticated incident-analysis aggregates/export. This is one local service, not a deployed or multi-service production architecture.
- `uis/talent-pipeline-tracker/`: Next.js 16 App Router and React 19 canonical frontend. It includes bilingual HealthCore public/care-request routes, account/profile/dashboard, protected native Backoffice at `/backoffice`, shared TypeScript domain lab at `/domain-lab`, and a distinct Talent Tracker using the external 4Geeks practice API.
- Retired static landing pages/site, public HTML copies, unbundled domain panel HTML, and static Backoffice entry were removed. The active Next config preserves permanent redirects for historical HTML URLs. External static-hosting consumers were not verifiable.
- `uis/backoffice/`: legacy package/test artifacts only; not a running frontend. Its former markup-dependent tests were replaced with five source-contract assertions (5/5 pass); they do not provide browser/runtime coverage. Unreferenced `incidents.js` and `style.css` remain pending explicit cleanup review.
- Latest frontend validation: tracker `typecheck` and production `build` pass (21 routes); Backoffice source-contract tests pass (5/5). Tracker tests pass 11/15: three auth tests fail resolving `app/components/brand-logo.tsx` through their test harness, and one proxy-language test fails because the mocked response lacks `headers`. Runtime route/protection checks and backend tests were not rerun.
- `scripts/incidents-healthcore.csv`: sole canonical tracked dataset path; the obsolete root symlink was removed after all in-repository consumers were confirmed to use this location. The dataset provenance is unconfirmed; do not print or redistribute its rows.
- `packages/shared/` is not connected as a package workspace. No deployment manifest was found in the repository during the 2026-10-31 audit; this does not rule out external deployment contracts.

The four permanent Next redirects preserve `/index.html`→`/`, `/index.en.html`→`/en`, `/aplication.html`→`/care-request`, and `/aplication.en.html`→`/en/care-request`. Retain them unless an explicit compatibility review approves a change.

### Local configuration and security boundaries

- Backend local configuration: `services/healthcore-api/.env`; frontend local configuration: `uis/talent-pipeline-tracker/.env.local`. `.env.example` files are templates only. Do not read or commit actual secrets; use Codespaces secret/environment settings or runtime environment variables for Codespaces.
- `NEXT_PUBLIC_*` values are browser-visible and must not contain credentials. Resend is optional; without configured credentials and sender, email delivery is not available.
- TinyDB is local, single-process persistence. Aggregate retention/purge, production deployment controls, and regulatory/security approval remain gaps. The application is not approved for real patient data.

## Previous frontend implementation: static Milestone 1 (retired)

- `index.html` / `index.en.html`: earlier HealthCore corporate landing pages (HTML5 + Tailwind CSS v4 via CDN `@tailwindcss/browser@4`), distinct from `uis/website`; retired in favor of Next routes.
- The earlier root `aplication.html` / `aplication.en.html` copies were byte-identical to `uis/website` forms and were removed with explicit user approval. External/static hosting consumers were not verifiable from repository evidence.
- Root `style.css`, `validation.js`, and duplicate website assets were retired with their static pages.
- `src/index_test.html` was an earlier domain-core manual panel pointing to missing `../dist/index_test.js`; it was replaced by `/domain-lab`. `src/types/` and `src/utils/` domain modules remain.
- Original brief in [`promt.md`](../promt.md) ("MILESTONE 1 -- DELIVERY 27/06").

## Previous frontend implementation: Talent Pipeline Tracker

The repository contains a static Milestone 1 in the root and a previous Next.js-based Talent Pipeline Tracker implementation. The Next.js application now also contains the HealthCore portal and custom API integration described in the later dated section; the historical tracker-only description below should be read as prior state, not current architecture.

### Technology stack

- **Framework**: Next.js (`^16.3.5`), using the App Router (`app/` directory).
- **Language**: TypeScript (`^7.0.2`), `strict: true` in `tsconfig.json`.
- **UI**: React `^19.3.0` / `react-dom` `^19.3.0`, with icons from `lucide-react`.
- **Styles**: Tailwind CSS loaded via CDN (`@tailwindcss/browser@4`) in `app/layout.tsx`, plus a custom CSS module (`app/talents/pipeline.module.css`) and a static stylesheet (`public/style.css`) for the landing page.
- **Types**: `@types/node`, `@types/react`, and `@types/react-dom` as devDependencies.
- There is no custom backend: the app is a pure Next.js frontend consuming an external HTTP API.

### Relevant monorepo structure

```text
uis/talent-pipeline-tracker/     # Previous talent management application
├── app/
│   ├── layout.tsx               # Root layout, loads Tailwind via CDN and LanguageProvider
│   ├── page.tsx                 # "/" redirects to /index.html (static landing page)
│   ├── components/
│   │   ├── global-navbar.tsx    # Shared navbar across talent views
│   │   └── language-context.tsx # Language context (ES/EN)
│   └── talents/
│       ├── page.tsx / talent-pipeline.tsx   # Pipeline listing (ES)
│       ├── new/page.tsx / new-talent.tsx    # Candidate creation (ES)
│       ├── [id]/page.tsx / talent-detail.tsx# Candidate detail (ES)
│       ├── en/page.tsx, en/new/page.tsx, en/[id]/page.tsx  # English variants
│       ├── types.ts             # TalentRecord, TalentNote, TalentStatus, TalentStage
│       ├── labels.ts            # ES/EN labels for status and stage
│       └── pipeline.module.css
├── public/                      # Legacy HTML copies; served by Next.js
│   ├── index.html / index.en.html
│   ├── aplication.html / aplication.en.html
│   └── style.css
├── .env.example                 # NEXT_PUBLIC_API_URL
├── package.json / package-lock.json
└── tsconfig.json

packages/shared/                 # @repo/shared-types — shared types package (still a placeholder)
├── package.json
└── types/index.ts               # Example types only: Id, BaseEntity

services/                        # Template README only; any backend must be located here
uis/                              # Contains website/, backoffice/, and the preserved talent-pipeline-tracker/
```

### Milestone 4 architecture — historical target description

According to the root `README.md` and `uis/README.md`, the project should evolve toward this structure:

```text
/uis/website        # Independent HealthCore public-site milestone (bilingual landing and care forms)
/uis/backoffice     # Internal HealthCore Digital entry view
/uis/talent-pipeline-tracker # Preserved previous milestone Next.js application
/services           # Location for any HealthCore backend service (currently: none; an external practice API is used)
```

These paths represent the responsibilities of Milestone 4. The implementation status of each is documented in `progress.md`; no component that does not exist in the repository is declared implemented here. The template README recommends a centralized FastAPI API for `services/`, but that technology should be adopted only if the milestone brief requires it.

### Previous tracker-only architecture (historical)

- The tracker module directly calls a **4Geeks external practice REST API**:
  `NEXT_PUBLIC_API_URL=https://playground.4geeks.com/tracker/api/v1` (defined in `.env.example`).
- The `talent-pipeline.tsx` component implements manual pagination over the `GET /records` endpoint (page size of 1,000 records per request, accumulating until a page is incomplete), with an in-memory cache (`recordsCache`) invalidated through an event (`invalidateRecordsCache`).
- The corporate landing page (static HTML/CSS in `public/`) and React app (`app/talents/**`) coexist in the same Next.js project; the root `/` route simply redirects to the static landing page.
- Those statements described the tracker before HealthCore API/account features were added; they do not describe the current repository as a whole.

### Agent and skill infrastructure

- The template organizes agents in `agents/`, reusable capabilities in `skills/`, and MCP servers in `mcps/`.
- The current state includes `skills/_template/SKILL.md` and template documentation in `agents/` and `mcps/`.
- The exercise-specific structure (`AGENTS.md`, `.agents/rules/`, and `.agents/skills/<skill>/SKILL.md`) is verified and maintained in `progress.md`; this document does not claim it exists unless it is present in the tree.

### Type and data contract strategy

- Data contracts for the "talent" domain are defined locally in `app/talents/types.ts` (`TalentRecord`, `TalentNote`, `TalentStatus`, `TalentStage`), **not** in `packages/shared/types/index.ts`.
- `packages/shared` (`@repo/shared-types`) exists but contains only generic example types (`Id`, `BaseEntity`)—there is not yet real integration between the shared package and the tracker app.
- `TalentRecord` is deliberately permissive (`Record<string, RecordValue>`, with multiple field aliases: `name`/`full_name`/`fullName`, `id`/`_id`, etc.), reflecting that the exact shape of the external API response is not standardized.

### Relevant external APIs/services

- 4Geeks practice API: `https://playground.4geeks.com/tracker/api/v1` (endpoint used: `/records`). It is a third-party service for learning purposes, not a HealthCore-owned service.

### Development, build, lint, test, and validation scripts

- Monorepo root (`package.json`) exposes `serve:website` to start the canonical Next.js frontend locally. Next build/typecheck/test scripts remain package-local.
- The previous Talent Pipeline Tracker has package-local scripts and remains independently runnable; root scripts do not delegate to it.
- In the previous Talent Pipeline Tracker package:
  - `dev`: `next dev`
  - `build`: `next build`
  - `start`: `next start`
  - `typecheck`: `tsc --noEmit`
  - ❓ Not verified: no `lint` or `test` script is defined in that `package.json`.

### Known technical constraints

- `tsconfig.json` uses `strict: true`, `moduleResolution: "Bundler"`, and `jsx: "react-jsx"`; it does not define an unnecessary `outDir`, and any type changes must respect strict mode.
- The app depends on `NEXT_PUBLIC_API_URL` being configured (a public variable exposed to the client); without it, requests to `/records` fail.
- The root README describes a template without a global workspace runner. The available root `package.json` delegates scripts to the Next.js project.

### Important project conventions

- One subfolder per app under `uis/`, each with its own documentation (root `README.md` rule).
- Bilingual content (ES/EN) is handled with parallel routes (`/talents` vs `/talents/en`) rather than a Next.js i18n system.
- Single-line comments explain non-obvious decisions (see `global-navbar.tsx`, `talent-pipeline.tsx`).
- Generated tracker `AGENTS.md`/`CLAUDE.md` files were produced by `next dev` and should not be treated as manual project documentation.

### Dependencies/configurations a new agent should know before modifying code

- The `packages/shared` package is not linked as an npm workspace (there is no `workspaces` entry in the observed root `package.json`); its reuse by the previous tracker was not verified (❓ Not verified).
- Data arriving from the external API does not follow a fixed schema (hence the multiple optional aliases in `TalentRecord`); any parsing changes must preserve that tolerance.

## Verified Incident Analysis architecture (2026-10-31)

This section supersedes earlier historical statements that no backend exists for this feature. The existing FastAPI service is `services/healthcore-api`; its JWT/TinyDB authentication remains unchanged. `IncidentRecord` field validators collect independent HealthCore field/cross-field violations; typed `SatisfactionSummary`, `ValidationSummary` and `AnalysisResult` describe aggregate output. Streaming CSV parsing and hash-based duplicate detection remain in `incident_analysis.py`; `incident_reporting.py` provides the common CLI/HTTP export representation.

`POST /api/incidents/analyze` stores one aggregate in TinyDB per authenticated account incarnation (numeric ID + creation timestamp). `GET /api/incidents/results/export` exports that same account's latest aggregate. No raw rows are stored in that table. The static backoffice consumes these contracts without recalculating business metrics. CLI exports use exclusive file creation. Development test dependencies are isolated in `requirements-dev.txt` and a backoffice package with jsdom/Node tests; no frontend framework or production build was added.

Local backoffice origin is 4174; use the existing `HEALTHCORE_FRONTEND_URL` setting for CORS. Deployment infrastructure was not added. Duplicate-ID detection uses O(n) hash memory; TinyDB still requires a single-process deployment and a separate retention strategy before production use.
