"""Validated supplier fields and persisted supplier model."""

import re
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator
from pydantic_core import PydanticCustomError

VALID_CATEGORIES = (
    "medical_supplies",
    "laboratory_services",
    "pharmaceutical",
    "clinical_software",
    "it_infrastructure",
    "hr_and_payroll_software",
    "cleaning_and_facilities",
    "patient_communication",
    "billing_and_coding_software",
    "training_platforms",
)
SupplierStatus = Literal["active", "suspended"]


def validate_monthly_rate_input(value: object) -> object:
    """Reject booleans before Pydantic coerces them to numeric rates."""
    if isinstance(value, bool):
        raise ValueError("monthly_rate_must_be_positive_finite_number")
    return value


class SupplierFields(BaseModel):
    """Shared supplier data and business validation for create and stored models."""

    model_config = ConfigDict(extra="forbid")

    name: str
    country: Literal["USA", "UK"]
    categories: list[str] = Field(min_length=1)
    monthly_rate: float = Field(gt=0, allow_inf_nan=False)
    currency: Literal["USD", "GBP"]
    status: SupplierStatus
    compliance_agreement: Literal["BAA", "DPA", "both"] | None = None
    contract_renewal_date: str | None = None
    contact_email: EmailStr | None = None
    notes: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("name_must_not_be_blank")
        return value

    @field_validator("categories")
    @classmethod
    def validate_categories(cls, values: list[str]) -> list[str]:
        if any(category not in VALID_CATEGORIES for category in values):
            raise ValueError("category_invalid")
        return values

    @field_validator("monthly_rate", mode="before")
    @classmethod
    def reject_boolean_monthly_rate(cls, value: object) -> object:
        return validate_monthly_rate_input(value)

    @field_validator("contract_renewal_date")
    @classmethod
    def validate_contract_renewal_date(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", value):
            raise ValueError("contract_renewal_date_invalid")
        try:
            date.fromisoformat(value)
        except ValueError as exc:
            raise ValueError("contract_renewal_date_invalid") from exc
        return value

    @model_validator(mode="after")
    def validate_country_currency(self) -> "SupplierFields":
        expected_currency = "USD" if self.country == "USA" else "GBP"
        if self.currency != expected_currency:
            raise PydanticCustomError("country_currency_mismatch", "Currency must match country.")
        return self


class SupplierCreate(SupplierFields):
    """Supplier data accepted from a client when creating a record."""


class SupplierRateUpdate(BaseModel):
    """Request body for changing only a supplier's monthly rate."""

    model_config = ConfigDict(extra="forbid")

    monthly_rate: float = Field(gt=0, allow_inf_nan=False)

    @field_validator("monthly_rate", mode="before")
    @classmethod
    def reject_boolean_monthly_rate(cls, value: object) -> object:
        return validate_monthly_rate_input(value)


class SupplierStatusUpdate(BaseModel):
    """Request body for changing only a supplier's lifecycle status."""

    model_config = ConfigDict(extra="forbid")

    status: SupplierStatus


class Supplier(SupplierCreate):
    """Complete supplier record, including persistence and audit metadata."""

    id: int = Field(strict=True)
    updated_at: datetime
