import csv
import hashlib
import json
from pathlib import Path

import pytest
from pydantic import ValidationError
from tinydb import TinyDB

from app.schemas.incidents import IncidentRecord
from scripts.seed_incidents import DEFAULT_CSV, seed_incidents


def test_real_csv_reimport_preserves_every_import_key_and_ticket_id(tmp_path: Path):
    database_path = tmp_path / "incidents.json"
    with TinyDB(database_path) as db:
        first = seed_incidents(db, DEFAULT_CSV)
        assert (first.read, first.inserted, first.skipped, first.rejected) == (100, 94, 0, 6)
        first_identity = {
            ticket["_import_key"]: ticket["id"]
            for ticket in db.table("incidents").all()
        }
        assert len(first_identity) == 94

        second = seed_incidents(db, DEFAULT_CSV)
        second_identity = {
            ticket["_import_key"]: ticket["id"]
            for ticket in db.table("incidents").all()
        }

    assert (second.read, second.inserted, second.skipped, second.rejected) == (100, 0, 94, 6)
    assert second_identity == first_identity


def test_missing_source_id_uses_title_and_created_at_fallback(tmp_path: Path):
    csv_path = tmp_path / "without-incident-id.csv"
    fieldnames = [
        "incident_id", "date", "clinic_id", "country", "category",
        "description", "status", "patient_id", "satisfaction_score",
    ]
    row = {
        "incident_id": "",
        "date": "2024-01-13",
        "clinic_id": "US-TX-02",
        "country": "US",
        "category": "BILLING",
        "description": "Billing fallback test incident",
        "status": "OPEN",
        "patient_id": "PAT-123456",
        "satisfaction_score": "",
    }
    with csv_path.open("w", encoding="utf-8", newline="") as target:
        writer = csv.DictWriter(target, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerow(row)

    # The analyzer schema contract remains unchanged: incident_id is required.
    with pytest.raises(ValidationError):
        IncidentRecord.model_validate(row)

    database_path = tmp_path / "fallback.json"
    with TinyDB(database_path) as db:
        first = seed_incidents(db, csv_path)
        first_tickets = db.table("incidents").all()
        second = seed_incidents(db, csv_path)
        second_tickets = db.table("incidents").all()

    assert (first.read, first.inserted, first.skipped, first.rejected) == (1, 1, 0, 0)
    assert (second.read, second.inserted, second.skipped, second.rejected) == (1, 0, 1, 0)
    assert len(first_tickets) == len(second_tickets) == 1
    ticket = second_tickets[0]
    assert ticket["title"] == row["description"]
    assert ticket["created_at"] == "2024-01-13T00:00:00Z"
    expected_identity = [
        "healthcore-historical-title-date",
        row["description"],
        "2024-01-13T00:00:00+00:00",
    ]
    expected_key = hashlib.sha256(json.dumps(expected_identity, ensure_ascii=True).encode("utf-8")).hexdigest()
    assert ticket["_import_key"] == expected_key
