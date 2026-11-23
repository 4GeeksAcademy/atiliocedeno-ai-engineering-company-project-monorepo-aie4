"""Authenticated API, export, and prior authentication behavior."""
import io
import csv
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from app.api.deps import get_current_user
from app.main import app
from app.models.user import User, UserRole

DATASET = Path(__file__).resolve().parents[3] / "scripts/incidents-healthcore.csv"


@pytest.fixture
def client():
    user = User(id=7, email="tester@example.com", hashed_password="test", role=UserRole.USER)
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        with TestClient(app) as client:
            yield client
    finally:
        app.dependency_overrides.clear()


def upload(client, path, data=None, filename="incidents.csv"):
    return client.post(path, files={"file": (filename, DATASET.read_bytes() if data is None else data, "text/csv")})


def test_analyze_dataset_and_minimized_response(client):
    response = upload(client, "/api/incidents/analyze")
    assert response.status_code == 200
    assert response.json()["valid_records"] == 94
    assert response.json()["invalid_records"] == 6
    assert response.json()["total_records"] == 100
    assert not {"patient_id", "description", "incident_id"}.intersection(response.json())


@pytest.mark.parametrize("path", ["/api/incidents/analyze", "/api/incidents/results/export"])
def test_requires_authentication(path):
    with TestClient(app) as client:
        assert (client.get(path) if path.endswith("export") else upload(client, path)).status_code == 401


@pytest.mark.parametrize("path", ["/api/incidents/analyze"])
def test_non_csv_filename_returns_safe_error(client, path):
    response = upload(client, path, filename="private.txt")
    assert response.status_code == 415
    assert response.json() == {"detail": {"code": "invalid_file_type"}}


def test_export_aggregate_counts_and_privacy(client):
    assert upload(client, "/api/incidents/analyze").status_code == 200
    response = client.get("/api/incidents/results/export")
    assert response.status_code == 200
    rows = {row["metric"]: row["value"] for row in csv.DictReader(io.StringIO(response.text))}
    assert rows["valid_records"] == "94"
    assert rows["invalid_records"] == "6"
    assert rows["average_satisfaction"] == "3.58"
    assert set(rows).isdisjoint({"patient_id", "description", "incident_id"})


@pytest.mark.parametrize("path", ["/api/incidents/analyze"])
@pytest.mark.parametrize("data,code", [(b"", "empty_file"), (b"private,headers\nsecret,private", "invalid_headers"), (b"\xff", "invalid_encoding")])
def test_bad_csv_errors_are_safe(client, path, data, code):
    response = upload(client, path, data=data)
    assert response.status_code == 400
    assert response.json() == {"detail": {"code": code}}


def test_upload_limit(client, monkeypatch):
    monkeypatch.setattr("app.api.routes.incidents.MAX_UPLOAD_BYTES", 10)
    response = upload(client, "/api/incidents/analyze")
    assert response.status_code == 413
    assert response.json()["detail"]["code"] == "file_too_large"


def test_previous_auth_profile_and_reset_flow():
    from app.repositories.user_repository import UserRepository
    from app.services.password_service import PasswordService
    with TestClient(app) as client:
        assert client.get("/health").json() == {"status": "ok"}
        email = "regression@example.com"
        password = "local-test-password-123"
        registered = client.post("/users", json={"email": email, "password": password, "profile": {"name": "Regression Tester"}})
        assert registered.status_code == 201
        user_id = registered.json()["id"]
        assert "hashed_password" not in registered.text
        token = client.post("/auth/login", json={"email": email, "password": password}).json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        assert client.get("/auth/me", headers=headers).status_code == 200
        assert client.get("/profiles/me", headers=headers).status_code == 200
        assert client.get("/users", headers=headers).status_code == 403
        assert client.post("/api/incidents/analyze", headers=headers, files={"file": ("incidents.csv", DATASET.read_bytes())}).json()["valid_records"] == 94
        user = UserRepository().get_by_email(email)
        reset = PasswordService().issue_reset(user)
        for _ in range(2):
            assert client.post("/auth/reset-password/validate", json={"token": reset}).status_code == 200
        assert client.post("/auth/reset-password", json={"token": reset, "new_password": "changed-test-password-123"}).status_code == 200
        assert client.post("/auth/reset-password/validate", json={"token": reset}).status_code == 400
        assert client.delete(f"/users/{user_id}", headers=headers).status_code == 204


def test_export_isolation_and_latest_result(client):
    from datetime import datetime, timezone
    from app.schemas.incidents import AnalysisResult
    from app.services.incident_reporting import export_csv
    first = upload(client, "/api/incidents/analyze")
    assert first.status_code == 200
    first_export = client.get("/api/incidents/results/export")
    assert first_export.text == export_csv(AnalysisResult.model_validate(first.json()))
    assert first_export.headers["content-disposition"] == 'attachment; filename="results.csv"'
    assert first_export.headers["content-type"].startswith("text/csv")
    original = app.dependency_overrides[get_current_user]
    for other in [User(id=8, email="other@example.com", hashed_password="test", role=UserRole.USER),
                  User(id=7, email="reused@example.com", hashed_password="test", role=UserRole.USER, created_at=datetime(2030, 1, 1, tzinfo=timezone.utc))]:
        app.dependency_overrides[get_current_user] = lambda: other
        assert client.get("/api/incidents/results/export").status_code == 404
    app.dependency_overrides[get_current_user] = original
    header = DATASET.read_bytes().splitlines()[0] + b"\n"
    assert upload(client, "/api/incidents/analyze", data=header).json()["total_records"] == 0
    assert "total_records,0" in client.get("/api/incidents/results/export").text


def test_methods_missing_upload_and_sanitized_internal_errors(client, monkeypatch, caplog):
    assert client.post("/api/incidents/analyze").status_code == 422
    assert client.get("/api/incidents/analyze").status_code == 405
    assert client.post("/api/incidents/results/export").status_code == 405
    assert client.post("/incidents/analyze").status_code == 404
    def fail(*args, **kwargs):
        raise RuntimeError("PRIVATE_SYNTHETIC_SENTINEL")
    monkeypatch.setattr("app.api.routes.incidents.analyze_incident_stream", fail)
    response = upload(client, "/api/incidents/analyze")
    assert response.status_code == 500
    assert response.json() == {"detail": {"code": "analysis_failed"}}
    assert "PRIVATE_SYNTHETIC_SENTINEL" not in response.text + caplog.text


def test_privacy_in_response_export_storage_and_logs(client, caplog):
    from app.db.tinydb import get_db
    sentinel = "PRIVATE_SYNTHETIC_SENTINEL"
    header = DATASET.read_bytes().splitlines()[0].decode()
    data = header + f"\n{sentinel},2024-01-01,US-TX-01,US,BILLING,{sentinel},CLOSED,{sentinel},4\n"
    response = upload(client, "/api/incidents/analyze", data=data.encode())
    assert response.status_code == 200
    exported = client.get("/api/incidents/results/export")
    assert sentinel not in response.text + exported.text + caplog.text + str(get_db().table("incident_results").all())
    assert response.json()["invalid_records"] == 1


def test_non_file_multipart_field_does_not_echo_input(client):
    response = client.post("/api/incidents/analyze", data={"file": "PRIVATE_MULTIPART_SENTINEL"})
    assert response.status_code == 422
    assert response.json() == {"detail": {"code": "invalid_upload"}}
    assert "PRIVATE_MULTIPART_SENTINEL" not in response.text


def test_incident_reads(client, tmp_path, monkeypatch):
    from tinydb import TinyDB
    from scripts.seed_incidents import DEFAULT_CSV, seed_incidents

    with TinyDB(tmp_path / "read.json") as db:
        monkeypatch.setattr("app.api.routes.incidents.get_db", lambda: db)
        url = "/api/incidents"
        assert client.get(url).json() == []
        seed_incidents(db, DEFAULT_CSV)
        response = client.get(url, params={"status": "open"})
        assert response.status_code == 200
        opened = response.json()
        assert len(opened) == 28
        assert all(ticket["status"] == "open" for ticket in opened)
        assert all("_import_key" not in ticket for ticket in opened)
        ticket = opened[0]
        assert client.get(f"{url}/{ticket['id']}").json() == ticket
        filters = {key: ticket[key] for key in ("status", "origin", "category", "branch")}
        assert client.get(url, params=filters).json() == [
            item for item in opened if all(item[key] == value for key, value in filters.items())
        ]
        empty = client.get(url, params={"status": "in_progress", "branch": "austin_north"})
        assert (empty.status_code, empty.json()) == (200, [])
        invalid = client.get(url, params={"status": "pendiente"})
        assert invalid.status_code == 400
        assert invalid.json()["detail"]["field"] == "status"
        assert client.get(f"{url}/00000000-0000-4000-8000-000000000000").status_code == 404


def test_incident_summary_seeded_counts_catalog_and_detail(client, tmp_path, monkeypatch):
    from collections import Counter
    from tinydb import TinyDB
    from app.api.routes.incidents import FILTER_VALUES
    from scripts.seed_incidents import DEFAULT_CSV, seed_incidents

    with TinyDB(tmp_path / "summary-seeded.json") as db:
        monkeypatch.setattr("app.api.routes.incidents.get_db", lambda: db)
        seed_incidents(db, DEFAULT_CSV)
        response = client.get("/api/incidents/summary")
        assert response.status_code == 200
        summary = response.json()
        assert summary["total"] == 94
        assert summary["by_status"] == {"open": 28, "in_progress": 0, "resolved": 52, "discarded": 14}
        assert summary["by_category"]["patient_experience"] == 61
        assert summary["by_category"]["billing_error"] == 20
        assert summary["by_category"]["other"] == 13
        assert summary["by_origin"] == {"customer": 94, "branch": 0, "internal": 0}
        assert set(summary["by_category"]) == set(FILTER_VALUES["category"])
        assert set(summary["by_status"]) == set(FILTER_VALUES["status"])
        assert set(summary["by_origin"]) == set(FILTER_VALUES["origin"])
        assert set(summary["by_branch"]) == set(FILTER_VALUES["branch"])
        assert all(sum(summary[key].values()) == 94 for key in ("by_status", "by_category", "by_origin", "by_branch"))
        expected_branches = Counter(ticket["branch"] for ticket in db.table("incidents").all())
        assert summary["by_branch"] == {branch: expected_branches[branch] for branch in FILTER_VALUES["branch"]}
        ticket = db.table("incidents").all()[0]
        assert client.get(f"/api/incidents/{ticket['id']}").json()["id"] == ticket["id"]


def test_incident_summary_empty_and_after_status_transition(client, tmp_path, monkeypatch):
    from tinydb import TinyDB
    from app.api.routes.incidents import FILTER_VALUES
    from scripts.seed_incidents import DEFAULT_CSV, seed_incidents

    with TinyDB(tmp_path / "summary-empty.json") as db:
        monkeypatch.setattr("app.api.routes.incidents.get_db", lambda: db)
        empty = client.get("/api/incidents/summary")
        assert empty.status_code == 200
        assert empty.json() == {
            "total": 0,
            "by_status": {value: 0 for value in FILTER_VALUES["status"]},
            "by_category": {value: 0 for value in FILTER_VALUES["category"]},
            "by_origin": {value: 0 for value in FILTER_VALUES["origin"]},
            "by_branch": {value: 0 for value in FILTER_VALUES["branch"]},
        }
        seed_incidents(db, DEFAULT_CSV)
        before = client.get("/api/incidents/summary").json()
        opened = db.table("incidents").search(__import__("tinydb").Query().status == "open")[0]
        patched = client.patch(f"/api/incidents/{opened['id']}/status", json={"status": "in_progress"})
        assert patched.status_code == 200
        after = client.get("/api/incidents/summary").json()
        assert after["total"] == 94
        assert after["by_status"] == {"open": 27, "in_progress": 1, "resolved": 52, "discarded": 14}
        for key in ("by_category", "by_origin", "by_branch"):
            assert after[key] == before[key]


def test_create_incident_with_seeded_database(client, tmp_path, monkeypatch):
    from datetime import datetime, timezone
    from tinydb import TinyDB
    from scripts.seed_incidents import DEFAULT_CSV, seed_incidents

    with TinyDB(tmp_path / "create.json") as db:
        monkeypatch.setattr("app.api.routes.incidents.get_db", lambda: db)
        seed_incidents(db, DEFAULT_CSV)
        url = "/api/incidents"
        assert len(client.get(url).json()) == 94
        payload = {"title": "Equipment issue", "description": "A device needs review", "category": "clinical_equipment", "origin": "internal"}
        response = client.post(url, json=payload)
        assert response.status_code == 400
        assert response.json()["detail"]["field"] == "branch"
        assert len(db.table("incidents")) == 94
        payload["branch"] = "central"
        response = client.post(url, json=payload)
        assert response.status_code == 201
        ticket = response.json()
        assert all(ticket[field] == value for field, value in payload.items())
        assert ticket["status"] == "open"
        assert ticket["created_at"] == ticket["updated_at"]
        assert datetime.fromisoformat(ticket["created_at"].replace("Z", "+00:00")).utcoffset() == timezone.utc.utcoffset(None)
        assert len(db.table("incidents")) == 95
        assert client.get(f"{url}/{ticket['id']}").json() == ticket
        assert "_import_key" not in db.table("incidents").all()[-1]


@pytest.mark.parametrize("field,value", [("title", "   "), ("description", "\t"), ("category", "invalid"), ("origin", "invalid"), ("branch", "invalid")])
def test_create_rejects_invalid_fields(client, tmp_path, monkeypatch, field, value):
    from tinydb import TinyDB
    with TinyDB(tmp_path / "invalid.json") as db:
        monkeypatch.setattr("app.api.routes.incidents.get_db", lambda: db)
        payload = {"title": "Title", "description": "Description", "category": "other", "origin": "internal", "branch": "central"}
        payload[field] = value
        response = client.post("/api/incidents", json=payload)
        assert response.status_code == 400
        assert response.json()["detail"]["field"] == field
        assert len(db.table("incidents")) == 0


def test_create_requires_authentication():
    with TestClient(app) as client:
        response = client.post("/api/incidents", json={"title": "Example"})
        assert response.status_code == 401


def test_create_hides_storage_errors(client, monkeypatch):
    def fail():
        raise RuntimeError("PRIVATE_STORAGE_SENTINEL")

    monkeypatch.setattr("app.api.routes.incidents.get_db", fail)
    response = client.post("/api/incidents", json={"title": "Title", "description": "Description", "category": "other", "origin": "internal", "branch": "central"})
    assert response.status_code == 500
    assert response.json() == {"detail": "Unable to create the incident."}
    assert "PRIVATE_STORAGE_SENTINEL" not in response.text


@pytest.mark.parametrize("old_status,new_status", [
    ("open", "in_progress"), ("open", "discarded"),
    ("in_progress", "resolved"), ("in_progress", "discarded"),
])
def test_status_transition_updates_patch_get_and_tinydb(client, tmp_path, monkeypatch, old_status, new_status):
    from datetime import datetime, timezone
    from tinydb import TinyDB

    original = {
        "id": "00000000-0000-4000-8000-000000000123",
        "title": "Synthetic status test", "description": "Device needs review",
        "category": "clinical_equipment", "status": old_status,
        "origin": "internal", "branch": "central",
        "created_at": "2024-01-01T10:00:00+00:00", "updated_at": "2024-01-02T10:00:00+00:00",
        "_import_key": "preserved-import-metadata",
    }
    with TinyDB(tmp_path / "status.json") as db:
        table = db.table("incidents")
        table.insert(original)
        monkeypatch.setattr("app.api.routes.incidents.get_db", lambda: db)
        response = client.patch(f"/api/incidents/{original['id']}/status", json={"status": new_status})
        assert response.status_code == 200
        patched = response.json()
        assert patched["status"] == new_status
        assert "_import_key" not in patched
        parsed_updated_at = datetime.fromisoformat(patched["updated_at"].replace("Z", "+00:00"))
        assert parsed_updated_at.utcoffset() == timezone.utc.utcoffset(None)
        assert parsed_updated_at > datetime.fromisoformat(original["updated_at"])
        expected = {key: value for key, value in original.items() if key != "_import_key"}
        expected["created_at"] = "2024-01-01T10:00:00Z"
        expected.update(status=new_status, updated_at=patched["updated_at"])
        assert patched == expected
        assert client.get(f"/api/incidents/{original['id']}").json() == patched
        stored = table.all()[0]
        assert stored == {**original, "status": new_status, "updated_at": parsed_updated_at.isoformat()}


@pytest.mark.parametrize("old_status,new_status", [
    ("open", "resolved"), ("in_progress", "open"),
    ("resolved", "discarded"), ("discarded", "in_progress"),
])
def test_rejected_status_transition_preserves_complete_tinydb_record(client, tmp_path, monkeypatch, old_status, new_status):
    from tinydb import TinyDB

    original = {
        "id": "00000000-0000-4000-8000-000000000456",
        "title": "Synthetic unchanged ticket", "description": "No private information",
        "category": "other", "status": old_status,
        "origin": "branch", "branch": "central",
        "created_at": "2023-04-05T06:07:08+00:00", "updated_at": "2024-04-05T06:07:08+00:00",
        "_import_key": "must-remain-untouched",
    }
    with TinyDB(tmp_path / "rejected-status.json") as db:
        table = db.table("incidents")
        table.insert(original)
        monkeypatch.setattr("app.api.routes.incidents.get_db", lambda: db)
        response = client.patch(f"/api/incidents/{original['id']}/status", json={"status": new_status})
        assert response.status_code == 400
        assert response.json()["detail"]["field"] == "status"
        assert table.all() == [original]


@pytest.mark.parametrize("payload", [
    {"status": "unknown"}, {"status": "discarded", "title": "extra"}, {"title": "open"},
])
def test_status_endpoint_accepts_only_a_valid_status_field(client, tmp_path, monkeypatch, payload):
    from tinydb import TinyDB
    with TinyDB(tmp_path / "invalid-status.json") as db:
        monkeypatch.setattr("app.api.routes.incidents.get_db", lambda: db)
        response = client.patch("/api/incidents/00000000-0000-4000-8000-000000000999/status", json=payload)
        assert response.status_code == 400
        assert response.json()["detail"]["field"] == "status"
        assert db.table("incidents").all() == []


def test_status_endpoint_requires_authentication():
    with TestClient(app) as unauthenticated:
        response = unauthenticated.patch(
            "/api/incidents/00000000-0000-4000-8000-000000000000/status",
            json={"status": "discarded"},
        )
        assert response.status_code == 401


def test_status_endpoint_returns_not_found_for_missing_ticket(client, tmp_path, monkeypatch):
    from tinydb import TinyDB
    with TinyDB(tmp_path / "missing-status.json") as db:
        monkeypatch.setattr("app.api.routes.incidents.get_db", lambda: db)
        response = client.patch(
            "/api/incidents/00000000-0000-4000-8000-000000000999/status",
            json={"status": "discarded"},
        )
        assert response.status_code == 404
