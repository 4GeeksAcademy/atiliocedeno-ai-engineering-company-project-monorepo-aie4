"""Pydantic schemas for user creation, updates, and public responses."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import UserRole
from app.schemas.profile import ProfileCreate, ProfileRead


class UserCreate(BaseModel):
    """Public registration input. New users always receive the user role."""

    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    profile: ProfileCreate | None = None


class UserUpdate(BaseModel):
    """Fields a user may request to update; role is intentionally omitted."""

    model_config = ConfigDict(extra="forbid")

    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserRead(BaseModel):
    """Public user representation without password hashes."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    is_active: bool
    role: UserRole
    created_at: datetime
    profile: ProfileRead | None = None


class UserAdminUpdate(UserUpdate):
    """Admin-only account changes, including role and activation status."""

    role: UserRole | None = None
    is_active: bool | None = None
