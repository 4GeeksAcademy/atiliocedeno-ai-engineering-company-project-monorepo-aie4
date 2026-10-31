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
