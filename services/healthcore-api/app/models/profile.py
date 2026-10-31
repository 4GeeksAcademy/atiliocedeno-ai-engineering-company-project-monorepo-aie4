"""Optional non-authentication profile information linked to a user."""

from pydantic import BaseModel, ConfigDict, Field


class Profile(BaseModel):
    """User profile fields; never store these on the User model."""

    model_config = ConfigDict(extra="forbid")

    # Stored as TinyDB's document ID in the repository layer.
    id: int | None = None
    user_id: int
    name: str | None = None
    phone: str | None = None
    address: str | None = None
