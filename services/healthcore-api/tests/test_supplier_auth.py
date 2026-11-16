import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.mark.parametrize(("method", "path"), [
    ("GET", "/suppliers"),
    ("POST", "/suppliers"),
    ("GET", "/suppliers/1"),
    ("PATCH", "/suppliers/1/rate"),
    ("PATCH", "/suppliers/1/status"),
])
def test_supplier_operations_require_a_staff_session(method, path):
    with TestClient(app) as client:
        assert client.request(method, path).status_code == 401
