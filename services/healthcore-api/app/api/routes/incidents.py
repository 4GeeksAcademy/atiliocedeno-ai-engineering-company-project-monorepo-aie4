"""Authenticated endpoints for transient incident-file analysis."""

from __future__ import annotations

import csv
import io
from collections.abc import Iterator

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.api.deps import CurrentUser
from app.services.incident_analysis import analyze_incident_stream

router = APIRouter(prefix="/incidents", tags=["incident analysis"])
MAX_UPLOAD_BYTES = 25_000_000


class IncidentAnalysisResponse(BaseModel):
    """Minimal safe summary; omit even harmless row-level issues from JSON."""

    total_rows: int
    valid_rows: int
    invalid_rows: int
    duplicate_rows: int
    by_severity: dict[str, int]
    by_category: dict[str, int]
    by_status: dict[str, int]
    by_clinic: dict[str, int]


@router.post("/analyze", response_model=IncidentAnalysisResponse)
async def analyze_incidents(
    current_user: CurrentUser,
    file: UploadFile = File(...),
) -> IncidentAnalysisResponse:
    """Analyze a CSV upload in memory; neither input nor report is persisted."""
    del current_user  # Authentication is required; identity is intentionally not logged/stored.
    try:
        if not file.filename or not file.filename.lower().endswith(".csv"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"code": "invalid_file_type"})
        report = analyze_incident_stream(file.file, max_bytes=MAX_UPLOAD_BYTES)
    except ValueError as exc:
        code = str(exc)
        safe_code = code if code in {"file_too_large", "invalid_encoding", "invalid_csv"} else "invalid_csv"
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"code": safe_code}) from None
    except HTTPException:
        raise
    except Exception:
        # Never return parser exceptions, filenames, patient identifiers, or descriptions.
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"code": "invalid_csv"}) from None
    finally:
        await file.close()
    return IncidentAnalysisResponse(
        total_rows=report.total_rows,
        valid_rows=report.valid_rows,
        invalid_rows=report.invalid_rows,
        duplicate_rows=report.duplicate_rows,
        by_severity=report.by_severity,
        by_category=report.by_category,
        by_status=report.by_status,
        by_clinic=report.by_clinic,
    )


@router.post("/export")
async def export_incident_summary(
    current_user: CurrentUser,
    file: UploadFile = File(...),
) -> StreamingResponse:
    """Return sanitized issue codes and row positions, never source values."""
    del current_user
    try:
        if not file.filename or not file.filename.lower().endswith(".csv"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"code": "invalid_file_type"})
        report = analyze_incident_stream(file.file, max_bytes=MAX_UPLOAD_BYTES)
    except ValueError as exc:
        code = str(exc)
        safe_code = code if code in {"file_too_large", "invalid_encoding", "invalid_csv"} else "invalid_csv"
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"code": safe_code}) from None
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"code": "invalid_csv"}) from None
    finally:
        await file.close()

    def rows() -> Iterator[str]:
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(["row", "issue_code"])
        yield buffer.getvalue()
        for issue in report.issues:
            if issue.row is not None:
                buffer.seek(0)
                buffer.truncate(0)
                writer.writerow([issue.row, issue.code])
                yield buffer.getvalue()

    return StreamingResponse(
        rows(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="incident-analysis-findings.csv"'},
    )
