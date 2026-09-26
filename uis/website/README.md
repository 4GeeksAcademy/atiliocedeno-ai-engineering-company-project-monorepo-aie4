# HealthCore Website

Public-facing HealthCore website for Milestone 4. This application intentionally keeps the previous Milestone 1 static experience separate from internal backoffice tools and services.

## Stack

- Semantic HTML5
- Tailwind CSS v4 via the browser CDN
- Vanilla JavaScript for care-request form validation and clinic selection
- No backend API or patient-data persistence is implemented here

## Routes

- `index.html` — Spanish public landing page
- `index.en.html` — English public landing page
- `aplication.html` — Spanish care-request form
- `aplication.en.html` — English care-request form

When served from this application, `index.html` is the public `/` entry point.

## Run locally

From the repository root, run a static server with any available local tool, for example:

```bash
python3 -m http.server 4173 --directory uis/website
```

Then open <http://localhost:4173/>. The website uses Tailwind's browser CDN, so an internet connection is required for the utility classes to load during local development.

## Validation

The application is a static HTML/JavaScript site and does not currently define package-local `build`, `typecheck`, `lint`, or test scripts. Validate it by serving `uis/website`, opening `/`, checking the language and care-form links, and reviewing the browser console for errors.

## Content and boundaries

Business content is based on `CONTEXT.md`. The migrated landing content preserves the existing HealthCore identity, bilingual routes, clinic coverage, HIPAA/UK GDPR messaging, department cards, company metrics, and care-request flow. Do not add internal operational data or protected patient information to this public application.
