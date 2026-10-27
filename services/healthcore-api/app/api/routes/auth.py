"""Authentication endpoints."""

import os
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from app.api.deps import CurrentUser, get_user_service
from app.core.security import create_access_token, verify_password
from app.repositories.user_repository import UserRepository
from app.schemas.auth import (
    AuthMeResponse,
    AuthMessageResponse,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    ResetPasswordRequest,
    TokenResponse,
)
from app.services.email_service import send_auth_notification
from app.services.password_service import PasswordService
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


@router.post("/forgot-password", response_model=AuthMessageResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
) -> AuthMessageResponse:
    """Request a reset link without revealing whether the account exists."""
    user = UserRepository().get_by_email(str(payload.email).lower())
    if user is not None and user.is_active and user.id is not None:
        try:
            token = PasswordService().issue_reset(user)
        except RuntimeError:
            # Keep the public response indistinguishable when auth configuration is missing.
            token = None
        if token is not None:
            frontend_url = os.getenv("HEALTHCORE_FRONTEND_URL", "http://localhost:3000").rstrip("/")
            reset_url = f"{frontend_url}/reset-password?token={token}"
            background_tasks.add_task(send_auth_notification, user.email, "password_reset", reset_url)
    return AuthMessageResponse(message="If an account exists for that email, a reset link will be sent.")


@router.post("/reset-password", response_model=AuthMessageResponse)
def reset_password(payload: ResetPasswordRequest) -> AuthMessageResponse:
    """Consume a valid one-time reset token and replace the password hash."""
    if not PasswordService().reset_password(payload.token, payload.new_password):
        raise HTTPException(status_code=400, detail="Invalid, expired, or already used reset token")
    return AuthMessageResponse(message="Password has been reset successfully.")


@router.post("/change-password", response_model=AuthMessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    current_user: CurrentUser,
) -> AuthMessageResponse:
    """Change the authenticated user's password after verifying the current one."""
    try:
        PasswordService().change_password(current_user, payload.current_password, payload.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Current password is incorrect") from exc
    except LookupError as exc:
        raise HTTPException(status_code=404, detail="User not found") from exc
    return AuthMessageResponse(message="Password changed successfully.")


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
