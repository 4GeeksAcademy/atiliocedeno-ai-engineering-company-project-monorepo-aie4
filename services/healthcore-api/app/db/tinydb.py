"""TinyDB initialization and shared table access."""

import json
import os
import stat
import tempfile
from pathlib import Path
from threading import RLock

from tinydb import TinyDB
from tinydb.storages import Storage


class AtomicJSONStorage(Storage):
    """Commit a complete TinyDB snapshot with a same-directory replacement."""

    def __init__(self, path: str | Path) -> None:
        self.path = Path(path).resolve()

    def read(self) -> dict | None:
        try:
            with self.path.open(encoding="utf-8") as source:
                contents = source.read()
        except FileNotFoundError:
            return None
        # Older TinyDB installations can leave an empty file before the first write.
        if not contents:
            return None
        data = json.loads(contents)
        if not isinstance(data, dict) or any(not isinstance(table, dict) for table in data.values()):
            raise ValueError("Invalid database snapshot")
        return data

    def write(self, data: dict) -> None:
        try:
            mode = stat.S_IMODE(self.path.stat().st_mode)
        except FileNotFoundError:
            mode = None
        temporary_path = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="w", encoding="utf-8", dir=self.path.parent, delete=False,
            ) as temporary:
                temporary_path = Path(temporary.name)
                if mode is not None:
                    os.fchmod(temporary.fileno(), mode)
                json.dump(data, temporary)
                temporary.flush()
                os.fsync(temporary.fileno())
            os.replace(temporary_path, self.path)
            temporary_path = None
        finally:
            if temporary_path is not None:
                temporary_path.unlink(missing_ok=True)


_DEFAULT_DB_PATH = Path(__file__).resolve().parents[2] / "data" / "healthcore.json"
DB_PATH = Path(os.getenv("HEALTHCORE_DB_PATH", str(_DEFAULT_DB_PATH)))
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

# TinyDB is file-backed and not designed for concurrent writes; serialize local access.
_db_lock = RLock()
_db = TinyDB(DB_PATH, storage=AtomicJSONStorage)
# Initialize the required tables when the database connection is opened.
_db.table("users")
_db.table("profiles")
_db.table("password_reset_tokens")


def get_db() -> TinyDB:
    """Return the process-wide TinyDB instance."""
    return _db


def get_db_lock() -> RLock:
    """Return the lock used to serialize repository operations."""
    return _db_lock
