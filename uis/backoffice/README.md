# HealthCore Backoffice

Minimal internal entry view for HealthCore Digital's operational workspace. This application is intentionally separate from the public website in `uis/website` and from the previous Talent Pipeline Tracker.

## Stack

- Semantic HTML5
- Plain CSS with responsive layout
- Optional integration with the authenticated HealthCore API for transient CSV analysis

## Routes

- `index.html` — internal HealthCore Digital overview and `/` entry point when served from this directory
- `incidents.js` — incident CSV upload, aggregate rendering, and aggregate results download

## Run locally

From the repository root:

```bash
python3 -m http.server 4174 --directory uis/backoffice
```

Then open <http://localhost:4174/>.

## Incident analysis

Open `http://localhost:4174/#incident-analysis`. Start the existing HealthCore API with `HEALTHCORE_FRONTEND_URL=http://localhost:4174` to allow this origin. Obtain a token with `/auth/login`; the form never saves it in web storage. API default: `http://localhost:8000`, overridable with `window.HEALTHCORE_API_URL` before `incidents.js` loads.

Upload uses `POST /api/incidents/analyze`; **Download Results CSV** uses `GET /api/incidents/results/export` for the latest authorized result, without reuploading the file. The nine-column contract and domain rules are documented in the backend README. Cards show total/valid/invalid counts and satisfaction; sections show all five categories, three states, two countries, five scores and safe validation-reason counts. Invalid records are excluded from business metrics; rule counts can overlap.

## Validation

The application remains static HTML/CSS/JS; it has no production build step. Node and jsdom are used only for tests:

```bash
npm ci
npm test
npm run check
```

Five tests cover selection, upload/loading, result rendering, warnings, navigation, export method, authorization errors and safe error feedback. Browser verification passed with the local API and reference dataset (100/94/6, average 3.58), including CSV download and a 390px mobile viewport without horizontal overflow. The downloaded CSV matched the CLI export byte for byte.

## Boundaries

The dashboard contains non-patient operational context from `CONTEXT.md` and a client for the documented incident-analysis service under `services/`. It does not host its own API or persist uploads. This prototype is not approved for real patient data; follow the backend README's privacy and compliance limitations.
