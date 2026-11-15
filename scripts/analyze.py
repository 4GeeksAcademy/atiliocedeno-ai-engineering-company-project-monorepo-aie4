#!/usr/bin/env python3
"""Analyze HealthCore CSV locally; print/export aggregates only."""
import argparse
import sys
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[1] / "services" / "healthcore-api"
sys.path.insert(0, str(SERVICE_ROOT))
from app.services.incident_analysis import analyze_incident_stream  # noqa: E402
from app.services.incident_reporting import console_report, export_csv  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv_path", type=Path)
    parser.add_argument("--export", type=Path, metavar="PATH", help="Save aggregate CSV without prompting")
    parser.add_argument("--no-prompt", action="store_true")
    parser.add_argument("--json", action="store_true", help="Machine-readable aggregate output")
    parser.add_argument("--max-bytes", type=int, default=25_000_000, help="Maximum input bytes (default: 25000000)")
    args = parser.parse_args()
    try:
        if args.max_bytes < 1:
            raise ValueError("invalid_size_limit")
        with args.csv_path.open("rb") as source:
            report = analyze_incident_stream(source, max_bytes=args.max_bytes)
        print(report.model_dump_json(indent=2) if args.json else console_report(report))
        target = args.export
        if target is None and not args.no_prompt and not args.json and sys.stdin.isatty():
            try:
                answer = input("¿Deseas exportar los resultados a CSV? [s / n] ").strip().lower()
            except EOFError:
                answer = "n"
            if answer == "s":
                target = Path("results.csv")
        if target:
            # Exclusive creation protects the original dataset and existing reports.
            with target.open("x", encoding="utf-8", newline="") as output:
                output.write(export_csv(report))
        return 0
    except (OSError, ValueError) as exc:
        safe_codes = {"file_too_large", "invalid_encoding", "invalid_csv", "invalid_headers", "empty_file", "invalid_size_limit"}
        code = str(exc) if str(exc) in safe_codes else "file_operation_failed"
        print(f"Analysis error: {code}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
