"""Streaming, privacy-conscious HealthCore CSV validation and aggregation."""

from __future__ import annotations

import codecs
import csv
import hashlib
import io
import re
from collections import Counter
from typing import BinaryIO, Iterable, TextIO

from pydantic import ValidationError

from app.schemas.incidents import (
    INCIDENT_CATEGORIES,
    INCIDENT_STATUSES,
    INVALID_RULES,
    AnalysisResult,
    IncidentRecord,
    ValidationSummary,
)

REQUIRED_COLUMNS = (
    "incident_id", "date", "clinic_id", "country", "category", "description",
    "status", "patient_id", "satisfaction_score",
)
MAX_DIAGNOSTICS = 100
ERROR_MAP = {
    "incident_id_invalid": "invalid_or_missing_incident_id",
    "date_invalid": "invalid_date",
    "clinic_invalid": "invalid_or_missing_clinic",
    "country_clinic_mismatch": "country_clinic_mismatch",
    "country_invalid": "invalid_country",
    "category_invalid": "invalid_or_missing_category",
    "description_invalid": "invalid_description",
    "status_invalid": "invalid_status",
    "patient_id_invalid": "invalid_or_missing_patient_id",
    "closed_without_satisfaction_score": "closed_without_satisfaction_score",
    "satisfaction_score_invalid": "invalid_satisfaction_score",
}
FIELD_MAP = {
    "incident_id": "invalid_or_missing_incident_id", "date": "invalid_date",
    "clinic_id": "invalid_or_missing_clinic", "country": "invalid_country",
    "category": "invalid_or_missing_category", "description": "invalid_description",
    "status": "invalid_status", "patient_id": "invalid_or_missing_patient_id",
    "satisfaction_score": "invalid_satisfaction_score",
}


def analyze_incident_stream(source: BinaryIO, *, max_bytes: int = 25_000_000) -> AnalysisResult:
    """Read and validate UTF-8 CSV incrementally, discarding raw records immediately."""
    text = _IncrementalTextStream(source, max_bytes)
    return _analyze_reader(text)


def analyze_incident_text(content: str) -> AnalysisResult:
    """Convenience entry point for small synthetic test inputs."""
    return analyze_incident_stream(io.BytesIO(content.encode("utf-8")))


class _IncrementalTextStream(io.TextIOBase):
    """Decode CSV incrementally and enforce the maximum upload size."""

    def __init__(self, source: BinaryIO, max_bytes: int) -> None:
        self._source = source
        self._max_bytes = max_bytes
        self._bytes_read = 0
        self._buffer = ""
        self._decoder = codecs.getincrementaldecoder("utf-8-sig")("strict")

    def readable(self) -> bool:
        return True

    def __iter__(self) -> Iterable[str]:
        while True:
            chunk = self._source.read(64 * 1024)
            if not chunk:
                break
            self._bytes_read += len(chunk)
            if self._bytes_read > self._max_bytes:
                raise ValueError("file_too_large")
            try:
                self._buffer += self._decoder.decode(chunk)
            except UnicodeDecodeError as exc:
                raise ValueError("invalid_encoding") from exc
            while "\n" in self._buffer:
                line, self._buffer = self._buffer.split("\n", 1)
                yield line + "\n"
        try:
            self._buffer += self._decoder.decode(b"", final=True)
        except UnicodeDecodeError as exc:
            raise ValueError("invalid_encoding") from exc
        if self._buffer:
            yield self._buffer


def _analyze_reader(source: TextIO) -> AnalysisResult:
    total_records = valid_records = invalid_records = diagnostic_count = 0
    invalid_by_rule: Counter[str] = Counter()
    categories: Counter[str] = Counter()
    statuses: Counter[str] = Counter()
    countries: Counter[str] = Counter()
    satisfaction: Counter[int] = Counter()
    seen_ids: set[bytes] = set()
    try:
        reader = csv.DictReader(source, strict=True)
        headers = reader.fieldnames
        if headers is None:
            raise ValueError("empty_file")
        if len(headers) != len(REQUIRED_COLUMNS) or len(set(headers)) != len(headers) or set(headers) != set(REQUIRED_COLUMNS):
            raise ValueError("invalid_headers")

        for raw in reader:
            total_records += 1
            row_rules: set[str] = set()
            row = {key: value for key, value in raw.items() if key is not None}
            if None in raw or any(value is None for value in raw.values()):
                row_rules.add("invalid_record_structure")
            identifier = row.get("incident_id") or ""
            if re.fullmatch(r"HC-\d{6}", identifier):
                digest = hashlib.sha256(identifier.encode("utf-8")).digest()
                if digest in seen_ids:
                    row_rules.add("duplicate_incident_id")
                else:
                    seen_ids.add(digest)
            try:
                incident = IncidentRecord.model_validate(row)
            except ValidationError as exc:
                errors = exc.errors(include_input=False, include_context=False)
                error_types = {error["type"] for error in errors}
                for error in errors:
                    code = ERROR_MAP.get(error["type"])
                    if code is None:
                        location = error.get("loc", ())
                        code = FIELD_MAP.get(str(location[0])) if location else None
                    row_rules.add(code or "invalid_record_structure")
                if "country_clinic_mismatch" in error_types:
                    row_rules.add("country_clinic_mismatch")
                if "closed_without_satisfaction_score" in error_types:
                    row_rules.add("closed_without_satisfaction_score")
                incident = None

            if row_rules:
                invalid_records += 1
                for rule in row_rules:
                    invalid_by_rule[rule] += 1
                diagnostic_count += 1
                continue

            assert incident is not None
            valid_records += 1
            categories[incident.category] += 1
            statuses[incident.status] += 1
            countries[incident.country] += 1
            if incident.satisfaction_score is not None:
                satisfaction[incident.satisfaction_score] += 1
    except csv.Error as exc:
        raise ValueError("invalid_csv") from exc
    except UnicodeError as exc:
        raise ValueError("invalid_encoding") from exc

    score_count = sum(satisfaction.values())
    average = round(sum(score * count for score, count in satisfaction.items()) / score_count, 2) if score_count else None
    return AnalysisResult(
        total_records=total_records,
        valid_records=valid_records,
        invalid_records=invalid_records,
        categories={key: categories[key] for key in INCIDENT_CATEGORIES if categories[key]},
        statuses={key: statuses[key] for key in INCIDENT_STATUSES if statuses[key]},
        countries={key: countries[key] for key in ("US", "UK") if countries[key]},
        satisfaction_distribution={key: satisfaction[key] for key in range(1, 6) if satisfaction[key]},
        closed_with_valid_satisfaction=sum(satisfaction.values()),
        average_satisfaction=average,
        invalid_breakdown=ValidationSummary(
            invalid_records=invalid_records,
            by_rule={key: invalid_by_rule[key] for key in INVALID_RULES if invalid_by_rule[key]},
            diagnostic_limit=min(diagnostic_count, MAX_DIAGNOSTICS),
        ),
    )
