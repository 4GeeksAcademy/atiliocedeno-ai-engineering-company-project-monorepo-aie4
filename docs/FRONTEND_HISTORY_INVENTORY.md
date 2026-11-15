# Frontend migration and retained compatibility

Updated: 2026-11-05. The active user-facing frontend is the Next.js application at `uis/talent-pipeline-tracker/`.

## Active routes and responsibilities

| Next route / area | Responsibility |
| --- | --- |
| `/`, `/en` | Bilingual HealthCore public landing pages. |
| `/care-request`, `/en/care-request` | Localized care-request forms. |
| `/backoffice` | Authenticated incident-analysis workspace; CSV analysis and aggregate export are processed by HealthCore FastAPI. |
| `/domain-lab` | Interactive interface for shared TypeScript domain utilities formerly exercised by an unbundled static panel. |
| `/login`, `/profile`, `/dashboard`, `/talents` | Authentication/profile/dashboard and the separate Talent Tracker functionality. |

## Retired static implementations

Removed as part of the explicit frontend consolidation:

- Root public pages `index.html`, `index.en.html`, `style.css`, and `validation.js`.
- Static bilingual site and assets under `uis/website/`.
- Public HTML landing copies and stylesheet under `uis/talent-pipeline-tracker/public/`.
- Unbundled `src/index_test.html`; its TypeScript domain utilities remain and are exercised through `/domain-lab`.
- Static Backoffice entry `uis/backoffice/index.html` and static website server `scripts/serve-website.mjs`.

Old URLs remain supported by permanent redirects in `uis/talent-pipeline-tracker/next.config.ts`: legacy English/Spanish public index and care-request paths route to their localized Next pages. This preserves navigation compatibility, not a standalone HTML hosting contract. External or academic hosting consumers could not be assessed from repository references.

## Code and backend boundaries

- Native Next UI does not replace HealthCore API analysis: authenticated CSV processing and aggregate export remain server-side.
- Login/session protection is enforced by the existing Next route proxy. Check the proxy and route tests whenever changing Backoffice access requirements.
- `src/types/` and `src/utils/` remain shared source utilities; generated `dist/index_test.js` was not present and no longer has an HTML consumer.
- The former `uis/backoffice` package remains only for the replacement source-contract suite and migration artifacts; tests pass 5/5 but are not browser/runtime coverage. Its unreferenced `incidents.js` and `style.css` remain pending an explicit cleanup decision.

## Validation guidance

Run portal tests, `npm run typecheck`, and `npm run build` from `uis/talent-pipeline-tracker`. Exercise the four public routes, legacy redirects, and both anonymous/authenticated Backoffice access. Verify API-backed analysis only with the documented synthetic/test data setup. No external static-hosting contract or production deployment has been verified.
