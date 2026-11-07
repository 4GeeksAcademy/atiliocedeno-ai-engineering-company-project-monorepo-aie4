# Frontend boundaries

## Scope

These rules apply to frontend work under `uis/` and to any shared UI code used by those applications.

## Placement

- Put user-facing interfaces in `uis/`.
- Keep the active public HealthCore experience, protected Backoffice, and domain lab in `uis/talent-pipeline-tracker` (the unified Next.js frontend).
- Do not add frontend application code to `services/`, `agents/`, `skills/`, `data/`, or the repository root.
- Place reusable contracts, SDKs, and UI libraries in `packages/` only when they are genuinely shared by more than one consumer.

## Application boundaries

- Preserve the separation between public pages and authenticated internal Backoffice capabilities, even though both are routes in the same Next.js application.
- Before creating a new application, inspect the relevant folder README and reuse an existing application when the responsibility already belongs there.
- Each application must keep its own README with its purpose, stack, setup, and validation commands.
- Keep bilingual routes and content synchronized when an existing application supports Spanish and English.
- Treat retired static HTML deliverables as historical only; do not recreate separate static frontends without an explicit product decision. Preserve the Next legacy redirects unless compatibility requirements change.

## Data and integration boundaries

- Frontends should consume documented service contracts. Do not invent endpoints, fields, authentication, or environment variables.
- Backend APIs and background workers belong in `services/`; data pipelines belong in `data/`.
- Do not expose protected patient data in client-side logs, static assets, URLs, or public application state.
- Treat HIPAA and UK GDPR as design constraints for any patient-related interface. Minimize displayed data and preserve existing access-control assumptions.
- Maintain tolerance for external API responses when existing technical documentation identifies non-standard or aliased fields.

## Change discipline

- Reuse existing components, types, and utilities before adding duplicates.
- Keep changes limited to the requested application and its documented dependencies.
- Validate the affected application with the commands documented in its README or package metadata.
