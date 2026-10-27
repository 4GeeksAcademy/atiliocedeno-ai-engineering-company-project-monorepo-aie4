"""Application entry point for the HealthCore API."""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import auth, profiles, users
from app.services.user_service import UserService

app = FastAPI(
    title="HealthCore API",
    description="Centralized backend service for HealthCore.",
    version="0.1.0",
)
frontend_origin = os.getenv("HEALTHCORE_FRONTEND_URL", "http://localhost:3000").rstrip("/")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(profiles.router)


@app.on_event("startup")
def bootstrap_initial_admin() -> None:
    """Optionally provision the first admin from explicit environment values."""
    email = os.getenv("HEALTHCORE_BOOTSTRAP_ADMIN_EMAIL")
    password = os.getenv("HEALTHCORE_BOOTSTRAP_ADMIN_PASSWORD")
    if email and password:
        UserService().bootstrap_admin(email, password)


@app.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    """Return a basic liveness response."""
    return {"status": "ok"}
