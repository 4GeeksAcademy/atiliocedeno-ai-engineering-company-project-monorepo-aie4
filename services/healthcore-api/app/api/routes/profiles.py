"""Profile CRUD endpoints; profiles are always associated with a user."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.api.deps import CurrentUser, get_user_service
from app.models.user import UserRole
from app.schemas.profile import ProfileCreate, ProfileRead, ProfileUpdate
from app.services.user_service import UserService

router = APIRouter(prefix="/profiles", tags=["profiles"])


def _authorize_profile_access(request_user_id: int, current_user) -> None:
    if current_user.id != request_user_id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Cannot access another user's profile")


@router.post("/{user_id}", response_model=ProfileRead, status_code=status.HTTP_201_CREATED)
def create_profile(
    user_id: int,
    payload: ProfileCreate,
    current_user: CurrentUser,
    service: Annotated[UserService, Depends(get_user_service)],
) -> ProfileRead:
    _authorize_profile_access(user_id, current_user)
    try:
        profile = service.create_profile(user_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return ProfileRead.model_validate(profile)


@router.get("/me", response_model=ProfileRead)
def get_my_profile(
    current_user: CurrentUser,
    service: Annotated[UserService, Depends(get_user_service)],
) -> ProfileRead:
    profile = service.get_profile(current_user.id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return ProfileRead.model_validate(profile)


@router.put("/me", response_model=ProfileRead)
def update_my_profile(
    payload: ProfileUpdate,
    current_user: CurrentUser,
    service: Annotated[UserService, Depends(get_user_service)],
) -> ProfileRead:
    profile = service.update_profile(current_user.id, payload)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return ProfileRead.model_validate(profile)


@router.get("/{user_id}", response_model=ProfileRead)
def get_profile(
    user_id: int,
    current_user: CurrentUser,
    service: Annotated[UserService, Depends(get_user_service)],
) -> ProfileRead:
    _authorize_profile_access(user_id, current_user)
    profile = service.get_profile(user_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return ProfileRead.model_validate(profile)


@router.put("/{user_id}", response_model=ProfileRead)
def update_profile(
    user_id: int,
    payload: ProfileUpdate,
    current_user: CurrentUser,
    service: Annotated[UserService, Depends(get_user_service)],
) -> ProfileRead:
    _authorize_profile_access(user_id, current_user)
    profile = service.update_profile(user_id, payload)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return ProfileRead.model_validate(profile)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile(
    user_id: int,
    current_user: CurrentUser,
    service: Annotated[UserService, Depends(get_user_service)],
) -> Response:
    _authorize_profile_access(user_id, current_user)
    if not service.delete_profile(user_id):
        raise HTTPException(status_code=404, detail="Profile not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
