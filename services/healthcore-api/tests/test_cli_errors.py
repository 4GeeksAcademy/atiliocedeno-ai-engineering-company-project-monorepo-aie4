"""Exercise HealthCore commands with isolated inputs and database paths."""

import csv
import json
import os
from pathlib import Path
import subprocess
import sys

import pytest

from app.services.incident_analysis import REQUIRED_COLUMNS

ROOT = Path(__file__).resolve().parents[3]
SERVICE = ROOT / "services" / "healthcore-api"
VALID_ROW = ["HC-000001", "2024-01-01", "US-TX-01", "US", "BILLING",
             "Synthetic report", "OPEN", "PAT-000001", ""]


def run(command, db, *, cwd=ROOT):
    return subprocess.run(
        [sys.executable, *command], cwd=cwd, input="", capture_output=True, text=True,
        env={**os.environ, "HEALTHCORE_DB_PATH": str(db), "PYTHON_DOTENV_DISABLED": "1"},
        check=False,
    )


def write_csv(path, *rows):
    with path.open("w", newline="", encoding="utf-8") as output:
        writer = csv.writer(output)
        writer.writerow(REQUIRED_COLUMNS)
        writer.writerows(rows)


@pytest.mark.parametrize(("contents", "message"), [
    (b"", "CSV is empty"),
    (b"bad,header\n1,2\n", "nine HealthCore"),
    (b"\xff", "UTF-8"),
    ((",".join(REQUIRED_COLUMNS) + "\n\"unterminated\n").encode(), "CSV quoting"),
])
def test_seed_rejects_invalid_files_without_writing(tmp_path, contents, message):
    source = tmp_path / "source.csv"
    database = tmp_path / "db.json"
    source.write_bytes(contents)
    result = run(["scripts/seed_incidents.py", "--csv", str(source)], database)
    assert result.returncode == 2
    assert message in result.stderr
    assert "Traceback" not in result.stderr
    assert not database.exists()


def test_seed_keeps_valid_rows_and_ids_and_reports_row_rejections(tmp_path):
    source = tmp_path / "source.csv"
    database = tmp_path / "db.json"
    write_csv(source, VALID_ROW, ["invalid-id", *VALID_ROW[1:]])
    command = ["scripts/seed_incidents.py", "--csv", str(source), "--db", str(database)]
    first = run(command, database)
    assert first.returncode == 0
    assert "Inserted: 1" in first.stdout
    assert "Rejected row 3" in first.stderr
    original = json.loads(database.read_text())
    second = run(command, database)
    assert second.returncode == 0
    assert "Skipped: 1" in second.stdout
    assert json.loads(database.read_text()) == original


def test_cli_reports_corrupt_database_and_interrupted_admin_input(tmp_path):
    database = tmp_path / "db.json"
    database.write_text("{fixture-secret")
    source = tmp_path / "source.csv"
    write_csv(source, VALID_ROW)
    cases = [
        (["scripts/seed_incidents.py", "--csv", str(source)], ROOT, "database"),
        (["seed.py"], SERVICE, "database"),
        (["-m", "scripts.manage_admin"], SERVICE, "base HealthCore"),
    ]
    for command, cwd, message in cases:
        result = run(command, database, cwd=cwd)
        assert result.returncode == 2
        assert message in result.stderr
        assert "Traceback" not in result.stderr and "fixture-secret" not in result.stderr
    assert database.read_text() == "{fixture-secret"
    result = run(["-m", "scripts.manage_admin"], tmp_path / "empty.json", cwd=SERVICE)
    assert result.returncode == 2
    assert "interrumpida" in result.stderr
    assert "Traceback" not in result.stderr


def test_analyzer_distinguishes_input_and_export_errors(tmp_path):
    database = tmp_path / "db.json"
    source = tmp_path / "source.csv"
    destination = tmp_path / "existing.csv"
    destination.write_text("preserved")
    missing = run(["scripts/analyze.py", str(source), "--no-prompt"], database)
    assert missing.returncode == 2 and "input_missing" in missing.stderr
    write_csv(source, VALID_ROW)
    occupied = run(["scripts/analyze.py", str(source), "--export", str(destination)], database)
    assert occupied.returncode == 2 and "export_exists" in occupied.stderr
    assert destination.read_text() == "preserved"
    failed = run(["scripts/analyze.py", str(source), "--export", str(tmp_path / "missing" / "report.csv")], database)
    assert failed.returncode == 2 and "export_write_failed" in failed.stderr
