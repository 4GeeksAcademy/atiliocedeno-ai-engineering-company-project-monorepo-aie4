"""TinyDB repository for profile persistence."""

from tinydb import Query

from app.db.tinydb import get_db, get_db_lock
from app.models.profile import Profile


class ProfileRepository:
    """Encapsulate TinyDB operations for profiles."""

    _table_name = "profiles"

    def __init__(self) -> None:
        self._db = get_db()
        self._lock = get_db_lock()

    @property
    def _table(self):
        return self._db.table(self._table_name)

    def create(self, profile: Profile) -> Profile:
        """Insert a profile and return it with its TinyDB document ID."""
        data = profile.model_dump(mode="json", exclude={"id"})
        with self._lock:
            document_id = self._table.insert(data)
        return profile.model_copy(update={"id": document_id})

    def get_by_user_id(self, user_id: int) -> Profile | None:
        """Find a profile by its owning user ID."""
        query = Query()
        with self._lock:
            result = self._table.get(query.user_id == user_id)
        return self._to_model(result, result.doc_id) if result is not None else None

    def update(self, profile_id: int, profile: Profile) -> Profile | None:
        """Replace a profile's persisted fields, keeping its document ID stable."""
        data = profile.model_dump(mode="json", exclude={"id"})
        with self._lock:
            exists = self._table.contains(doc_id=profile_id)
            if not exists:
                return None
            self._table.update(data, doc_ids=[profile_id])
        return profile.model_copy(update={"id": profile_id})

    def delete_by_id(self, profile_id: int) -> bool:
        """Delete a profile by TinyDB document ID."""
        with self._lock:
            if not self._table.contains(doc_id=profile_id):
                return False
            self._table.remove(doc_ids=[profile_id])
        return True

    def delete_by_user_id(self, user_id: int) -> bool:
        """Delete the profile belonging to a user, if one exists."""
        query = Query()
        with self._lock:
            result = self._table.get(query.user_id == user_id)
            if result is None:
                return False
            self._table.remove(doc_ids=[result.doc_id])
        return True

    @staticmethod
    def _to_model(document, document_id: int) -> Profile:
        return Profile.model_validate({**document, "id": document_id})
