"""Password hashing and signed JWT helpers."""

from datetime import datetime, timedelta, timezone
import os
from pathlib import Path
from typing import Any

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


def create_password_reset_token(subject: str, token_id: str, expires_at: datetime) -> str:
    """Create a signed, purpose-bound JWT for one password reset request."""
    if not _JWT_SECRET:
        raise RuntimeError("HEALTHCORE_JWT_SECRET must be configured")
    return jwt.encode(
        {"sub": subject, "jti": token_id, "purpose": "password_reset", "exp": expires_at},
        _JWT_SECRET,
        algorithm=_JWT_ALGORITHM,
    )


def decode_password_reset_token(token: str) -> dict[str, Any]:
    """Verify JWT signature/expiry and reject tokens issued for other purposes."""
    claims = decode_access_token(token)
    if claims.get("purpose") != "password_reset":
        raise jwt.InvalidTokenError("Token is not a password reset token")
    return claims
