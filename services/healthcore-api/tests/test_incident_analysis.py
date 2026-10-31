"""Privacy and behavior regression tests for incident analysis."""

from __future__ import annotations

import io
import sys
from pathlib import Path

import pytest

SERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

from app.services.incident_analysis import analyze_incident_stream, analyze_incident_text  # noqa: E402

HEADER = "incident_id,incident_date,clinic,category,severity,status,description\n"


def test_aggregates_valid_deidentified_rows_deterministically() -> None:
    csv_text = HEADER + "INC-1,2025-03-01,Austin,fall,moderate,open,synthetic description\n"
    first = analyze_incident_text(csv_text)
    second = analyze_incident_text(csv_text)

    assert first.valid_rows == 1
    assert first.invalid_rows == 0
    assert first.by_category == {"fall": 1}
    assert first.by_clinic == {"Austin": 1}
    assert first.model_dump() == second.model_dump()


def test_duplicate_identifier_is_counted_without_echoing_identifier_or_description() -> None:
    secret_id = "DO_NOT_EXPOSE_01928"
    secret_description = "PATIENT NAME Alice Example and private details"
    csv_text = HEADER + (
        f"{secret_id},2025-03-01,Austin,fall,moderate,open,{secret_description}\n"
        f"{secret_id},2025-03-02,Austin,fall,moderate,open,{secret_description}\n"
    )

    report_text = analyze_incident_text(csv_text).model_dump_json()

    assert "duplicate_incident_id" in report_text
    assert "row\":3" in report_text
    assert secret_id not in report_text
    assert secret_description not in report_text


def test_bad_row_diagnostics_only_return_safe_code_and_row_number() -> None:
    secret_id = "SENSITIVE-IDENTIFIER"
    secret_description = "Sensitive patient narrative"
    csv_text = HEADER + f"{secret_id},not-a-date,Austin,fall,urgent,open,{secret_description}\n"

    report_text = analyze_incident_text(csv_text).model_dump_json()

    assert "invalid_row" in report_text
    assert secret_id not in report_text
    assert secret_description not in report_text


def test_missing_columns_report_does_not_echo_header_values() -> None:
    report_text = analyze_incident_text("unique-patient-label,free-text\nsecret,private note\n").model_dump_json()

    assert "missing_columns" in report_text
    assert "unique-patient-label" not in report_text
    assert "private note" not in report_text


def test_stream_enforces_size_limit() -> None:
    with pytest.raises(ValueError, match="^file_too_large$"):
        analyze_incident_stream(io.BytesIO((HEADER + "x" * 64).encode()), max_bytes=32)


def test_invalid_utf8_raises_only_safe_code() -> None:
    with pytest.raises(ValueError, match="^invalid_encoding$"):
        analyze_incident_stream(io.BytesIO(b"incident_id,\xff"))


def test_utf8_character_split_at_stream_chunk_boundary_decodes_correctly() -> None:
    class ChunkedStream(io.BytesIO):
        def read(self, size: int = -1) -> bytes:
            return super().read(17 if size < 0 else min(size, 17))

    csv_text = HEADER + "INC-9,2025-03-01,Montréal,fall,low,closed,synthetic café\n"
    report = analyze_incident_stream(ChunkedStream(csv_text.encode("utf-8")))

    assert report.valid_rows == 1
    assert report.by_clinic == {"Montréal": 1}


def test_issue_list_is_bounded_for_large_invalid_file() -> None:
    rows = "".join(f"INC-{index},bad-date,Clinic,fall,low,open,synthetic\n" for index in range(150))
    report = analyze_incident_text(HEADER + rows)

    assert report.invalid_rows == 150
    assert len(report.issues) == 100


def test_rows_after_diagnostic_limit_are_still_validated_and_counted() -> None:
    invalid_rows = "".join(
        f"INC-BAD-{index},bad-date,Clinic,fall,low,open,synthetic\n"
        for index in range(100)
    )
    csv_text = (
        HEADER
        + invalid_rows
        + "INC-VALID-101,2025-03-01,Clinic,fall,low,open,synthetic\n"
    )

    report = analyze_incident_text(csv_text)

    assert report.total_rows == 101
    assert report.invalid_rows == 100
    assert report.valid_rows == 1
    assert len(report.issues) == 100