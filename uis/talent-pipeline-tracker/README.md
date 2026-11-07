# HealthCore frontend / Frontend de HealthCore

Next.js + React + TypeScript is the principal frontend. FastAPI remains the
HealthCore backend; Talent Pipeline Tracker uses its independent external API.

## Local configuration / Configuración local

Use `.env.example` as the template for `.env.local` in this directory:

- `HEALTHCORE_API_URL`: server-side URL for HealthCore FastAPI. Browser requests use the same-origin `/api/healthcore` proxy by default, which avoids CORS and private Codespaces port-authentication issues. For local development, the default is `http://127.0.0.1:8000`.
- `NEXT_PUBLIC_API_URL`: independent Tracker API; the existing example documents
  `https://playground.4geeks.com/tracker/api/v1`. Do not point it at FastAPI.

Without `NEXT_PUBLIC_API_URL` (or with a blank value), Tracker operations show a
localized configuration error before making a request. They do not fall back to
Next.js `/records`. No credentials belong in `NEXT_PUBLIC_*` variables.
Restart development after changes; rebuild production because public variables
are embedded at build time. This phase does not verify the external API or write
any Tracker data.

Sin `NEXT_PUBLIC_API_URL`, el Tracker muestra un error de configuración antes de
hacer peticiones. No modifica datos ni usa FastAPI como sustituto. Reinicia el
servidor local o reconstruye producción tras cambiar la configuración.

Run `npm run dev`; validate with `npm test`, `npm run typecheck`, `npm run build`.

## Active and historical files / Archivos activos e históricos

| Location | Responsibility |
| --- | --- |
| `app/public-site/` | Active React public pages and shared care-form behavior; `/`, `/en`, `/care-request`, `/en/care-request`. |
| `app/components/language-context.tsx` | Sole client owner of document language. `proxy.ts` and `app/layout.tsx` supply the initial public-page HTML language. |
| `app/talents/` | Independent Tracker functionality, hosted within this Next app. |
| `app/backoffice/` | Protected native React interface for authenticated incident analysis. |
| `app/domain-lab/` | Manual UI for exercising shared TypeScript domain utilities. |
| `src/` at repository root | Shared TypeScript types and domain utilities; the former unbundled HTML panel has been retired. |
| `public/` | Static assets only; old landing HTML copies have been removed. Legacy HTML URLs redirect to active Next routes. |
| `../../package.json` | Exposes Next dev/build/start; `serve:website` starts the unified frontend locally on 4173. |

Public pages, protected Backoffice, and the domain lab run in this Next app. The
old independent static website and static Backoffice entry have been retired.
The FastAPI service still performs authenticated incident analysis/export.
Next explicitly uses the monorepo root for Turbopack and output tracing; package
installation and scripts remain local to this app.

### Backoffice sidebar and feature scope

The protected `/backoffice` sidebar has no separate Overview/Resumen item.
Operations and Digital priorities navigate to sections on that page; People &
workforce opens the existing `/talents` feature (the Talent Pipeline, not an HR
directory); Incident analysis navigates to the CSV analysis form. The operational
snapshot metrics and priority descriptions are illustrative and are not loaded
from clinic or business systems. CSV analysis and aggregate export are backed by
the HealthCore API. See [`../backoffice/README.md`](../backoffice/README.md) for
the sidebar map and privacy boundary.

Se conservan los entregables académicos y el servidor estático. Las correcciones
del frontend activo no se propagan automáticamente a esas versiones históricas.

## Principal entry point

From the repository root, `npm run serve:website` starts Next.js on local port 4173, including login, bilingual public routes, protected Backoffice, and domain lab. `npm run dev` uses the Next default port. For production use root `npm run build` and `npm start`; no production origin or port is embedded in navigation links.

When using local port 4173, configure the backend `HEALTHCORE_FRONTEND_URL` to the matching frontend origin for CORS and reset links. No local environment values are changed automatically. Root `npm run dev` retains the default 3000 workflow. The institutional root README retains historical commands; use this application README for the current command distinction.
