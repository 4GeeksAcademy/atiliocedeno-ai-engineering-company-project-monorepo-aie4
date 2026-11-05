# User interfaces

This folder contains separate applications; their HTML, routes, and histories are not interchangeable.

- [`website/`](./website/README.md) — retained static bilingual HealthCore site and compatibility/evaluation source. The current public routes are implemented in the existing Next.js app under `talent-pipeline-tracker/`; the root `npm run serve:website` remains available for the static copy.
- [`backoffice/`](./backoffice/README.md) — existing static incident-analysis client for the HealthCore API.
- [`talent-pipeline-tracker/`](./talent-pipeline-tracker/) — Next.js app with HealthCore public routes and a separate Talent Tracker module. The static HTML server remains independent and does not replace or alter these routes.

The HealthCore backend is documented in [`../services/healthcore-api/README.md`](../services/healthcore-api/README.md). See [the Spanish index](./README.es.md) for the same overview.
