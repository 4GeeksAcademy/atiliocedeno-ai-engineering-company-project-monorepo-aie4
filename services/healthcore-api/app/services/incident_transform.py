"""Transform validated historical analyzer rows into manager incidents."""

from dataclasses import dataclass
from datetime import datetime, time, timezone

from app.models.incident import Incident
from app.schemas.incidents import IncidentRecord

STATUS_MAPPING = {"OPEN": "open", "CLOSED": "resolved", "DISCARDED": "discarded"}
CATEGORY_MAPPING = {
    "APPOINTMENT": "patient_experience",
    "BILLING": "billing_error",
    "CLINICAL_CARE": "patient_experience",
    "ACCESSIBILITY": "patient_experience",
    "ADMINISTRATIVE": "other",
}
BRANCH_MAPPING = {
    "US-TX-01": "central", "US-TX-02": "austin_north",
    "US-TX-03": "houston_med_center", "US-FL-01": "miami_brickell",
    "US-FL-02": "orlando_east", "US-FL-03": "tampa_bay",
    "US-GA-01": "atlanta_midtown", "US-GA-02": "atlanta_midtown",
    "US-GA-03": "savannah", "UK-LON-01": "london_city",
    "UK-LON-02": "london_west", "UK-MAN-01": "manchester_central",
}


class InvalidIncidentMapping(ValueError):
    """A validated CSV value cannot be represented by manager catalogues."""

    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(code)


@dataclass(frozen=True)
class TransformedIncident:
    """Import identity kept separate from the manager entity's generated id."""

    source_incident_id: str
    incident: Incident


def map_category(csv_category: str) -> str:
    """Map a known analyzer category; unknown values are invalid, never `other`."""
    try:
        return CATEGORY_MAPPING[csv_category]
    except KeyError as exc:
        raise InvalidIncidentMapping("invalid_category_mapping") from exc


def transform_incident_record(record: IncidentRecord) -> TransformedIncident:
    """Convert a validated analyzer row to an in-memory manager Incident."""
    if not isinstance(record, IncidentRecord):
        raise TypeError("record_must_be_validated_incident_record")

    try:
        status = STATUS_MAPPING[record.status]
    except KeyError as exc:
        raise InvalidIncidentMapping("invalid_status_mapping") from exc

    category = map_category(record.category)
    branch = BRANCH_MAPPING.get(record.clinic_id, "central")
    incident_date = datetime.combine(
        datetime.strptime(record.date, "%Y-%m-%d").date(), time.min, tzinfo=timezone.utc
    )
    title = record.description.strip()[:120].strip()
    if not title:
        raise InvalidIncidentMapping("invalid_title")

    incident = Incident(
        title=title,
        description=record.description,
        category=category,
        status=status,
        origin="customer",
        branch=branch,
        created_at=incident_date,
        updated_at=incident_date,
    )
    return TransformedIncident(source_incident_id=record.incident_id, incident=incident)