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
    if args.max_bytes < 1:
        print("Analysis error: invalid_size_limit", file=sys.stderr)
        return 2
    try:
        with args.csv_path.open("rb") as source:
            report = analyze_incident_stream(source, max_bytes=args.max_bytes)
    except FileNotFoundError:
        print("Analysis error: input_missing. Provide an existing CSV file.", file=sys.stderr)
        return 2
    except OSError:
        print("Analysis error: input_read_failed. Check the CSV permissions.", file=sys.stderr)
        return 2
    except ValueError as error:
        safe_codes = {"file_too_large", "invalid_encoding", "invalid_csv", "invalid_headers", "empty_file"}
        code = str(error) if str(error) in safe_codes else "invalid_input"
        print(f"Analysis error: {code}", file=sys.stderr)
        return 2

    print(report.model_dump_json(indent=2) if args.json else console_report(report))
    target = args.export
    if target is None and not args.no_prompt and not args.json and sys.stdin.isatty():
        try:
            answer = input("¿Deseas exportar los resultados a CSV? [s / n] ").strip().lower()
        except EOFError:
            answer = "n"
        if answer == "s":
            target = Path("results.csv")
    if target is None:
        return 0

    try:
        output = target.open("x", encoding="utf-8", newline="")
    except FileExistsError:
        print("Analysis error: export_exists. Choose a new destination.", file=sys.stderr)
        return 2
    except OSError:
        print("Analysis error: export_write_failed. Check the destination and permissions.", file=sys.stderr)
        return 2
    try:
        with output:
            output.write(export_csv(report))
    except (OSError, ValueError):
        try:
            target.unlink()
        except OSError:
            pass
        print("Analysis error: export_write_failed. Check the destination and available space.", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
