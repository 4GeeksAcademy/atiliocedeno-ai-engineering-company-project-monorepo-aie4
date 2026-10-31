#!/usr/bin/env python3
"""Analyze a de-identified HealthCore incident CSV without exporting source rows."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[1] / "services" / "healthcore-api"
sys.path.insert(0, str(SERVICE_ROOT))

from app.services.incident_analysis import analyze_incident_stream  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv_path", type=Path, help="Path to a de-identified CSV file")
    args = parser.parse_args()
    try:
        with args.csv_path.open("rb") as source:
            report = analyze_incident_stream(source)
    except (OSError, ValueError) as exc:
        # Do not echo exception details: parser errors may contain patient-entered text.
        code = str(exc) if str(exc) in {"file_too_large", "invalid_encoding", "invalid_csv"} else "input_error"
        print(json.dumps({"error": code}), file=sys.stderr)
        return 2
    print(report.model_dump_json(indent=2))
    return 0 if not report.issues else 1


if __name__ == "__main__":
    raise SystemExit(main())
