"""Pydantic v2 domain and response models for HealthCore incident analysis."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

# The service runs both from its own directory and from repository-root tests.
_REPOSITORY_ROOT = Path(__file__).resolve().parents[4]
if str(_REPOSITORY_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPOSITORY_ROOT))

from packages.shared.incident_record import (  # noqa: E402
    CLINIC_COUNTRIES,
    INCIDENT_CATEGORIES,
    INCIDENT_STATUSES,
    INVALID_RULES,
    IncidentRecord,
)


class ValidationSummary(BaseModel):
    """Aggregate invalid-record and per-rule counts; contains no source values."""

    model_config = ConfigDict(extra="forbid")

    invalid_records: int = Field(ge=0)
    by_rule: dict[str, int]
    diagnostic_limit: int = Field(ge=0)


class SatisfactionSummary(BaseModel):
    """Statistics from valid CLOSED incidents only."""

    satisfaction_distribution: dict[int, int]
    closed_with_valid_satisfaction: int = Field(ge=0)
    average_satisfaction: float | None = Field(default=None, ge=1, le=5)


class AnalysisResult(SatisfactionSummary):
    """Safe aggregate result shared by CLI, API, exports, and dashboard."""

    model_config = ConfigDict(extra="forbid")

    total_records: int = Field(ge=0)
    valid_records: int = Field(ge=0)
    invalid_records: int = Field(ge=0)
    categories: dict[str, int]
    statuses: dict[str, int]
    countries: dict[str, int]
    invalid_breakdown: ValidationSummary

    @model_validator(mode="after")
    def validate_totals(self) -> AnalysisResult:
        if self.total_records != self.valid_records + self.invalid_records:
            raise ValueError("inconsistent_record_counts")
        return self


class AnalysisExportRow(BaseModel):
    """One aggregate-only CSV export row."""

    metric: str
    value: str | int | float | None
    percentage: float | None = None


class AnalysisAPIResponse(AnalysisResult):
    """Public API aggregate response; deliberately excludes row-level data."""


class ExportState(BaseModel):
    """Private persisted pointer data for one user's latest safe aggregate."""

    owner_key: str
    result: AnalysisResult


ValidationRule = Literal[
    "invalid_or_missing_incident_id",
    "duplicate_incident_id",
    "invalid_date",
    "invalid_or_missing_clinic",
    "country_clinic_mismatch",
    "invalid_country",
    "invalid_or_missing_category",
    "invalid_description",
    "invalid_status",
    "invalid_or_missing_patient_id",
    "closed_without_satisfaction_score",
    "invalid_satisfaction_score",
    "invalid_record_structure",
]
