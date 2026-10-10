# Tech Context

> This document describes the architecture and technologies identified in the repository. The canonical business context for agents is [`CONTEXT.md`](../CONTEXT.md); [`CONTEXT.es.md`](../CONTEXT.es.md) is retained as the Spanish version/source.

## Previous frontend implementation: static Milestone 1

- `index.html` / `index.en.html`: HealthCore corporate landing page (HTML5 + Tailwind CSS v4 via CDN `@tailwindcss/browser@4`).
- `aplication.html` / `aplication.en.html`: medical care request form.
- `style.css`: custom stylesheet complementing Tailwind.
- `validation.js`: vanilla JavaScript form validation, with no external dependencies.
- Original brief in [`promt.md`](../promt.md) ("MILESTONE 1 -- DELIVERY 27/06").

## Identified frontend implementation

The repository contains a static Milestone 1 in the root and a previous Next.js-based Talent Pipeline Tracker implementation. The latter defines the technical structure described below, but its integration status is maintained in [`progress.md`](./progress.md).

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
├── public/                      # Static HealthCore landing page (HTML/CSS served by Next.js)
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

### Milestone 4 architecture

According to the root `README.md` and `uis/README.md`, the project should evolve toward this structure:

```text
/uis/website        # HealthCore public presence (currently: static Milestone 1 in the root)
/uis/backoffice     # Internal HealthCore Digital entry view
/uis/talent-pipeline-tracker # Preserved previous milestone Next.js application
/services           # Location for any HealthCore backend service (currently: none; an external practice API is used)
```

These paths represent the responsibilities of Milestone 4. The implementation status of each is documented in `progress.md`; no component that does not exist in the repository is declared implemented here. The template README recommends a centralized FastAPI API for `services/`, but that technology should be adopted only if the milestone brief requires it.

### Currently identified architecture

- Monolithic Next.js frontend (without a custom backend service in the monorepo) that directly calls a **4Geeks external practice REST API**:
  `NEXT_PUBLIC_API_URL=https://playground.4geeks.com/tracker/api/v1` (defined in `.env.example`).
- The `talent-pipeline.tsx` component implements manual pagination over the `GET /records` endpoint (page size of 1,000 records per request, accumulating until a page is incomplete), with an in-memory cache (`recordsCache`) invalidated through an event (`invalidateRecordsCache`).
- The corporate landing page (static HTML/CSS in `public/`) and React app (`app/talents/**`) coexist in the same Next.js project; the root `/` route simply redirects to the static landing page.
- There is no database layer, authentication, or custom service: all persistence depends on the external API.

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

- Monorepo root (`package.json`) currently has no application scripts. This is intentional because `/uis/website` and `/uis/backoffice` are static applications without package-level build or TypeScript tooling.
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
