"""Persisted user model and allowed account roles."""

from datetime import datetime, timezone
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRole(StrEnum):
    """Roles accepted by the user domain."""

    ADMIN = "admin"
    MANAGER = "manager"
    USER = "user"


class User(BaseModel):
    """Authentication and authorization data; profile data belongs to Profile."""

    model_config = ConfigDict(extra="forbid")

    # Stored as TinyDB's document ID in the repository layer.
    id: int | None = None
    email: EmailStr
    hashed_password: str
    is_active: bool = True
    role: UserRole = UserRole.USER
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
