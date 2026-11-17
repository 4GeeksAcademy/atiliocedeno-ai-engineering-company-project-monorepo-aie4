# HealthCore frontend / Frontend de HealthCore

Next.js + React + TypeScript powers the staff portal. FastAPI remains the
HealthCore backend; Talent Pipeline Tracker uses its independent external API.

## Local configuration / Configuración local

Use `.env.example` as the template for `.env.local` in this directory:

- `HEALTHCORE_API_URL`: server-side URL for HealthCore FastAPI. Browser requests use the same-origin `/api/healthcore` proxy by default, which avoids CORS and private Codespaces port-authentication issues. For local development, the default is `http://127.0.0.1:8000`.
- `NEXT_PUBLIC_API_URL`: independent Tracker API. The browser calls the session-protected, same-origin `/api/tracker/records` routes. The portal forwards only record and note operations, without forwarding HealthCore credentials. The existing example documents
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

## Internal routes / Rutas internas

Run `npm ci` here, then `npm run serve:admin` from the repository root (default port 3000). Root `npm run build` builds both frontends. Root `npm start` starts the production staff portal. Set the backend reset-link origin to this portal.

The shared private navigation links to the account dashboard, profile, password management, talents, suppliers, operations and incident analysis. Users administration requires the admin role. The domain lab also requires a session. Login, registration and password recovery remain accessible before signing in.

The incident upload and export UI lives at `/backoffice/incidents`. The supplier directory remains at `/backoffice/suppliers`. FastAPI authorizes and processes these requests. The Tracker keeps its independent API contract. Public patient pages and historical website redirects belong to the [public app](../website/README.md).
