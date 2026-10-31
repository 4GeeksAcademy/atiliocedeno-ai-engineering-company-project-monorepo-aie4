"""User account CRUD endpoints."""

from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response, status

from app.api.deps import AdminUser, CurrentUser, get_user_service
from app.models.user import User, UserRole
from app.schemas.user import UserAdminUpdate, UserCreate, UserRead, UserUpdate
from app.services.email_service import send_auth_notification
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])


def _read_user(user: User, service: UserService) -> UserRead:
    profile = service.get_profile(user.id)
    return UserRead(**user.model_dump(), profile=profile)


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, background_tasks: BackgroundTasks) -> UserRead:
    service = UserService()
    try:
        user = service.create_user(payload)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    background_tasks.add_task(send_auth_notification, user.email, "registered")
    return _read_user(user, service)


@router.get("", response_model=list[UserRead])
def list_users(
    current_user: AdminUser,
    service: Annotated[UserService, Depends(get_user_service)],
) -> list[UserRead]:
    del current_user
    return [_read_user(user, service) for user in service.list_users()]


@router.get("/{user_id}", response_model=UserRead)
def get_user(
    user_id: int,
    current_user: CurrentUser,
    service: Annotated[UserService, Depends(get_user_service)],
) -> UserRead:
    if current_user.id != user_id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Cannot access another user's account")
    user = service.get_user(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return _read_user(user, service)


@router.put("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    payload: UserAdminUpdate,
    current_user: CurrentUser,
    service: Annotated[UserService, Depends(get_user_service)],
) -> UserRead:
    is_admin = current_user.role == UserRole.ADMIN
    if current_user.id != user_id and not is_admin:
        raise HTTPException(status_code=403, detail="Cannot update another user's account")
    if not is_admin and ("role" in payload.model_fields_set or "is_active" in payload.model_fields_set):
        raise HTTPException(status_code=403, detail="Only admins can change roles or account status")
    try:
        changes = UserUpdate.model_validate(
            payload.model_dump(exclude={"role", "is_active"}, exclude_unset=True)
        )
        updated = service.update_user(
            user_id,
            changes,
            role=payload.role if is_admin else None,
            is_active=payload.is_active if is_admin else None,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    if updated is None:
        raise HTTPException(status_code=404, detail="User not found")
    return _read_user(updated, service)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, current_user: CurrentUser, service: Annotated[UserService, Depends(get_user_service)]) -> Response:
    if current_user.id != user_id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Cannot delete another user's account")
    if not service.delete_user(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
