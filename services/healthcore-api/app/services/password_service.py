"""Password reset and authenticated password-change workflows."""

from datetime import datetime, timedelta, timezone
import secrets

import jwt

from app.core.security import (
    create_password_reset_token,
    decode_password_reset_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.repositories.password_reset_repository import PasswordResetRepository
from app.repositories.user_repository import UserRepository
from app.services.user_service import AccountNotFound

RESET_TOKEN_MINUTES = 30


class IncorrectPassword(ValueError):
    """The current password does not match the stored password."""


class PasswordService:
    """Coordinate password changes and single-use reset token persistence."""

    def __init__(
        self,
        users: UserRepository | None = None,
        reset_tokens: PasswordResetRepository | None = None,
    ) -> None:
        self.users = users or UserRepository()
        self.reset_tokens = reset_tokens or PasswordResetRepository()

    def issue_reset(self, user: User) -> str:
        """Issue a new reset JWT, invalidating any older reset token."""
        if user.id is None:
            raise ValueError("User must be persisted before password reset")
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_MINUTES)
        token_id = secrets.token_urlsafe(32)
        token = create_password_reset_token(str(user.id), token_id, expires_at)
        self.reset_tokens.issue(user.id, token_id, expires_at)
        return token

    def is_reset_token_valid(self, token: str) -> bool:
        try:
            claims = decode_password_reset_token(token)
            user_id = int(claims["sub"])
            token_id = claims["jti"]
        except (jwt.InvalidTokenError, KeyError, TypeError, ValueError, RuntimeError):
            return False
        return (isinstance(token_id, str) and self.users.get_by_id(user_id) is not None
                and self.reset_tokens.is_valid(user_id, token_id))

    def reset_password(self, token: str, new_password: str) -> bool:
        """Validate and consume a one-time token, then update the password hash."""
        try:
            claims = decode_password_reset_token(token)
            user_id = int(claims["sub"])
            token_id = claims["jti"]
        except (jwt.InvalidTokenError, KeyError, TypeError, ValueError, RuntimeError):
            return False
        if not isinstance(token_id, str) or not self.reset_tokens.is_valid(user_id, token_id):
            return False
        return self.reset_tokens.replace_password(user_id, hash_password(new_password), token_id=token_id)

    def change_password(self, user: User, current_password: str, new_password: str) -> None:
        """Verify the current password before replacing it and invalidating links."""
        if user.id is None:
            raise AccountNotFound("User not found")
        if not verify_password(current_password, user.hashed_password):
            raise IncorrectPassword("Current password is incorrect")
        if not self.reset_tokens.replace_password(
            user.id, hash_password(new_password), expected_hash=user.hashed_password,
        ):
            if self.users.get_by_id(user.id) is None:
                raise AccountNotFound("User not found")
            raise IncorrectPassword("Current password is incorrect")
