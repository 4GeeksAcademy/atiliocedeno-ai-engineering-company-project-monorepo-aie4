"""TinyDB repository for user persistence."""

from tinydb import Query

from app.db.tinydb import get_db, get_db_lock
from app.models.user import User


class UserRepository:
    """Encapsulate TinyDB operations for users."""

    _table_name = "users"

    def __init__(self) -> None:
        self._db = get_db()
        self._lock = get_db_lock()

    @property
    def _table(self):
        return self._db.table(self._table_name)

    def create(self, user: User) -> User:
        """Insert a user and return it with its TinyDB document ID."""
        data = user.model_dump(mode="json", exclude={"id"})
        with self._lock:
            document_id = self._table.insert(data)
        return user.model_copy(update={"id": document_id})

    def get_by_id(self, user_id: int) -> User | None:
        """Find a user by TinyDB document ID."""
        with self._lock:
            document = self._table.get(doc_id=user_id)
        return self._to_model(document, user_id) if document is not None else None

    def get_by_email(self, email: str) -> User | None:
        """Find a user by normalized email."""
        query = Query()
        with self._lock:
            result = self._table.get(query.email == email.lower())
        return self._to_model(result, result.doc_id) if result is not None else None

    def email_exists(self, email: str, *, exclude_user_id: int | None = None) -> bool:
        """Check whether an email is already assigned to another user."""
        normalized_email = email.lower()
        with self._lock:
            for document in self._table.all():
                if document.get("email", "").lower() != normalized_email:
                    continue
                if exclude_user_id is None or document.doc_id != exclude_user_id:
                    return True
        return False

    def list_all(self) -> list[User]:
        """Return all persisted users."""
        with self._lock:
            documents = self._table.all()
        return [self._to_model(document, document.doc_id) for document in documents]

    def update(self, user_id: int, user: User) -> User | None:
        """Replace the persisted user fields, keeping the document ID stable."""
        data = user.model_dump(mode="json", exclude={"id"})
        with self._lock:
            exists = self._table.contains(doc_id=user_id)
            if not exists:
                return None
            self._table.update(data, doc_ids=[user_id])
        return user.model_copy(update={"id": user_id})

    def delete(self, user_id: int) -> bool:
        """Delete a user by TinyDB document ID."""
        with self._lock:
            exists = self._table.contains(doc_id=user_id)
            if not exists:
                return False
            self._table.remove(doc_ids=[user_id])
        return True

    @staticmethod
    def _to_model(document, document_id: int) -> User:
        return User.model_validate({**document, "id": document_id})
