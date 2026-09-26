# HealthCore Backoffice

Minimal internal entry view for HealthCore Digital's operational workspace. This application is intentionally separate from the public website in `uis/website` and from the previous Talent Pipeline Tracker.

## Stack

- Semantic HTML5
- Plain CSS with responsive layout
- No backend, API, authentication, patient data, or persistence

## Routes

- `index.html` — internal HealthCore Digital overview and `/` entry point when served from this directory

## Run locally

From the repository root:

```bash
python3 -m http.server 4174 --directory uis/backoffice
```

Then open <http://localhost:4174/>.

## Validation

This is a static application and does not define package-local build, typecheck, lint, or test scripts. Validate the entry point through a local static server and confirm that the page renders the HealthCore business metrics and internal navigation.

## Boundaries

The dashboard contains only non-patient operational context from `CONTEXT.md`: clinic count, workforce size, approximate revenue, operational challenge indicators, and HIPAA/UK GDPR design constraints. Future operational functionality should use documented services under `services/` rather than adding APIs to this static entry view.
