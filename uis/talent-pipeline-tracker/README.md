# HealthCore frontend / Frontend de HealthCore

Next.js + React + TypeScript is the principal frontend. FastAPI remains the
HealthCore backend; Talent Pipeline Tracker uses its independent external API.

## Local configuration / Configuración local

Use `.env.example` as the template for `.env.local` in this directory:

- `NEXT_PUBLIC_HEALTHCORE_API_URL`: HealthCore FastAPI.
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
| `public/` | Retained historical HTML/CSS copies. Four legacy HTML URLs redirect to active Next routes; these copies are not the active page components. |
| `../website/` | Independent academic HTML/CSS/JS deliverable, preserved. |
| `../../scripts/serve-website.mjs` | Allowlisted static server for `uis/website/`, preserved. |
| `../../package.json` | Exposes Next dev/build/start; `serve:website` starts Next locally on 4173, `serve:historical` starts the independent HTML server on 4187. |

No historical files or lockfiles are removed. Next explicitly uses the monorepo
root for Turbopack and output tracing; package installation and scripts remain
local to this app. Root landing HTML and the independent backoffice also remain.

Se conservan los entregables académicos y el servidor estático. Las correcciones
del frontend activo no se propagan automáticamente a esas versiones históricas.

## Principal entry point

From the repository root, `npm run serve:website` starts Next.js on local port 4173, including login and all bilingual public routes. `npm run dev` uses the Next default port. For production use root `npm run build` and `npm start`; no production origin or port is embedded in navigation links. `npm run serve:historical` is only for the academic HTML site (default 4187, configurable with PORT).

When using local port 4173, configure the backend `HEALTHCORE_FRONTEND_URL` to the matching frontend origin for CORS and reset links. No local environment values are changed automatically. Root `npm run dev` retains the default 3000 workflow. The institutional root README retains historical commands; use this application README for the current command distinction.
