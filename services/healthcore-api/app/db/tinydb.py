"""TinyDB initialization and shared table access."""

import os
from pathlib import Path
from threading import RLock

from tinydb import TinyDB


_DEFAULT_DB_PATH = Path(__file__).resolve().parents[2] / "data" / "healthcore.json"
DB_PATH = Path(os.getenv("HEALTHCORE_DB_PATH", str(_DEFAULT_DB_PATH)))
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

# TinyDB is file-backed and not designed for concurrent writes; serialize local access.
_db_lock = RLock()
_db = TinyDB(DB_PATH)
# Initialize the required tables when the database connection is opened.
_db.table("users")
_db.table("profiles")


def get_db() -> TinyDB:
    """Return the process-wide TinyDB instance."""
    return _db


def get_db_lock() -> RLock:
    """Return the lock used to serialize repository operations."""
    return _db_lock
