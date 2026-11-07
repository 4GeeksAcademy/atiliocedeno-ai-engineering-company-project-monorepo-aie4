"""Profile input validation; existing optional fields stay optional."""
import re
import phonenumbers
from pydantic import BaseModel, ConfigDict, Field, field_validator


def normalize_phone(value: str | None) -> str | None:
    if value is None or not value.strip():
        return None
    value = value.strip()
    if not re.fullmatch(r"\+?[0-9 ()\-.]+", value) or value.count('(') != value.count(')'):
        raise ValueError("invalid_phone")
    # No country field exists: accept international input, US national, or UK trunk prefix.
    region = "GB" if value.startswith("0") else "US"
    try:
        number = phonenumbers.parse(value, region)
    except phonenumbers.NumberParseException:
        raise ValueError("invalid_phone") from None
    if phonenumbers.region_code_for_number(number) not in {"US", "GB"} or not phonenumbers.is_valid_number(number):
        raise ValueError("invalid_phone")
    return phonenumbers.format_number(number, phonenumbers.PhoneNumberFormat.E164)


class ProfileFields(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str | None = Field(default=None, max_length=200)
    phone: str | None = Field(default=None, max_length=40)
    address: str | None = Field(default=None, max_length=500)


class ProfileCreate(ProfileFields):
    _phone = field_validator("phone")(normalize_phone)


class ProfileUpdate(ProfileCreate):
    pass


class ProfileRead(ProfileFields):
    # Legacy data remains readable so users can correct an old invalid phone.
    model_config = ConfigDict(extra="forbid", from_attributes=True)
    id: int
    user_id: int
