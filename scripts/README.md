# `scripts` folder

This folder contains **helper scripts** for the monorepo: development automation, maintenance utilities, repetitive tasks (setup, lint, migrations, data generation, etc.), and internal tooling.

- **Main purpose**: group support tools that do not belong to a specific app, agent, or pipeline but make the team’s work easier.
- **Recommendation**: document each script (what it does, parameters, requirements, usage examples) and keep them reproducible (and safe) across environments.

> _Spanish version: [README.es.md](./README.es.md)._

## Incident analysis CLI

From the repository root, run `python scripts/analyze.py scripts/incidents-healthcore.csv` with the backend dependencies installed. The tracked dataset has one canonical location under `scripts/`. For compatibility, the root-relative invocation `python scripts/analyze.py incidents-healthcore.csv` also works through a relative symlink to that canonical file; do not create or edit a second copy. Any CSV path is accepted. Use `--no-prompt` for automation, `--json` for aggregate JSON, or `--export /new/path/results.csv` for aggregate CSV. Interactive execution offers export to `results.csv`; existing files are never overwritten. Exit 0 means completed analysis (including invalid rows); exit 2 indicates an operational error. See the backend README for rules and privacy limitations.

## Incident history seed

From the repository root, run:

```bash
python scripts/seed_incidents.py
```

Use `--csv /path/to/incidents.csv` to select another historical CSV and `--db /path/to/healthcore.json` to select a temporary database. The seed validates each row with `IncidentRecord`, transforms valid rows, and stores each generated ticket with an internal `_import_key` in the `incidents` table. Existing keys are skipped without updating existing tickets, so manual status and ID changes are preserved across executions.
