"""Authentication endpoints."""

from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from app.api.deps import CurrentUser, get_user_service
from app.core.security import create_access_token, verify_password
from app.repositories.user_repository import UserRepository
from app.schemas.auth import AuthMeResponse, LoginRequest, TokenResponse
from app.services.email_service import send_auth_notification
from app.services.user_service import UserService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, background_tasks: BackgroundTasks) -> TokenResponse:
    user = UserRepository().get_by_email(str(payload.email).lower())
    if user is None or not user.is_active or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        token = create_access_token(str(user.id))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail="Authentication is not configured") from exc
    background_tasks.add_task(send_auth_notification, user.email, "login")
    return TokenResponse(access_token=token)


@router.get("/me", response_model=AuthMeResponse)
def auth_me(
    current_user: CurrentUser,
    service: Annotated[UserService, Depends(get_user_service)],
) -> AuthMeResponse:
    profile = service.get_profile(current_user.id)
    return AuthMeResponse(
        email=current_user.email,
        role=current_user.role,
        profile=profile,
    )
