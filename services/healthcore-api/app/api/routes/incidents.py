"""Authenticated incident analysis and latest-result export."""
from datetime import datetime, timezone
import logging
from collections import Counter
from typing import get_args
from uuid import UUID

from tinydb import Query
from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from fastapi.responses import Response
from fastapi.exceptions import RequestValidationError
from fastapi.routing import APIRoute
from starlette.concurrency import run_in_threadpool

from app.api.deps import CurrentUser
from app.db.tinydb import get_db, get_db_lock
from app.models.incident import Incident, IncidentStatus, IncidentOrigin, IncidentBranch, IncidentCategory
from app.repositories.incident_results_repository import IncidentResultsRepository
from app.schemas.incidents import AnalysisAPIResponse
from app.services.incident_analysis import analyze_incident_stream
from app.services.incident_reporting import export_csv

logger = logging.getLogger(__name__)


class SafeUploadRoute(APIRoute):
    def get_route_handler(self):
        handler = super().get_route_handler()

        async def safe_handler(request):
            try:
                return await handler(request)
            except RequestValidationError:
                # FastAPI's default 422 may echo a malformed multipart field.
                raise HTTPException(status_code=422, detail={"code": "invalid_upload"}) from None
        return safe_handler


router = APIRouter(prefix="/api/incidents", tags=["incident analysis"], route_class=SafeUploadRoute)
MAX_UPLOAD_BYTES = 25_000_000


def owner_key(user: CurrentUser) -> str:
    # TinyDB may reuse numeric IDs after deletion; account creation time prevents leaks.
    return f"{user.id}:{user.created_at.isoformat()}"


@router.post("/analyze", response_model=AnalysisAPIResponse)
async def analyze_incidents(current_user: CurrentUser, file: UploadFile = File(...)) -> AnalysisAPIResponse:
    try:
        if not file.filename or not file.filename.lower().endswith(".csv"):
            raise HTTPException(status_code=415, detail={"code": "invalid_file_type"})
        if file.size is not None and file.size > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail={"code": "file_too_large"})
        try:
            report = await run_in_threadpool(analyze_incident_stream, file.file, max_bytes=MAX_UPLOAD_BYTES)
        except ValueError as exc:
            code = str(exc)
            if code not in {"file_too_large", "invalid_encoding", "invalid_csv", "invalid_headers", "empty_file"}:
                raise HTTPException(status_code=500, detail={"code": "analysis_failed"}) from None
            raise HTTPException(status_code=413 if code == "file_too_large" else 400, detail={"code": code}) from None
        except Exception:
            raise HTTPException(status_code=500, detail={"code": "analysis_failed"}) from None

        try:
            await run_in_threadpool(IncidentResultsRepository().save, owner_key(current_user), report)
        except Exception:
            raise HTTPException(status_code=500, detail={"code": "analysis_failed"}) from None
        return AnalysisAPIResponse.model_validate(report.model_dump())
    finally:
        try:
            await file.close()
        except OSError:
            logger.warning("HealthCore could not release an incident upload")


@router.get("/results/export")
def export_incident_summary(current_user: CurrentUser) -> Response:
    try:
        report = IncidentResultsRepository().latest(owner_key(current_user))
    except Exception:
        raise HTTPException(status_code=500, detail={"code": "export_failed"}) from None
    if report is None:
        raise HTTPException(status_code=404, detail={"code": "analysis_not_found"})
    try:
        content = export_csv(report)
    except Exception:
        raise HTTPException(status_code=500, detail={"code": "export_failed"}) from None
    return Response(content, media_type="text/csv",
                    headers={"Content-Disposition": 'attachment; filename="results.csv"', "Cache-Control": "no-store"})


FILTER_VALUES = {
    "status": get_args(IncidentStatus),
    "origin": get_args(IncidentOrigin),
    "branch": get_args(IncidentBranch),
    "category": get_args(IncidentCategory),
}


def public_incident(document: dict) -> Incident:
    return Incident.model_validate({key: value for key, value in document.items() if key != "_import_key"})


@router.post("", response_model=Incident, status_code=201)
async def create_incident(request: Request, current_user: CurrentUser) -> Incident:
    try:
        payload = await request.json()
    except ValueError:
        raise HTTPException(400, detail={"field": "body", "message": "Provide a valid JSON object."}) from None
    if not isinstance(payload, dict):
        raise HTTPException(400, detail={"field": "body", "message": "Provide a valid JSON object."})

    for field in ("title", "description", "category", "origin", "branch"):
        value = payload.get(field)
        if not isinstance(value, str) or not value.strip():
            raise HTTPException(400, detail={"field": field, "message": f"Enter a valid {field}."})
        if field in FILTER_VALUES and value not in FILTER_VALUES[field]:
            raise HTTPException(400, detail={"field": field, "message": f"Select a valid {field}."})
    if len(payload["title"]) > 120:
        raise HTTPException(400, detail={"field": "title", "message": "Use at most 120 characters."})

    try:
        now = datetime.now(timezone.utc)
        incident = Incident(
            title=payload["title"], description=payload["description"],
            category=payload["category"], origin=payload["origin"], branch=payload["branch"],
            status="open", created_at=now, updated_at=now,
        )
        with get_db_lock():
            get_db().table("incidents").insert(incident.model_dump(mode="json"))
        return incident
    except Exception:
        raise HTTPException(500, detail="Unable to create the incident.") from None


@router.get("", response_model=list[Incident])
def list_incidents(current_user: CurrentUser, status: str | None = None,
                   origin: str | None = None, branch: str | None = None,
                   category: str | None = None) -> list[Incident]:
    filters = {"status": status, "origin": origin, "branch": branch, "category": category}
    selected = {key: value for key, value in filters.items() if value is not None}
    for field, value in selected.items():
        if value not in FILTER_VALUES[field]:
            raise HTTPException(400, detail={"field": field, "message": f"Select a valid {field}."})
    try:
        with get_db_lock():
            documents = get_db().table("incidents").all()
        return [
            public_incident(doc) for doc in documents
            if all(doc.get(key) == value for key, value in selected.items())
        ]
    except Exception:
        raise HTTPException(500, detail="Unable to load incidents.") from None


@router.get("/summary")
def incident_summary(current_user: CurrentUser) -> dict:
    """Return catalog-complete aggregate counts across all incident records."""
    try:
        with get_db_lock():
            documents = get_db().table("incidents").all()
        counts = {
            field: Counter(document.get(field) for document in documents)
            for field in ("status", "category", "origin", "branch")
        }
        return {
            "total": len(documents),
            "by_status": {value: counts["status"][value] for value in FILTER_VALUES["status"]},
            "by_category": {value: counts["category"][value] for value in FILTER_VALUES["category"]},
            "by_origin": {value: counts["origin"][value] for value in FILTER_VALUES["origin"]},
            "by_branch": {value: counts["branch"][value] for value in FILTER_VALUES["branch"]},
        }
    except Exception:
        raise HTTPException(500, detail="Unable to load incident summary.") from None


@router.get("/{incident_id:uuid}", response_model=Incident)
def get_incident(incident_id: UUID, current_user: CurrentUser) -> Incident:
    try:
        with get_db_lock():
            document = get_db().table("incidents").get(Query().id == str(incident_id))
        if document is not None:
            return public_incident(document)
    except Exception:
        raise HTTPException(500, detail="Unable to load the incident.") from None
    raise HTTPException(404, detail="Incident not found.")


STATUS_TRANSITIONS = {
    "open": {"in_progress", "discarded"},
    "in_progress": {"resolved", "discarded"},
    "resolved": set(),
    "discarded": set(),
}


@router.patch("/{incident_id:uuid}/status", response_model=Incident)
async def update_incident_status(incident_id: UUID, request: Request, current_user: CurrentUser) -> Incident:
    try:
        payload = await request.json()
    except ValueError:
        raise HTTPException(400, detail={"field": "status", "message": "Provide a valid status transition."}) from None
    if (not isinstance(payload, dict) or set(payload) != {"status"}
            or not isinstance(payload.get("status"), str)
            or payload["status"] not in FILTER_VALUES["status"]):
        raise HTTPException(400, detail={"field": "status", "message": "Provide a valid status transition."})

    try:
        with get_db_lock():
            table = get_db().table("incidents")
            document = table.get(Query().id == str(incident_id))
            if document is None:
                raise HTTPException(404, detail="Incident not found.")
            if payload["status"] not in STATUS_TRANSITIONS.get(document.get("status"), set()):
                raise HTTPException(400, detail={"field": "status", "message": "This status transition is not allowed."})

            table.update(
                {"status": payload["status"], "updated_at": datetime.now(timezone.utc).isoformat()},
                Query().id == str(incident_id),
            )
            updated = table.get(Query().id == str(incident_id))
        return public_incident(updated)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(500, detail="Unable to update the incident status.") from None
