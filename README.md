# HealthCore AI Engineering Monorepo

> English documentation. See [README.es.md](./README.es.md) for Spanish.

This repository contains HealthCore's milestone-based AI Engineering work. It is not an unconfigured starter template. The business context is maintained in the protected [`CONTEXT.md`](./CONTEXT.md).

## Applications and services

| Path | Responsibility | Current implementation |
| --- | --- | --- |
| `uis/website/` | Public bilingual website milestone | Standalone static HTML/CSS/JavaScript; no backend or patient-data persistence. |
| Root `index.html`, `index.en.html`, `style.css`, `validation.js` | Earlier public-site milestone artifacts | Retained because the landing pages differ from `uis/website`; the duplicate care-request forms were removed after explicit approval. |
| `src/index_test.html` and `src/index_test.ts` | Earlier domain-core manual test panel | Kept together; the HTML expects `../dist/index_test.js` and links back to the root landing page. No build command or generated bundle is provided, so this panel is not currently runnable from the repository alone. |
| `uis/talent-pipeline-tracker/` | Next.js portal and prior Talent Pipeline Tracker | HealthCore bilingual landing/care request, auth/profile/dashboard, and a separate tracker using the external 4Geeks API. |
| `uis/backoffice/` | Internal incident-analysis UI | Static client that sends CSV to the authenticated HealthCore API; it does not store the token in web storage. |
| `services/healthcore-api/` | HealthCore backend | FastAPI, JWT auth, TinyDB persistence, profile/account flows, and authenticated aggregate incident analysis/export. |
| `scripts/` | Local analysis CLI and dataset | `analyze.py` and the canonical `scripts/incidents-healthcore.csv` path. |

The static website and the Next.js portal are distinct implementations with different milestone/history boundaries. The Next application retains permanent redirects from legacy HTML filenames; do not delete either application or those redirects without a separate compatibility and milestone decision. The two identical root care-request HTML copies were removed with user approval; external hosting of those root URLs was not verified. The root landing pages' care-request CTAs lead to forms under `uis/website/`; this path works when the repository root is hosted as the document root. For the standalone website, serve `uis/website/` as its document root instead. There is no verified deployment manifest in this repository.

See [`docs/ARCHITECTURE_PROPOSAL.md`](./docs/ARCHITECTURE_PROPOSAL.md) for a proposal that is explicitly separate from the architecture currently implemented.

See the [historical frontend inventory](./docs/FRONTEND_HISTORY_INVENTORY.md) for exact duplicates, active consumers and proposed cleanup requiring approval.

## Local development

### HealthCore API

Use Python 3.11+ and follow [`services/healthcore-api/README.md`](./services/healthcore-api/README.md). From the repository root:

```bash
cd services/healthcore-api
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

The API is available at `http://127.0.0.1:8000`; interactive API docs are at `/docs`. The default TinyDB file is local application data and should not be committed if it contains real information.

### Next.js portal

In another terminal:

```bash
cd uis/talent-pipeline-tracker
npm ci
npm run dev
```

The portal is at `http://localhost:3000`. Full auth/profile flows require the API. The Talent Tracker uses a separate external practice API; it is not backed by HealthCore API.

### Public HTML website and backoffice

From the repository root, start the public HTML site with Node.js:

```bash
npm run serve:website
```

Open `http://127.0.0.1:4173/`. The server serves only the approved pages and assets from `uis/website/`; it does not replace or change the separate Next.js portal. The HTML site requires network access for Tailwind's browser CDN. To run the independent backoffice, use another terminal:

```bash
python3 -m http.server 4174 --bind 127.0.0.1 --directory uis/backoffice
```

The API accepts exactly one configured CORS origin via `HEALTHCORE_FRONTEND_URL` (default `http://localhost:3000`), so a single API process cannot serve the portal and backoffice from different origins simultaneously. For backoffice testing use `http://localhost:4174`; for the portal use `http://localhost:3000`. Do not use a wildcard. Supporting both concurrently would require an explicit, reviewed origin allowlist change to the middleware.

## Configuration and secrets

- Backend local settings belong in `services/healthcore-api/.env`; frontend local settings belong in `uis/talent-pipeline-tracker/.env.local`.
- `.env.example` files are templates, not credentials. Copy their variable names and replace sample values locally.
- Never commit, paste into documentation, or expose real `.env`/`.env.local` values. In Codespaces, configure secrets through Codespaces secrets/environment settings or the runtime environment rather than Git-tracked files.
- `NEXT_PUBLIC_*` values are embedded in browser-visible frontend code; they must never contain secrets.
- Resend credentials are optional for local flows; email delivery is not available without them. See the backend README for details and security limitations.

## Validation commands

Run each suite from the indicated working directory:

```bash
# Backend (activate the existing service environment first)
cd services/healthcore-api
source .venv/bin/activate
python -m pytest tests -q

# Static backoffice tests
npm --prefix uis/backoffice test
npm --prefix uis/backoffice run check

# Next.js tracker package; all its npm scripts are package-local
cd uis/talent-pipeline-tracker
npm test
npm run typecheck
npm run build
```

The current validation record, including known failures and limitations, is in [`memory-bank/progress.md`](./memory-bank/progress.md) and the dated [`memory-bank/AUDIT.md`](./memory-bank/AUDIT.md). Do not infer that a test passed merely because it is documented historically.

## Repository map

- `agents/`, `skills/`, `mcps/`: agent templates and reusable capabilities; no claim that a production custom agent/MCP is implemented.
- `data/`: data/evaluation/pipeline organizational documentation.
- `docs/`: cross-cutting architecture documentation and proposals.
- `infra/`, `workflows/`: infrastructure/automation guidance; no deployment workflow is currently verified here.
- `packages/shared/`, `shared/`: example shared types and resource organization.
- `memory-bank/`: project brief, technical context, current progress, and dated audits.

## Privacy and readiness

The incident dataset's synthetic provenance has not been confirmed. Do not print or redistribute its rows or treat the prototype as approved for real patient data. The API uses local single-process TinyDB; retention/purge, production deployment controls, and regulatory/security review remain outstanding. This repository makes no HIPAA/UK GDPR certification or production-readiness claim.

## Program and contributors

This repository builds on the 4Geeks Academy AI Engineering Career Program and its student project template. Credit to [@marcogonzalo](https://www.linkedin.com/in/marcogonzalo), [@alezanchezr](https://x.com/alesanchezr), and the other contributors to the original template.

- [4Geeks Academy — AI Engineering](https://4geeksacademy.com/en/career-programs/ai-engineering)
- [Other 4Geeks courses](https://4geeksacademy.com/en/program-comparison)
- [4Geeks Academy GitHub resources](https://github.com/4geeksacademy)
- [How to start a coding project](https://4geeks.com/lesson/how-to-start-a-project)
