"""In-memory checks for validated CSV-to-manager Incident transformation."""

import csv
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.models.incident import Incident
from app.schemas.incidents import IncidentRecord
from app.services.incident_transform import (
    BRANCH_MAPPING,
    CATEGORY_MAPPING,
    STATUS_MAPPING,
    InvalidIncidentMapping,
    map_category,
    transform_incident_record,
)

DATASET = Path(__file__).resolve().parents[3] / "scripts/incidents-healthcore.csv"


def csv_row(incident_id: str) -> dict[str, str]:
    with DATASET.open(encoding="utf-8", newline="") as source:
        return next(row for row in csv.DictReader(source) if row["incident_id"] == incident_id)


def test_hc_000001_transforms_to_manager_incident_in_memory():
    source = IncidentRecord.model_validate(csv_row("HC-000001"))
    result = transform_incident_record(source)

    assert result.source_incident_id == "HC-000001"
    assert result.incident.id != result.source_incident_id
    assert isinstance(result.incident, Incident)
    assert result.incident.status == "resolved"
    assert result.incident.branch == "austin_north"
    assert result.incident.category == "other"
    assert result.incident.origin == "customer"
    assert result.incident.title == source.description.strip()[:120].strip()
    assert result.incident.description == source.description
    assert result.incident.created_at.isoformat() == "2024-01-13T00:00:00+00:00"
    assert result.incident.updated_at == result.incident.created_at


def test_billing_csv_category_maps_to_billing_error():
    with DATASET.open(encoding="utf-8", newline="") as source:
        raw_row = next(row for row in csv.DictReader(source) if row["category"] == "BILLING")

    result = transform_incident_record(IncidentRecord.model_validate(raw_row))
    assert result.incident.category == "billing_error"


def test_all_briefing_mappings_are_complete():
    assert CATEGORY_MAPPING == {
        "APPOINTMENT": "patient_experience",
        "BILLING": "billing_error",
        "CLINICAL_CARE": "patient_experience",
        "ACCESSIBILITY": "patient_experience",
        "ADMINISTRATIVE": "other",
    }
    assert STATUS_MAPPING == {"OPEN": "open", "CLOSED": "resolved", "DISCARDED": "discarded"}
    assert BRANCH_MAPPING == {
        "US-TX-01": "central", "US-TX-02": "austin_north",
        "US-TX-03": "houston_med_center", "US-FL-01": "miami_brickell",
        "US-FL-02": "orlando_east", "US-FL-03": "tampa_bay",
        "US-GA-01": "atlanta_midtown", "US-GA-02": "atlanta_midtown",
        "US-GA-03": "savannah", "UK-LON-01": "london_city",
        "UK-LON-02": "london_west", "UK-MAN-01": "manchester_central",
    }


def test_administrative_is_explicit_other_but_unknown_category_is_invalid():
    assert map_category("ADMINISTRATIVE") == "other"
    with pytest.raises(InvalidIncidentMapping, match="invalid_category_mapping"):
        map_category("UNKNOWN")


def test_model_generates_id_and_utc_timestamps_and_rejects_invalid_catalogues():
    incident = Incident(
        title="Example incident",
        description="A sufficiently detailed incident description",
        category="billing_error",
        status="open",
        origin="branch",
        branch="central",
    )
    assert incident.id
    assert incident.created_at.tzinfo is not None
    assert incident.updated_at.tzinfo is not None
    assert incident.created_at.utcoffset().total_seconds() == 0
    with pytest.raises(ValidationError):
        Incident(
            title="Bad category",
            description="A sufficiently detailed incident description",
            category="unknown",
            status="open",
            origin="customer",
            branch="central",
        )