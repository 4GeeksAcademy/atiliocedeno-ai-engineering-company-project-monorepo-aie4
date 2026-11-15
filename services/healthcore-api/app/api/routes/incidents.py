"""Authenticated incident analysis and latest-result export."""
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response
from fastapi.exceptions import RequestValidationError
from fastapi.routing import APIRoute
from starlette.concurrency import run_in_threadpool

from app.api.deps import CurrentUser
from app.repositories.incident_results_repository import IncidentResultsRepository
from app.schemas.incidents import AnalysisAPIResponse
from app.services.incident_analysis import analyze_incident_stream
from app.services.incident_reporting import export_csv

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
        report = await run_in_threadpool(analyze_incident_stream, file.file, max_bytes=MAX_UPLOAD_BYTES)
        await run_in_threadpool(IncidentResultsRepository().save, owner_key(current_user), report)
        return AnalysisAPIResponse.model_validate(report.model_dump())
    except HTTPException:
        raise
    except ValueError as exc:
        code = str(exc)
        if code not in {"file_too_large", "invalid_encoding", "invalid_csv", "invalid_headers", "empty_file"}:
            raise HTTPException(status_code=500, detail={"code": "analysis_failed"}) from None
        raise HTTPException(status_code=413 if code == "file_too_large" else 400, detail={"code": code}) from None
    except Exception:
        # Do not log exception input, filename, raw rows, or validation objects.
        raise HTTPException(status_code=500, detail={"code": "analysis_failed"}) from None
    finally:
        await file.close()


@router.get("/results/export")
def export_incident_summary(current_user: CurrentUser) -> Response:
    try:
        report = IncidentResultsRepository().latest(owner_key(current_user))
        if report is None:
            raise HTTPException(status_code=404, detail={"code": "analysis_not_found"})
        return Response(export_csv(report), media_type="text/csv",
                        headers={"Content-Disposition": 'attachment; filename="results.csv"', "Cache-Control": "no-store"})
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail={"code": "export_failed"}) from None
