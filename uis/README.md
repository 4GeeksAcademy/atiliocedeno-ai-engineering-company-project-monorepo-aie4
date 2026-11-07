# User interfaces

This folder contains the canonical Next.js frontend and historical app folders; old static pages are retired, and legacy redirects do not imply an independent static hosting contract.

- [`backoffice/`](./backoffice/README.md) — migration-era package/test artifacts; the active protected Backoffice is `/backoffice` in the Next.js app.
- [`talent-pipeline-tracker/`](./talent-pipeline-tracker/) — canonical Next.js app with HealthCore public/care-request routes, protected Backoffice, domain lab, and separate Talent Tracker module. Root `npm run serve:website` starts this app locally.

The HealthCore backend is documented in [`../services/healthcore-api/README.md`](../services/healthcore-api/README.md). See [the Spanish index](./README.es.md) for the same overview.
