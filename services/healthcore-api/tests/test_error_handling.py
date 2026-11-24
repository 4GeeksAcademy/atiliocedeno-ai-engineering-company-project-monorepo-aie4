"""Exercise public failures and the last committed database snapshot."""

import io
import json
from concurrent.futures import ThreadPoolExecutor
from urllib.error import HTTPError

import pytest
from fastapi.testclient import TestClient
from tinydb import TinyDB

from app.api.routes import incidents
from app.core.security import create_access_token, verify_password
from app.db import tinydb
from app.main import app
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate
from app.services import email_service
from app.services.password_service import PasswordService
from app.services.user_service import UserService


@pytest.fixture
def account(tmp_path, monkeypatch):
    path = tmp_path / "healthcore.json"
    with TinyDB(path, storage=tinydb.AtomicJSONStorage) as db:
        monkeypatch.setattr(tinydb, "_db", db)
        user = UserService().create_user(UserCreate(
            email="fixture@example.com", password="old-fixture-password",
        ))
        headers = {"Authorization": f"Bearer {create_access_token(str(user.id))}"}
        yield path, db, user, headers


@pytest.fixture
def client():
    return TestClient(app)


def create_incident(client, headers):
    response = client.post("/api/incidents", headers=headers, json={
        "title": "Synthetic incident", "description": "Synthetic test record",
        "category": "other", "origin": "internal", "branch": "central",
    })
    assert response.status_code == 201
    return response.json()


@pytest.mark.parametrize("operation", ["dump", "fsync", "replace"])
def test_failed_snapshot_write_preserves_incidents_and_authentication(
    client, account, monkeypatch, operation,
):
    path, db, _, headers = account
    incident = create_incident(client, headers)
    url = f"/api/incidents/{incident['id']}"
    db.table("suppliers").insert({"fixture": True})
    confirmed = path.read_bytes()

    def fail(*args, **kwargs):
        if operation == "dump":
            args[1].write('{"partial":')
        raise OSError("Synthetic I/O failure")

    with monkeypatch.context() as faults:
        module = tinydb.json if operation == "dump" else tinydb.os
        faults.setattr(module, operation, fail)
        response = client.patch(f"{url}/status", headers=headers, json={"status": "in_progress"})
        assert response.status_code == 500

    assert path.read_bytes() == confirmed
    assert list(path.parent.iterdir()) == [path]
    with TinyDB(path, storage=tinydb.AtomicJSONStorage) as reopened:
        monkeypatch.setattr(tinydb, "_db", reopened)
        assert reopened.table("suppliers").all() == [{"fixture": True}]
        assert client.get("/auth/me", headers=headers).status_code == 200
        assert client.get(url, headers=headers).json() == incident
        response = client.patch(f"{url}/status", headers=headers, json={"status": "in_progress"})
        assert response.status_code == 200
        updated = response.json()
        assert updated["id"] == incident["id"]
        assert updated["created_at"] == incident["created_at"]
        assert updated["updated_at"] > incident["updated_at"]
        assert updated["status"] == "in_progress"
        with TinyDB(path, storage=tinydb.AtomicJSONStorage) as another:
            assert another.table("incidents").all()[0]["status"] == "in_progress"


def test_postwrite_incident_failure_leaves_the_committed_status(client, account, monkeypatch):
    path, _, _, headers = account
    incident = create_incident(client, headers)
    url = f"/api/incidents/{incident['id']}"

    def fail(_):
        raise ValueError("Synthetic response failure")

    with monkeypatch.context() as faults:
        faults.setattr(incidents, "public_incident", fail)
        assert client.patch(f"{url}/status", headers=headers, json={"status": "in_progress"}).status_code == 500
    with TinyDB(path, storage=tinydb.AtomicJSONStorage) as reopened:
        monkeypatch.setattr(tinydb, "_db", reopened)
        assert client.get(url, headers=headers).json()["status"] == "in_progress"
        assert client.get("/api/incidents/summary", headers=headers).json()["by_status"]["in_progress"] == 1


@pytest.mark.parametrize(("route", "payload", "field"), [
    ("/auth/login", {"email": "fixture@example.com", "password": ["fixture-secret"]}, "password"),
    ("/users", {"email": "fixture@example.com", "password": ["fixture-secret"]}, "password"),
    ("/auth/reset-password/validate", {"token": ["fixture-secret"]}, "token"),
    ("/auth/reset-password", {"token": "fixture-secret", "new_password": ["fixture-secret"]}, "new_password"),
    ("/suppliers", {"name": "Fixture", "country": "UK", "currency": "USD",
                    "categories": ["other"], "monthly_rate": 5, "status": "active",
                    "notes": "fixture-secret"}, "categories"),
    ("/suppliers", {"name": "Fixture", "country": "UK", "currency": "USD",
                    "categories": ["medical_supplies"], "monthly_rate": 5, "status": "active",
                    "notes": "fixture-secret"}, "currency"),
])
def test_validation_preserves_fields_without_echoing_input(client, account, route, payload, field):
    _, _, _, headers = account
    response = client.post(route, json=payload, headers=headers)
    assert response.status_code == 422
    assert "fixture-secret" not in response.text
    assert any(entry["loc"][-1] == field for entry in response.json()["detail"])
    assert all(set(entry) == {"loc", "type", "msg"} for entry in response.json()["detail"])


def test_resend_does_not_log_the_provider_response(monkeypatch, caplog):
    monkeypatch.setenv("RESEND_API_KEY", "fixture-key")
    monkeypatch.setenv("RESEND_FROM_EMAIL", "fixture@example.com")

    def fail(*args, **kwargs):
        raise HTTPError("https://api.resend.com/emails", 422, "rejected", {}, io.BytesIO(b"fixture-secret"))

    monkeypatch.setattr(email_service, "urlopen", fail)
    email_service.send_auth_notification("fixture-recipient@example.com", "login")
    assert "login notification failed (HTTP 422)" in caplog.text
    assert "fixture-secret" not in caplog.text
    assert "fixture-recipient" not in caplog.text


def test_unexpected_storage_errors_remain_json_and_conflicts_remain_409(client, account, monkeypatch, caplog):
    _, db, _, headers = account
    payload = {"email": "fixture@example.com", "password": "fixture-register-password"}
    assert client.post("/users", json=payload).status_code == 409
    assert client.get("/auth/me").status_code == 401
    assert client.get("/users", headers=headers).status_code == 403

    def fail():
        raise json.JSONDecodeError("fixture-secret", "{", 1)

    with monkeypatch.context() as faults:
        faults.setattr(db.storage, "read", fail)
        for response in (
            client.post("/users", json=payload),
            client.get("/auth/me", headers=headers),
            client.get("/suppliers", headers=headers),
        ):
            assert response.status_code == 500
            assert response.json() == {"detail": "Unable to complete the request."}

    def fail_write(_):
        raise OSError("fixture-secret")

    monkeypatch.setattr(db.storage, "write", fail_write)
    payload["email"] = "another@example.com"
    response = client.post("/users", json=payload)
    assert response.status_code == 500
    assert response.json() == {"detail": "Unable to complete the request."}
    assert "fixture-secret" not in caplog.text


@pytest.mark.parametrize("prefix", ["a" * 72, "é" * 36])
def test_password_validation_counts_utf8_bytes(client, account, prefix):
    _, _, user, headers = account
    accepted = client.post("/users", json={"email": "new@example.com", "password": prefix})
    assert accepted.status_code == 201
    for url, data, field in (
        ("/users", {"email": "other@example.com", "password": prefix + "a"}, "password"),
        ("/auth/change-password", {"current_password": "old-fixture-password", "new_password": prefix + "a"}, "new_password"),
        ("/auth/reset-password", {"token": "fixture", "new_password": prefix + "a"}, "new_password"),
    ):
        response = client.post(url, json=data, headers=headers)
        assert response.status_code == 422
        assert response.json()["detail"][0]["loc"] == ["body", field]
    login = client.post("/auth/login", json={"email": user.email, "password": prefix + "a"})
    assert login.status_code == 401


def test_reset_can_retry_after_failed_commit_and_allows_only_one_use(client, account, monkeypatch):
    path, db, user, _ = account
    token = PasswordService().issue_reset(user)
    payload = {"token": token, "new_password": "replacement-fixture-password"}

    def fail(_):
        raise OSError("Synthetic write failure")

    with monkeypatch.context() as faults:
        faults.setattr(db.storage, "write", fail)
        assert client.post("/auth/reset-password", json=payload).status_code == 500
    with TinyDB(path, storage=tinydb.AtomicJSONStorage) as reopened:
        monkeypatch.setattr(tinydb, "_db", reopened)
        assert PasswordService().is_reset_token_valid(token)
        assert verify_password("old-fixture-password", UserRepository().get_by_id(user.id).hashed_password)
        candidates = [payload["new_password"], "other-fixture-password"]
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(
                lambda password: client.post("/auth/reset-password", json={
                    "token": token, "new_password": password,
                }).status_code,
                candidates,
            ))
        assert sorted(results) == [200, 400]
        stored_hash = UserRepository().get_by_id(user.id).hashed_password
        assert verify_password(candidates[results.index(200)], stored_hash)
        assert not verify_password(candidates[results.index(400)], stored_hash)
        assert not PasswordService().is_reset_token_valid(token)


def test_reset_request_keeps_account_existence_private_during_delivery_failure(client, account, monkeypatch, caplog):
    _, _, user, _ = account

    def fail(*args):
        raise OSError("synthetic private write failure")

    monkeypatch.setattr(PasswordService, "issue_reset", fail)
    known = client.post("/auth/forgot-password", json={"email": user.email})
    unknown = client.post("/auth/forgot-password", json={"email": "missing@example.com"})
    assert known.status_code == unknown.status_code == 200
    assert known.json() == unknown.json()
    assert "HealthCore could not prepare a password reset" in caplog.text
    assert "synthetic private" not in caplog.text

    monkeypatch.setattr("app.api.routes.auth.is_auth_configured", lambda: False)
    unavailable = client.post("/auth/forgot-password", json={"email": "missing@example.com"})
    assert unavailable.status_code == 503


def test_atomic_storage_reads_and_updates_a_legacy_tinydb_file(tmp_path):
    path = tmp_path / "legacy.json"
    with TinyDB(path) as legacy:
        legacy.table("users").insert({"email": "legacy-fixture@example.com"})
        document_id = legacy.table("incidents").insert({"status": "in_progress"})
    with TinyDB(path, storage=tinydb.AtomicJSONStorage) as modern:
        assert modern.table("users").all() == [{"email": "legacy-fixture@example.com"}]
        modern.table("incidents").update({"status": "resolved"}, doc_ids=[document_id])
    with TinyDB(path) as legacy:
        assert legacy.table("incidents").get(doc_id=document_id) == {"status": "resolved"}
        assert legacy.table("users").all() == [{"email": "legacy-fixture@example.com"}]
