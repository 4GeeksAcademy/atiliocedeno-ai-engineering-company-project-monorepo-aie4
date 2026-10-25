"""Shared authentication and authorization dependencies."""

from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer

from app.core.security import decode_access_token
from app.models.user import User
from app.services.user_service import UserService

bearer_scheme = HTTPBearer(auto_error=False)


def get_user_service() -> UserService:
	"""Provide a service instance without exposing its constructor to FastAPI."""
	return UserService()


def get_current_user(credentials=Depends(bearer_scheme)) -> User:
	"""Decode a bearer token and return the corresponding active user."""
	if credentials is None:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Bearer token required",
			headers={"WWW-Authenticate": "Bearer"},
		)
	try:
		claims = decode_access_token(credentials.credentials)
		subject = claims.get("sub")
		user_id = int(subject)
	except (jwt.InvalidTokenError, TypeError, ValueError, RuntimeError) as exc:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Invalid or expired authentication token",
			headers={"WWW-Authenticate": "Bearer"},
		) from exc

	user = get_user_service().get_user(user_id)
	if user is None or not user.is_active:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="User is not active or no longer exists",
			headers={"WWW-Authenticate": "Bearer"},
		)
	return user


def require_admin(current_user: Annotated[User, Depends(get_current_user)]) -> User:
	if current_user.role.value != "admin":
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
	return current_user


CurrentUser = Annotated[User, Depends(get_current_user)]
AdminUser = Annotated[User, Depends(require_admin)]
