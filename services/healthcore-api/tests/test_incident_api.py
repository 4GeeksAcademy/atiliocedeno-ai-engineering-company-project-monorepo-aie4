"""API authentication and response-minimization tests."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

SERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

from app.api.deps import get_current_user  # noqa: E402
from app.main import app  # noqa: E402
from app.models.user import User, UserRole  # noqa: E402

SYNTHETIC_ID = "SYNTHETIC-INCIDENT-IDENTIFIER"
SYNTHETIC_DESCRIPTION = "Synthetic patient narrative only"
VALID_CSV = (
    "incident_id,incident_date,clinic,category,severity,status,description\n"
    f"{SYNTHETIC_ID},2025-03-01,Austin,fall,moderate,open,{SYNTHETIC_DESCRIPTION}\n"
)


@pytest.fixture
def client():  # type: ignore[no-untyped-def]
    app.dependency_overrides[get_current_user] = lambda: User(
        id=7,
        email="tester@example.com",
        hashed_password="not-a-real-hash",
        role=UserRole.USER,
    )
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_analyze_response_is_authenticated_and_minimized(client: TestClient) -> None:
    response = client.post(
        "/incidents/analyze",
        files={"file": ("incidents.csv", VALID_CSV, "text/csv")},
    )

    assert response.status_code == 200
    assert response.json()["valid_rows"] == 1
    body = response.text
    assert SYNTHETIC_ID not in body
    assert SYNTHETIC_DESCRIPTION not in body
    assert "issues" not in response.json()
    assert "dataset_fingerprint" not in response.json()


def test_analyze_requires_authentication() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/incidents/analyze",
            files={"file": ("incidents.csv", VALID_CSV, "text/csv")},
        )
    assert response.status_code == 401


def test_non_csv_filename_returns_specific_safe_error(client: TestClient) -> None:
    response = client.post(
        "/incidents/analyze",
        files={"file": ("incidents.txt", VALID_CSV, "text/plain")},
    )

    assert response.status_code == 400
    assert response.json() == {"detail": {"code": "invalid_file_type"}}


def test_export_does_not_contain_raw_identifiers_or_descriptions(client: TestClient) -> None:
    duplicate_csv = VALID_CSV + (
        f"{SYNTHETIC_ID},2025-03-02,Austin,fall,moderate,open,{SYNTHETIC_DESCRIPTION}\n"
    )
    response = client.post(
        "/incidents/export",
        files={"file": ("incidents.csv", duplicate_csv, "text/csv")},
    )

    assert response.status_code == 200
    assert "duplicate_incident_id" in response.text
    assert SYNTHETIC_ID not in response.text
    assert SYNTHETIC_DESCRIPTION not in response.text


def test_bad_csv_errors_do_not_echo_raw_values(client: TestClient) -> None:
    sensitive = "PRIVATE-NARRATIVE-DO-NOT-ECHO"
    response = client.post(
        "/incidents/analyze",
        files={"file": ("incidents.csv", f"wrong,headers\n{SYNTHETIC_ID},{sensitive}\n", "text/csv")},
    )

    assert response.status_code == 200
    assert sensitive not in response.text
    assert SYNTHETIC_ID not in response.text
    assert response.json()["invalid_rows"] == 0
