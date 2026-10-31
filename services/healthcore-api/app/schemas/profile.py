"""Pydantic schemas for profile input and output."""

from pydantic import BaseModel, ConfigDict, Field


class ProfileCreate(BaseModel):
    """Profile fields supplied when creating a profile for a user."""

    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, max_length=200)
    phone: str | None = Field(default=None, max_length=40)
    address: str | None = Field(default=None, max_length=500)


class ProfileRead(ProfileCreate):
    """Public profile representation."""

    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: int
    user_id: int


class ProfileUpdate(BaseModel):
    """Fields allowed when updating an existing profile."""

    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, max_length=200)
    phone: str | None = Field(default=None, max_length=40)
    address: str | None = Field(default=None, max_length=500)
