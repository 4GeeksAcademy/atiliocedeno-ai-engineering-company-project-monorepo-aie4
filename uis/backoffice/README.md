# HealthCore Backoffice

Minimal internal entry view for HealthCore Digital's operational workspace. This application is intentionally separate from the public website in `uis/website` and from the previous Talent Pipeline Tracker.

## Stack

- Semantic HTML5
- Plain CSS with responsive layout
- Optional integration with the authenticated HealthCore API for transient CSV analysis

## Routes

- `index.html` — internal HealthCore Digital overview and `/` entry point when served from this directory
- `incidents.js` — incident CSV upload, aggregate rendering, and sanitized findings download

## Run locally

From the repository root:

```bash
python3 -m http.server 4174 --directory uis/backoffice
```

Then open <http://localhost:4174/>.

## Validation

This is a static application and does not define package-local build, typecheck, lint, or test scripts. Validate the entry point through a local static server and confirm that the page renders the HealthCore business metrics and internal navigation.

For CSV analysis, start `services/healthcore-api` separately, sign in to obtain a bearer token, then use the **Incident analysis** section. The client sends the selected file to `/incidents/analyze` or `/incidents/export`; it does not store the token in web storage. `window.HEALTHCORE_API_URL` may be set before `incidents.js` loads to use a different API origin. The current expected headers are provisional and documented in the backend README; only synthetic or de-identified CSVs are appropriate for this prototype.

Render deployment descriptors are provided in the repository root (`render.yaml`) and in `services/healthcore-api/render.yaml`. The frontend currently defaults to `https://healthcore-api.onrender.com`; update that value in `incidents.js` if the Render service uses another hostname. Render static sites do not provide runtime environment variables to plain HTML automatically, so configure the API hostname in source or add a generated runtime config before deployment.

## Boundaries

The dashboard contains non-patient operational context from `CONTEXT.md` and a client for the documented incident-analysis service under `services/`. It does not host its own API or persist uploads. This prototype is not approved for real patient data; follow the backend README's privacy and compliance limitations.
