# HealthCore AI Engineering Monorepo

> English documentation. Guías en español: [interfaces de usuario](./uis/README.es.md) y [API de HealthCore](./services/healthcore-api/README.md).

This repository contains HealthCore's milestone-based AI Engineering work. It is not an unconfigured starter template. The business context is maintained in the protected [`CONTEXT.md`](./CONTEXT.md).

## Applications and services

| Path | Responsibility | Current implementation |
| --- | --- | --- |
| [uis/website](./uis/website/README.md) | Public Next.js website | Spanish and English landing pages and the demo care request form. The form validates input locally without sending or storing a request. |
| [uis/talent-pipeline-tracker](./uis/talent-pipeline-tracker/README.md) | Staff Next.js portal | Sign-in, accounts, talent pipeline, supplier directory, incident analysis and domain lab. User administration requires the admin role. |
| [services/healthcore-api](./services/healthcore-api/README.md) | FastAPI backend | JWT authentication, profiles, supplier records and aggregate incident analysis/export with TinyDB persistence. |
| `src/` | Shared TypeScript domain utilities | Domain types, transformations, validation, search and collection helpers consumed by the portal and `/domain-lab`. |
| `scripts/` | Local analysis CLI and dataset | `analyze.py` and the canonical `scripts/incidents-healthcore.csv` path; no static website server remains. |

Legacy landing and care-form HTML URLs redirect to the bilingual routes on the public website. The staff portal uses FastAPI for HealthCore operations and a separate external API for talent records and notes.

See [`docs/ARCHITECTURE_PROPOSAL.md`](./docs/ARCHITECTURE_PROPOSAL.md) for a proposal that is explicitly separate from the architecture currently implemented.

See the [historical frontend inventory](./docs/FRONTEND_HISTORY_INVENTORY.md) for exact duplicates, active consumers and proposed cleanup requiring approval.

## Local development

### HealthCore API

Use [uv](https://docs.astral.sh/uv/getting-started/installation/) with Python 3.11+ and follow [`services/healthcore-api/README.md`](./services/healthcore-api/README.md). From the repository root:

```bash
cd services/healthcore-api
uv sync --locked
# Before starting, configure HEALTHCORE_JWT_SECRET in the service .env (see the API guide).
uv run --locked uvicorn app.main:app --reload
```

The API is available at `http://127.0.0.1:8000`; interactive API docs are at `/docs`. The default TinyDB file is local application data and should not be committed if it contains real information.

### Public website and staff portal

Run each block in its own terminal from the repository root.

**Public website** at `http://localhost:4173`:

```bash
npm --prefix uis/website ci
npm run serve:website
```

Visit `/` or `/en` for the landing page, and `/care-request` or `/en/care-request` for the form. These pages work without FastAPI or a staff account.

**Staff portal** at `http://localhost:3000`:

```bash
npm --prefix uis/talent-pipeline-tracker ci
npm run serve:admin
```

With FastAPI running, sign in at `/login`. Open `/talents` for the pipeline, `/backoffice/suppliers` to manage supplier rates and status, and `/backoffice/incidents` to upload a CSV, review results and export aggregates.

## Configuration and secrets

- Configure `HEALTHCORE_JWT_SECRET` in `services/healthcore-api/.env`. Set `HEALTHCORE_FRONTEND_URL` to the staff portal origin for password reset links and CORS (default `http://localhost:3000`).
- In `uis/talent-pipeline-tracker/.env.local`, set `NEXT_PUBLIC_API_URL` to the external Tracker API. The portal uses `HEALTHCORE_API_URL` for FastAPI (default `http://127.0.0.1:8000`).
- Optionally set `HEALTHCORE_PORTAL_URL` in `uis/website/.env.local` to display a staff sign-in link in the landing page footer.
- `.env.example` files are templates, not credentials. Copy their variable names and replace sample values locally.
- Never commit, paste into documentation, or expose real `.env`/`.env.local` values. In Codespaces, configure secrets through Codespaces secrets/environment settings or the runtime environment rather than Git-tracked files.
- `NEXT_PUBLIC_*` values are embedded in browser-visible frontend code; they must never contain secrets.
- Resend credentials are optional for local flows; email delivery is not available without them. See the backend README for details and security limitations.

## Validation commands

After installing the dependencies above, run these commands from the repository root:

```bash
uv run --locked --project services/healthcore-api python -m pytest services/healthcore-api/tests -q
npm --prefix uis/backoffice test
npm --prefix uis/website test
npm --prefix uis/talent-pipeline-tracker test
npm --prefix uis/website run typecheck
npm --prefix uis/talent-pipeline-tracker run typecheck
npm run build
```

The root build compiles both Next.js apps. To serve the production builds locally, run `npm run start:website` and `npm start` in separate terminals.

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
