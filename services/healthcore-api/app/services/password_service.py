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

RESET_TOKEN_MINUTES = 30


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

    def reset_password(self, token: str, new_password: str) -> bool:
        """Validate and consume a one-time token, then update the password hash."""
        try:
            claims = decode_password_reset_token(token)
            user_id = int(claims["sub"])
            token_id = claims["jti"]
        except (jwt.InvalidTokenError, KeyError, TypeError, ValueError, RuntimeError):
            return False
        if not isinstance(token_id, str) or not self.reset_tokens.consume(user_id, token_id):
            return False
        user = self.users.get_by_id(user_id)
        if user is None:
            return False
        if self.users.update_password_hash(user_id, hash_password(new_password)) is None:
            self.reset_tokens.invalidate_for_user(user_id)
            return False
        self.reset_tokens.invalidate_for_user(user_id)
        return True

    def change_password(self, user: User, current_password: str, new_password: str) -> None:
        """Verify the current password before replacing its hash."""
        if not verify_password(current_password, user.hashed_password):
            raise ValueError("Current password is incorrect")
        if user.id is None:
            raise LookupError("User not found")
        if self.users.update_password_hash(user.id, hash_password(new_password)) is None:
            raise LookupError("User not found")
        self.reset_tokens.invalidate_for_user(user.id)
