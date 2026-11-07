# HealthCore Backoffice

The active, authenticated Backoffice is the native Next.js route `/backoffice` in [`../talent-pipeline-tracker/`](../talent-pipeline-tracker/). This directory contains its Node.js source-contract tests only; it is not a separate frontend and does not need its own development server.

## Sidebar navigation

- **Operations / Operaciones** scrolls to the operations snapshot on the Backoffice page.
- **People & workforce / Personas y equipo** opens the existing `/talents` Talent Pipeline feature. It is not an HR staff directory.
- **Digital priorities / Prioridades digitales** scrolls to the priorities panel (privacy-by-design and other product priorities).
- **Incident analysis / Análisis de incidentes** scrolls to the CSV analysis form and results.

The workspace snapshot, counts, rates, and priorities are illustrative content, not live clinic/business data. Incident analysis is the operational feature: the UI sends CSVs through the same-origin `/api/healthcore` proxy to FastAPI and can download aggregate results. Authentication and route protection remain in the portal; the backend validates and analyzes the data. Do not use this prototype with real patient data. See the [HealthCore API README](../../services/healthcore-api/README.md) for privacy, persistence, and compliance limitations.

## Validation

Run the source-contract tests from the repository root:

```bash
npm --prefix uis/backoffice test
```

For the app typecheck and production build, see [`../talent-pipeline-tracker/README.md`](../talent-pipeline-tracker/README.md).
