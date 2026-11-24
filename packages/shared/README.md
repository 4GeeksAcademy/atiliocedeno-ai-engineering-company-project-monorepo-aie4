# Shared Python validation

`incident_record.py` contains the canonical Pydantic validation for HealthCore's historical incident CSV rows. The FastAPI analyzer and the incident-manager import transformation both use this `IncidentRecord`; it is deliberately distinct from the manager's `Incident` entity.

The shared package uses the service's existing Pydantic v2 dependency. `services/healthcore-api/app/schemas/incidents.py` re-exports the shared class and constants to preserve existing analyzer imports and behavior.