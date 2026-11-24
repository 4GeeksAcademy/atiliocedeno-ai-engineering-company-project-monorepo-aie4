"""Import validated historical incidents without replacing existing tickets."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import sys
from dataclasses import dataclass, field, replace
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SERVICE_ROOT = REPO_ROOT / "services" / "healthcore-api"
sys.path.insert(0, str(SERVICE_ROOT))

from dotenv import load_dotenv
from pydantic import ValidationError
from tinydb import Query, TinyDB

from app.schemas.incidents import IncidentRecord
from app.services.incident_analysis import REQUIRED_COLUMNS
from app.services.incident_transform import (
    InvalidIncidentMapping,
    TransformedIncident,
    transform_incident_record,
)

DEFAULT_CSV = REPO_ROOT / "scripts" / "incidents-healthcore.csv"


class InvalidSeedFile(ValueError):
    """The input cannot be imported as a HealthCore incident CSV."""


@dataclass
class SeedResult:
    read: int = 0
    inserted: int = 0
    skipped: int = 0
    rejected: int = 0
    rejections: list[tuple[int, str]] = field(default_factory=list)


def import_key(transformed: TransformedIncident) -> str:
    if transformed.source_incident_id:
        identity = ["healthcore-historical-id", transformed.source_incident_id]
    else:
        identity = [
            "healthcore-historical-title-date",
            transformed.incident.title,
            transformed.incident.created_at.isoformat(),
        ]
    return hashlib.sha256(json.dumps(identity, ensure_ascii=True).encode("utf-8")).hexdigest()


def seed_incidents(db: TinyDB, csv_path: Path = DEFAULT_CSV) -> SeedResult:
    result = SeedResult()
    planned: list[tuple[str, dict]] = []
    with csv_path.open(encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source, strict=True)
        headers = reader.fieldnames
        if not headers:
            raise InvalidSeedFile("The CSV is empty.")
        if len(headers) != len(REQUIRED_COLUMNS) or set(headers) != set(REQUIRED_COLUMNS):
            raise InvalidSeedFile("Use the nine HealthCore incident CSV headers.")
        for row in reader:
            result.read += 1
            source_incident_id = (row.get("incident_id") or "").strip()
            validation_row = dict(row)
            if not source_incident_id:
                # IncidentRecord intentionally requires IDs for the analyzer contract.
                # Supply a temporary syntactically valid value only for seed validation;
                # it is removed from the transformed import identity below.
                validation_row["incident_id"] = "HC-000000"
            try:
                record = IncidentRecord.model_validate(validation_row)
                transformed = transform_incident_record(record)
                if not source_incident_id:
                    transformed = replace(transformed, source_incident_id="")
            except ValidationError as exc:
                reason = ",".join(sorted({error["type"] for error in exc.errors(include_input=False)}))
                result.rejected += 1
                result.rejections.append((reader.line_num, reason))
                continue
            except InvalidIncidentMapping as exc:
                result.rejected += 1
                result.rejections.append((reader.line_num, exc.code))
                continue

            key = import_key(transformed)
            document = transformed.incident.model_dump(mode="json")
            document["_import_key"] = key
            planned.append((key, document))

    if not result.read:
        raise InvalidSeedFile("The CSV has headers but no incident rows.")
    table = db.table("incidents")
    for key, document in planned:
        if table.contains(Query()._import_key == key):
            result.skipped += 1
            continue
        table.insert(document)
        result.inserted += 1
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--db", type=Path, help="Override HEALTHCORE_DB_PATH for this run")
    args = parser.parse_args()
    try:
        load_dotenv(SERVICE_ROOT / ".env")
        if args.db is not None:
            import os

            os.environ["HEALTHCORE_DB_PATH"] = str(args.db.resolve())

        from app.db.tinydb import get_db, get_db_lock

        with get_db() as db, get_db_lock():
            result = seed_incidents(db, args.csv)
    except InvalidSeedFile as error:
        print(f"Seed failed: {error}", file=sys.stderr)
        return 2
    except UnicodeDecodeError:
        print("Seed failed: use a UTF-8 CSV and a valid HealthCore database.", file=sys.stderr)
        return 2
    except csv.Error:
        print("Seed failed: correct the CSV quoting or structure.", file=sys.stderr)
        return 2
    except FileNotFoundError:
        print("Seed failed: check that the input CSV exists.", file=sys.stderr)
        return 2
    except (OSError, ValueError, TypeError):
        print("Seed failed: check CSV access and HealthCore database integrity and permissions.", file=sys.stderr)
        return 2

    for line_number, reason in result.rejections:
        print(f"Rejected row {line_number}: {reason}", file=sys.stderr)
    print(
        f"Read: {result.read} | Inserted: {result.inserted} | "
        f"Skipped: {result.skipped} | Rejected: {result.rejected}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
