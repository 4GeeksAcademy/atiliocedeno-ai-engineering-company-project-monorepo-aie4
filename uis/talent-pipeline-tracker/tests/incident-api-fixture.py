"""Bridge synthetic portal test requests to a real FastAPI test client."""

import json
import os
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
from unittest.mock import patch

from fastapi.testclient import TestClient
from tinydb import Query, TinyDB


def main(path):
    from app.api.routes import incidents
    from app.core.security import create_access_token
    from app.db.tinydb import AtomicJSONStorage, get_db
    from app.main import app
    from app.schemas.user import UserCreate
    from app.services.user_service import UserService

    client = TestClient(app)
    user = UserService().create_user(UserCreate(
        email="incident-fixture@example.com", password="fixture-password-just-for-tests",
    ))
    token = create_access_token(str(user.id))
    headers = {"Authorization": f"Bearer {token}"}
    records = [
        client.post("/api/incidents", headers=headers, json={
            "title": f"Incident fixture {index}",
            "description": "Synthetic incident",
            "category": "other", "origin": "internal", "branch": "central",
        }).json()
        for index in range(4)
    ]
    print(json.dumps({"token": token, "records": records}), flush=True)

    for line in sys.stdin:
        request = json.loads(line)
        mode = request["mode"]
        if mode == "read":
            with TinyDB(path, storage=AtomicJSONStorage) as reopened:
                record = reopened.table("incidents").get(Query().id == request["id"])
            print(json.dumps(record), flush=True)
            continue
        args = (request["method"], request["path"])
        kwargs = {"headers": request["headers"], "content": request["body"]}
        if mode == "prewrite":
            with patch.object(get_db().storage, "write", side_effect=OSError("Synthetic storage failure")):
                response = client.request(*args, **kwargs)
        elif mode == "postwrite":
            with patch.object(incidents, "public_incident", side_effect=ValueError("Synthetic response failure")):
                response = client.request(*args, **kwargs)
        else:
            response = client.request(*args, **kwargs)
        print(json.dumps({"status": response.status_code, "headers": dict(response.headers),
                          "body": response.text}), flush=True)


if __name__ == "__main__":
    with TemporaryDirectory(prefix="healthcore-portal-test-") as directory:
        path = Path(directory) / "fixture.json"
        os.environ.update(
            HEALTHCORE_DB_PATH=str(path),
            HEALTHCORE_JWT_SECRET="synthetic-test-secret-not-for-deployment",
            PYTHON_DOTENV_DISABLED="1",
            RESEND_API_KEY="", RESEND_FROM_EMAIL="",
            HEALTHCORE_BOOTSTRAP_ADMIN_EMAIL="", HEALTHCORE_BOOTSTRAP_ADMIN_PASSWORD="",
        )
        sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "services" / "healthcore-api"))
        main(path)
