"""Incident manager entity, separate from the validated historical CSV row."""

from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator

IncidentCategory = Literal[
    "clinical_equipment", "it_system", "billing_error", "compliance_breach",
    "patient_experience", "staff_issue", "facility_issue", "referral_issue", "other",
]
IncidentStatus = Literal["open", "in_progress", "resolved", "discarded"]
IncidentOrigin = Literal["customer", "branch", "internal"]
IncidentBranch = Literal[
    "central", "austin_north", "dallas_uptown", "houston_med_center",
    "san_antonio_west", "miami_brickell", "miami_doral", "orlando_east",
    "tampa_bay", "atlanta_midtown", "savannah", "london_city", "london_west",
    "manchester_central",
]


def utc_now() -> datetime:
    """Return an aware UTC timestamp for automatically generated audit fields."""
    return datetime.now(timezone.utc)


class Incident(BaseModel):
    """Central incident manager entity with briefing-defined catalogues."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(default_factory=lambda: str(uuid4()))
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1)
    category: IncidentCategory
    status: IncidentStatus
    origin: IncidentOrigin
    branch: IncidentBranch
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    @field_validator("title")
    @classmethod
    def title_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("title_must_not_be_blank")
        return value

    @field_validator("description")
    @classmethod
    def description_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("description_must_not_be_blank")
        return value