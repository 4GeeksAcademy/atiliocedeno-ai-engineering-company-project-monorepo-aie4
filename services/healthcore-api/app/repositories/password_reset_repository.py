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
            self._table.remove(query.user_id == user_id)
            self._table.insert(
                {
                    "user_id": user_id,
                    "token_id": token_id,
                    "expires_at": expires_at.timestamp(),
                    "used": False,
                }
            )

    def is_valid(self, user_id: int, token_id: str) -> bool:
        query = Query()
        with self._lock:
            record = self._table.get((query.user_id == user_id) & (query.token_id == token_id))
            return bool(record and not record.get("used") and record.get("expires_at", 0) > datetime.now(timezone.utc).timestamp())

    def consume(self, user_id: int, token_id: str) -> bool:
        """Mark a matching, unexpired token used exactly once."""
        query = Query()
        now = datetime.now(timezone.utc).timestamp()
        with self._lock:
            record = self._table.get((query.user_id == user_id) & (query.token_id == token_id))
            if record is None or record.get("used") or record.get("expires_at", 0) <= now:
                return False
            self._table.update({"used": True}, doc_ids=[record.doc_id])
            return True

    def invalidate_for_user(self, user_id: int) -> None:
        query = Query()
        with self._lock:
            self._table.remove(query.user_id == user_id)