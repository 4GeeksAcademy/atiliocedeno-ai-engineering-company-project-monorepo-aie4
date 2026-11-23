"""One-time password-reset token persistence backed by TinyDB."""

from datetime import datetime, timezone

from tinydb import Query

from app.db.tinydb import get_db, get_db_lock


class PasswordResetRepository:
    """Store reset-token identifiers and prevent reuse or superseded links."""

    def __init__(self) -> None:
        self._db = get_db()
        self._lock = get_db_lock()

    @property
    def _table(self):
        return self._db.table("password_reset_tokens")

    def issue(self, user_id: int, token_id: str, expires_at: datetime) -> None:
        query = Query()
        with self._lock:
            self._table.upsert(
                {
                    "user_id": user_id,
                    "token_id": token_id,
                    "expires_at": expires_at.timestamp(),
                    "used": False,
                },
                query.user_id == user_id,
            )

    def is_valid(self, user_id: int, token_id: str) -> bool:
        query = Query()
        with self._lock:
            record = self._table.get((query.user_id == user_id) & (query.token_id == token_id))
            return bool(record and not record.get("used") and record.get("expires_at", 0) > datetime.now(timezone.utc).timestamp())

    def replace_password(
        self, user_id: int, password_hash: str, *,
        token_id: str | None = None, expected_hash: str | None = None,
    ) -> bool:
        """Persist the new password and invalidate reset links in one snapshot."""
        with self._lock:
            snapshot = self._db.storage.read() or {}
            users = snapshot.get("users", {})
            user = users.get(str(user_id))
            if user is None or (expected_hash is not None and user["hashed_password"] != expected_hash):
                return False

            tokens = snapshot.get("password_reset_tokens", {})
            now = datetime.now(timezone.utc).timestamp()
            if token_id is not None and not any(
                item.get("user_id") == user_id and item.get("token_id") == token_id
                and not item.get("used") and item.get("expires_at", 0) > now
                for item in tokens.values()
            ):
                return False

            user["hashed_password"] = password_hash
            snapshot["password_reset_tokens"] = {
                key: item for key, item in tokens.items() if item.get("user_id") != user_id
            }
            self._db.storage.write(snapshot)
            self._db.table("users").clear_cache()
            self._table.clear_cache()
            return True
