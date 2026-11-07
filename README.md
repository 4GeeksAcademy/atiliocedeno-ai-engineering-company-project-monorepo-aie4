# HealthCore AI Engineering Monorepo

> English documentation. See [README.es.md](./README.es.md) for Spanish.

This repository contains HealthCore's milestone-based AI Engineering work. It is not an unconfigured starter template. The business context is maintained in the protected [`CONTEXT.md`](./CONTEXT.md).

## Applications and services

| Path | Responsibility | Current implementation |
| --- | --- | --- |
| `uis/talent-pipeline-tracker/` | Unified Next.js frontend | HealthCore bilingual landing/care request, auth/profile/dashboard, protected incident-analysis Backoffice, domain utility lab, and separate Talent Tracker using the external 4Geeks API. |
| `services/healthcore-api/` | HealthCore backend | FastAPI, JWT auth, TinyDB persistence, profile/account flows, and authenticated aggregate incident analysis/export. |
| `src/` | Shared TypeScript domain utilities | Domain types, transformations, validation, search and collection helpers consumed by the portal and `/domain-lab`. |
| `scripts/` | Local analysis CLI and dataset | `analyze.py` and the canonical `scripts/incidents-healthcore.csv` path; no static website server remains. |

Next.js is the canonical frontend. Retired static landing/form pages redirect from their old HTML URLs to the active localized Next routes. The native Backoffice remains protected and sends analysis requests to FastAPI; incident processing has not moved into the frontend. There is no verified deployment manifest in this repository.

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

### Next.js frontend

In another terminal:

```bash
cd uis/talent-pipeline-tracker
npm ci
npm run dev
```

The frontend is at `http://localhost:3000`. Full auth/profile/Backoffice flows require the API. The Talent Tracker uses a separate external practice API; it is not backed by HealthCore API. Key routes include `/`, `/en`, `/care-request`, `/en/care-request`, `/backoffice`, and `/domain-lab`.

Use the same Next.js frontend for public pages and protected Backoffice. The API's configured `HEALTHCORE_FRONTEND_URL` should match this origin (default `http://localhost:3000`).

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

# Backoffice navigation and incident-analysis contract tests
npm --prefix uis/backoffice test

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
