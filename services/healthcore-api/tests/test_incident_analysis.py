"""Dataset, validation, streaming, and privacy regression tests."""
import csv
import io
import subprocess
import sys
from pathlib import Path

import pytest
from app.services.incident_analysis import analyze_incident_stream, analyze_incident_text

ROOT = Path(__file__).resolve().parents[3]
HEADER = "incident_id,date,clinic_id,country,category,description,status,patient_id,satisfaction_score\n"
ROW = ["HC-900001", "2024-01-13", "US-TX-01", "US", "ADMINISTRATIVE", "Synthetic café narrative", "CLOSED", "PAT-900001", "3"]


def content(*rows):
    buffer = io.StringIO()
    buffer.write(HEADER)
    csv.writer(buffer).writerows(rows)
    return buffer.getvalue()


def test_canonical_dataset():
    with (ROOT / "scripts/incidents-healthcore.csv").open("rb") as source:
        report = analyze_incident_stream(source)
    assert (report.total_records, report.valid_records, report.invalid_records) == (100, 94, 6)
    assert report.categories == {"APPOINTMENT": 30, "BILLING": 20, "CLINICAL_CARE": 14, "ACCESSIBILITY": 17, "ADMINISTRATIVE": 13}
    assert report.statuses == {"OPEN": 28, "CLOSED": 52, "DISCARDED": 14}
    assert report.countries == {"US": 61, "UK": 33}
    assert report.closed_with_valid_satisfaction == 52
    assert report.average_satisfaction == 3.58
    assert len(report.invalid_breakdown.by_rule) == 6
    assert set(report.invalid_breakdown.by_rule.values()) == {1}


def test_deterministic_aggregates_and_no_source_values():
    report = analyze_incident_text(content(ROW))
    assert report == analyze_incident_text(content(ROW))
    assert report.valid_records == 1
    for sensitive in (ROW[0], ROW[5], ROW[7]):
        assert sensitive not in report.model_dump_json()


@pytest.mark.parametrize("column,value,rule", [
    (0, "bad-id", "invalid_or_missing_incident_id"),
    (1, "2024-02-30", "invalid_date"),
    (2, "unknown", "invalid_or_missing_clinic"),
    (3, "UK", "country_clinic_mismatch"),
    (3, "XX", "invalid_country"),
    (4, "OTHER", "invalid_or_missing_category"),
    (5, " ", "invalid_description"),
    (6, "UNKNOWN", "invalid_status"),
    (7, "", "invalid_or_missing_patient_id"),
    (8, "", "closed_without_satisfaction_score"),
    (8, "6", "invalid_satisfaction_score"),
    (8, "3.0", "invalid_satisfaction_score"),
])
def test_validation_rules(column, value, rule):
    row = ROW.copy()
    row[column] = value
    result = analyze_incident_text(content(row))
    assert result.invalid_records == 1
    assert result.invalid_breakdown.by_rule[rule] == 1


def test_duplicate_ids_are_normalized_before_counting():
    duplicate = ROW.copy()
    duplicate[0] = " HC-900001 "
    result = analyze_incident_text(content(ROW, duplicate))
    assert (result.valid_records, result.invalid_records) == (1, 1)
    assert result.invalid_breakdown.by_rule == {"duplicate_incident_id": 1}


def test_scores_only_count_closed_valid_incidents():
    opened = ROW.copy()
    opened[0], opened[6], opened[8] = "HC-000002", "OPEN", "5"
    result = analyze_incident_text(content(ROW, opened))
    assert result.valid_records == 2
    assert result.closed_with_valid_satisfaction == 1
    assert result.average_satisfaction == 3
    opened[8] = ""
    result = analyze_incident_text(content(opened))
    assert result.average_satisfaction is None


@pytest.mark.parametrize("data,code", [("", "empty_file"), ("private-header,other\nprivate,value", "invalid_headers"), (HEADER + '"unterminated', "invalid_csv")])
def test_malformed_input_returns_safe_code(data, code):
    with pytest.raises(ValueError, match=f"^{code}$"):
        analyze_incident_text(data)


@pytest.mark.parametrize("row", [ROW[:-1], ROW + ["extra"]])
def test_malformed_row_is_counted(row):
    assert analyze_incident_text(content(row)).invalid_breakdown.by_rule["invalid_record_structure"] == 1


def test_size_limit_and_encoding():
    with pytest.raises(ValueError, match="^file_too_large$"):
        analyze_incident_stream(io.BytesIO(content(ROW).encode()), max_bytes=32)
    with pytest.raises(ValueError, match="^invalid_encoding$"):
        analyze_incident_stream(io.BytesIO(b"incident_id,\xff"))


def test_chunk_boundaries_bom_and_multiline_csv():
    class ChunkedStream(io.BytesIO):
        def read(self, size=-1):
            return super().read(1)
    row = ROW.copy()
    row[5] = 'Synthetic café, with "quotes"\nand a new line'
    assert analyze_incident_stream(ChunkedStream(("\ufeff" + content(row)).encode())).valid_records == 1


def test_rows_after_diagnostic_limit_are_counted():
    invalid = ROW.copy()
    invalid[0], invalid[1] = "bad-id", "bad-date"
    result = analyze_incident_text(content(*([invalid] * 150), ROW))
    assert (result.total_records, result.invalid_records, result.valid_records) == (151, 150, 1)
    assert result.invalid_breakdown.diagnostic_limit == 100
    assert result.invalid_breakdown.by_rule["invalid_date"] == 150


def test_cli_reports_invalid_rows_without_traceback():
    result = subprocess.run([sys.executable, str(ROOT / "scripts/analyze.py"), str(ROOT / "scripts/incidents-healthcore.csv"), "--json"], capture_output=True, text=True)
    assert result.returncode == 0
    assert '"valid_records": 94' in result.stdout
    assert result.stderr == ""


def test_multiple_field_and_cross_field_errors_are_all_counted():
    row = ROW.copy()
    row[3], row[4], row[7], row[8] = "UK", "BAD", "", ""
    report = analyze_incident_text(content(row))
    assert report.invalid_records == 1
    assert report.invalid_breakdown.by_rule == {
        "country_clinic_mismatch": 1, "invalid_or_missing_category": 1,
        "invalid_or_missing_patient_id": 1, "closed_without_satisfaction_score": 1,
    }


@pytest.mark.parametrize("score", ["0", "6", "-1", "2.5", "abc", True, 1.5])
def test_pydantic_rejects_invalid_scores(score):
    from pydantic import ValidationError
    from app.schemas.incidents import IncidentRecord
    row = dict(zip(HEADER.strip().split(","), ROW))
    row["satisfaction_score"] = score
    with pytest.raises(ValidationError):
        IncidentRecord.model_validate(row)


@pytest.mark.parametrize("field", HEADER.strip().split(",")[:-1])
def test_pydantic_requires_fields(field):
    from pydantic import ValidationError
    from app.schemas.incidents import IncidentRecord
    row = dict(zip(HEADER.strip().split(","), ROW))
    del row[field]
    with pytest.raises(ValidationError):
        IncidentRecord.model_validate(row)


def test_pydantic_optional_score_and_valid_record():
    from app.schemas.incidents import IncidentRecord
    row = dict(zip(HEADER.strip().split(","), ROW))
    assert IncidentRecord.model_validate(row).satisfaction_score == 3
    row["status"] = "OPEN"
    del row["satisfaction_score"]
    assert IncidentRecord.model_validate(row).satisfaction_score is None


def test_large_synthetic_dataset():
    class GeneratedRows:
        def __init__(self):
            self.rows = iter([HEADER.encode()])
            self.index = 0
        def read(self, size):
            if self.index == 0:
                self.index += 1
                return HEADER.encode()
            if self.index > 100_000:
                return b""
            row = ROW.copy()
            row[0] = f"HC-{self.index:06d}"
            self.index += 1
            return (",".join(row) + "\n").encode()
    report = analyze_incident_stream(GeneratedRows())
    assert (report.total_records, report.valid_records, report.invalid_records) == (100_000, 100_000, 0)


def test_cli_report_export_and_privacy(tmp_path):
    from app.services.incident_reporting import export_csv
    sentinel = "SYNTHETIC_PRIVATE_SENTINEL"
    row = ROW.copy()
    row[0], row[5], row[7] = sentinel, sentinel, sentinel
    source, output = tmp_path / "input.csv", tmp_path / "results.csv"
    source.write_text(content(row))
    process = subprocess.run([sys.executable, str(ROOT / "scripts/analyze.py"), str(source), "--export", str(output)], capture_output=True, text=True)
    assert process.returncode == 0
    assert sentinel not in process.stdout + process.stderr + output.read_text()
    assert output.read_bytes().decode() == export_csv(analyze_incident_text(content(row)))
    for title in ("TOTAL RECORDS", "INVALID RECORDS BREAKDOWN", "BREAKDOWN BY CATEGORY", "BREAKDOWN BY STATUS", "BREAKDOWN BY COUNTRY", "SATISFACTION INDEX"):
        assert title in process.stdout
    again = subprocess.run([sys.executable, str(ROOT / "scripts/analyze.py"), str(source), "--export", str(source)], capture_output=True, text=True)
    assert again.returncode == 2
    assert source.read_text() == content(row).replace("\r\n", "\n")


def test_cli_interactive_export(tmp_path, monkeypatch, capsys):
    import importlib.util
    spec = importlib.util.spec_from_file_location("cli", ROOT / "scripts/analyze.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    source = tmp_path / "input.csv"
    source.write_text(content(ROW))
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(sys, "argv", ["analyze.py", str(source)])
    monkeypatch.setattr(sys.stdin, "isatty", lambda: True)
    prompts = []
    monkeypatch.setattr("builtins.input", lambda prompt: prompts.append(prompt) or "s")
    assert module.main() == 0
    assert prompts == ["¿Deseas exportar los resultados a CSV? [s / n] "]
    assert (tmp_path / "results.csv").is_file()
