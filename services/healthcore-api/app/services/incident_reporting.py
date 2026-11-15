"""Shared aggregate formatting for CLI and HTTP exports."""
import csv
import io
from app.schemas.incidents import AnalysisExportRow, AnalysisResult


def percentage(count: int, total: int) -> float:
    return round(count * 100 / total, 1) if total else 0.0


def export_rows(report: AnalysisResult) -> list[AnalysisExportRow]:
    rows = [AnalysisExportRow(metric=name, value=getattr(report, name)) for name in (
        "total_records", "valid_records", "invalid_records", "closed_with_valid_satisfaction", "average_satisfaction"
    )]
    for group, total in (("categories", report.valid_records), ("statuses", report.valid_records),
                         ("countries", report.valid_records), ("satisfaction_distribution", report.closed_with_valid_satisfaction)):
        for label, count in getattr(report, group).items():
            rows.append(AnalysisExportRow(metric=f"{group}.{label}", value=count, percentage=percentage(count, total)))
    rows.extend(AnalysisExportRow(metric=f"invalid_breakdown.{rule}", value=count)
                for rule, count in report.invalid_breakdown.by_rule.items())
    return rows


def export_csv(report: AnalysisResult) -> str:
    buffer = io.StringIO(newline="")
    writer = csv.writer(buffer)
    writer.writerow(["metric", "value", "percentage"])
    writer.writerows((row.metric, row.value, row.percentage) for row in export_rows(report))
    return buffer.getvalue()


def console_report(report: AnalysisResult) -> str:
    lines = ["=" * 64, "HEALTHCORE — PATIENT INCIDENT REPORT ANALYSIS", "=" * 64,
             f"TOTAL RECORDS IN FILE .......... {report.total_records}",
             f"  Valid records ............... {report.valid_records}",
             f"  Invalid / incomplete ........ {report.invalid_records}", "", "INVALID RECORDS BREAKDOWN"]
    for rule, count in report.invalid_breakdown.by_rule.items():
        lines.append(f"  {rule:<40} {count:>8}")
    if not report.invalid_records:
        lines.append("  None")
    lines.append("  Rules may overlap; each invalid record counts once.")
    for group in ("category", "status", "country"):
        values = getattr(report, {"category": "categories", "status": "statuses", "country": "countries"}[group])
        lines.extend(["", f"BREAKDOWN BY {group.upper()} (valid records)"])
        lines.extend(f"  {name:<32} {count:>8}  ({percentage(count, report.valid_records):.1f}%)" for name, count in values.items())
    average = f"{report.average_satisfaction:.2f} / 5.00" if report.average_satisfaction is not None else "N/A"
    lines.extend(["", "SATISFACTION INDEX (closed cases)",
                  f"  Scored cases: {report.closed_with_valid_satisfaction} of {report.statuses['CLOSED']}", f"  Average score: {average}"])
    lines.extend(f"  Score {score:<26} {count:>8}  ({percentage(count, report.closed_with_valid_satisfaction):.1f}%)"
                 for score, count in report.satisfaction_distribution.items())
    return "\n".join(lines)
