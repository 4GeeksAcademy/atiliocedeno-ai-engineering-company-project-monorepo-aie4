"""Password hashing and signed JWT helpers."""

from datetime import datetime, timedelta, timezone
import os
from pathlib import Path

import jwt
from dotenv import load_dotenv
from passlib.hash import bcrypt

load_dotenv(Path(__file__).resolve().parents[2] / ".env")
load_dotenv()
_JWT_SECRET = os.getenv("HEALTHCORE_JWT_SECRET", os.getenv("SECRET_KEY", ""))
_JWT_ALGORITHM = "HS256"
_ACCESS_TOKEN_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", os.getenv("HEALTHCORE_ACCESS_TOKEN_MINUTES", "30"))
)


def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt via libpass's passlib-compatible API."""
    return bcrypt.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against its bcrypt hash."""
    return bcrypt.verify(password, hashed_password)


def create_access_token(subject: str) -> str:
    """Create a signed JWT for the given user ID."""
    if not _JWT_SECRET:
        raise RuntimeError("HEALTHCORE_JWT_SECRET must be configured")
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=_ACCESS_TOKEN_MINUTES)
    return jwt.encode({"sub": subject, "exp": expires_at}, _JWT_SECRET, algorithm=_JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Validate a signed JWT and return its claims."""
    if not _JWT_SECRET:
        raise RuntimeError("HEALTHCORE_JWT_SECRET must be configured")
    return jwt.decode(token, _JWT_SECRET, algorithms=[_JWT_ALGORITHM])
