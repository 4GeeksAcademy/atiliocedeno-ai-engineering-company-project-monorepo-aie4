"""Store only the latest aggregate for each authenticated account incarnation."""
from tinydb import Query
from app.db.tinydb import get_db, get_db_lock
from app.schemas.incidents import AnalysisResult, ExportState


class IncidentResultsRepository:
    def save(self, owner_key: str, result: AnalysisResult) -> None:
        state = ExportState(owner_key=owner_key, result=result)
        with get_db_lock():
            get_db().table("incident_results").upsert(state.model_dump(mode="json"), Query().owner_key == owner_key)

    def latest(self, owner_key: str) -> AnalysisResult | None:
        with get_db_lock():
            document = get_db().table("incident_results").get(Query().owner_key == owner_key)
        return ExportState.model_validate(document).result if document else None
