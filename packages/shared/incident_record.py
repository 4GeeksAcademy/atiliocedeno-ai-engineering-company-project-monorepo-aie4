"""Canonical validation for rows from HealthCore's historical incident CSV."""

from __future__ import annotations

import re
from datetime import date

from pydantic import BaseModel, ConfigDict, ValidationInfo, field_validator
from pydantic_core import PydanticCustomError

CLINIC_COUNTRIES: dict[str, str] = {
    "US-TX-01": "US", "US-TX-02": "US", "US-TX-03": "US",
    "US-FL-01": "US", "US-FL-02": "US", "US-FL-03": "US",
    "US-GA-01": "US", "US-GA-02": "US", "US-GA-03": "US",
    "UK-LON-01": "UK", "UK-LON-02": "UK", "UK-MAN-01": "UK",
}

INCIDENT_CATEGORIES = (
    "APPOINTMENT", "BILLING", "CLINICAL_CARE", "ACCESSIBILITY", "ADMINISTRATIVE",
)
INCIDENT_STATUSES = ("OPEN", "CLOSED", "DISCARDED")
INVALID_RULES = (
    "invalid_or_missing_incident_id", "duplicate_incident_id", "invalid_date",
    "invalid_or_missing_clinic", "country_clinic_mismatch", "invalid_country",
    "invalid_or_missing_category", "invalid_description", "invalid_status",
    "invalid_or_missing_patient_id", "closed_without_satisfaction_score",
    "invalid_satisfaction_score", "invalid_record_structure",
)


class IncidentRecord(BaseModel):
    """One historical CSV row, validated independently from the manager model."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, strict=True, validate_default=True, hide_input_in_errors=True)

    incident_id: str
    date: str
    clinic_id: str
    country: str
    category: str
    description: str
    status: str
    patient_id: str
    satisfaction_score: int | None = None

    @field_validator("incident_id")
    @classmethod
    def validate_incident_id(cls, value: str) -> str:
        if not re.fullmatch(r"HC-[0-9]{6}", value):
            raise PydanticCustomError("incident_id_invalid", "invalid incident identifier")
        return value

    @field_validator("date")
    @classmethod
    def validate_date(cls, value: str) -> str:
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            raise PydanticCustomError("date_invalid", "invalid date")
        try:
            date.fromisoformat(value)
        except ValueError as exc:
            raise PydanticCustomError("date_invalid", "invalid date") from exc
        return value

    @field_validator("clinic_id")
    @classmethod
    def validate_clinic_id(cls, value: str) -> str:
        if value not in CLINIC_COUNTRIES:
            raise PydanticCustomError("clinic_invalid", "invalid clinic")
        return value

    @field_validator("country")
    @classmethod
    def validate_country(cls, value: str, info: ValidationInfo) -> str:
        if value not in {"US", "UK"}:
            raise PydanticCustomError("country_invalid", "invalid country")
        clinic = info.data.get("clinic_id")
        if clinic is not None and value != CLINIC_COUNTRIES[clinic]:
            raise PydanticCustomError("country_clinic_mismatch", "country does not match clinic")
        return value

    @field_validator("category")
    @classmethod
    def validate_category(cls, value: str) -> str:
        if value not in INCIDENT_CATEGORIES:
            raise PydanticCustomError("category_invalid", "invalid category")
        return value

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: str) -> str:
        if len(value.strip()) < 5:
            raise PydanticCustomError("description_invalid", "invalid description")
        return value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in INCIDENT_STATUSES:
            raise PydanticCustomError("status_invalid", "invalid status")
        return value

    @field_validator("patient_id")
    @classmethod
    def validate_patient_id(cls, value: str) -> str:
        if not re.fullmatch(r"PAT-[0-9]{6}", value):
            raise PydanticCustomError("patient_id_invalid", "invalid patient identifier")
        return value

    @field_validator("satisfaction_score", mode="before")
    @classmethod
    def parse_satisfaction_score(cls, value: object) -> int | None:
        if value is None or value == "":
            return None
        if isinstance(value, bool) or (isinstance(value, str) and not re.fullmatch(r"[1-5]", value)):
            raise PydanticCustomError("satisfaction_score_invalid", "invalid score")
        if not isinstance(value, (int, str)):
            raise PydanticCustomError("satisfaction_score_invalid", "invalid score")
        try:
            score = int(value)
        except (TypeError, ValueError) as exc:
            raise PydanticCustomError("satisfaction_score_invalid", "invalid score") from exc
        if score < 1 or score > 5:
            raise PydanticCustomError("satisfaction_score_invalid", "invalid score")
        return score

    @field_validator("satisfaction_score")
    @classmethod
    def validate_closed_score(cls, value: int | None, info: ValidationInfo) -> int | None:
        # Field validators still run when unrelated fields fail validation.
        if info.data.get("status") == "CLOSED" and value is None:
            raise PydanticCustomError("closed_without_satisfaction_score", "closed incident needs a score")
        return value