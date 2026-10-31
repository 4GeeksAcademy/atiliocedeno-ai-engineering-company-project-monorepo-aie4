# `scripts` folder

This folder contains **helper scripts** for the monorepo: development automation, maintenance utilities, repetitive tasks (setup, lint, migrations, data generation, etc.), and internal tooling.

- **Main purpose**: group support tools that do not belong to a specific app, agent, or pipeline but make the team’s work easier.
- **Recommendation**: document each script (what it does, parameters, requirements, usage examples) and keep them reproducible (and safe) across environments.

> _Spanish version: [README.es.md](./README.es.md)._

## Incident analysis CLI

Run `python scripts/analyze.py incidents-healthcore.csv` from the repository root with the backend dependencies installed. The root CSV is a relative symlink to the existing dataset under `scripts/`; its contents are unchanged. Any CSV path is accepted. Use `--no-prompt` for automation, `--json` for aggregate JSON, or `--export /new/path/results.csv` for aggregate CSV. Interactive execution offers export to `results.csv`; existing files are never overwritten. Exit 0 means completed analysis (including invalid rows); exit 2 indicates an operational error. See the backend README for rules and privacy limitations.
