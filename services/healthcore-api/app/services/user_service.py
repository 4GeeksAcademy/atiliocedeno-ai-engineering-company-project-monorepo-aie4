"""Business rules for user accounts."""

from pydantic import EmailStr, TypeAdapter

from app.core.security import hash_password
from app.models.user import User, UserRole
from app.repositories.profile_repository import ProfileRepository
from app.repositories.user_repository import UserRepository
from app.schemas.profile import ProfileCreate, ProfileUpdate
from app.schemas.user import UserCreate, UserUpdate


class UserService:
    def __init__(
        self,
        users: UserRepository | None = None,
        profiles: ProfileRepository | None = None,
    ) -> None:
        self.users = users or UserRepository()
        self.profiles = profiles or ProfileRepository()

    def create_user(self, payload: UserCreate) -> User:
        email = str(payload.email).lower()
        if self.users.email_exists(email):
            raise ValueError("A user with this email already exists")
        user = self.users.create(
            User(email=email, hashed_password=hash_password(payload.password), role=UserRole.USER)
        )
        if payload.profile is not None:
            try:
                self.profiles.create(payload_to_profile(payload.profile, user.id))
            except Exception:
                # Keep user/profile creation atomic from the service perspective.
                self.users.delete(user.id)
                raise
        return user

    def bootstrap_admin(self, email: str, password: str) -> None:
        """Create the initial admin only when no admin accounts exist."""
        normalized_email = str(TypeAdapter(EmailStr).validate_python(email)).lower()
        if any(user.role == UserRole.ADMIN for user in self.users.list_all()):
            return
        if self.users.email_exists(normalized_email):
            raise RuntimeError("Bootstrap admin email already belongs to a non-admin user")
        self.users.create(
            User(
                email=normalized_email,
                hashed_password=hash_password(password),
                role=UserRole.ADMIN,
            )
        )

    def list_users(self) -> list[User]:
        return self.users.list_all()

    def get_user(self, user_id: int) -> User | None:
        return self.users.get_by_id(user_id)

    def update_user(
        self,
        user_id: int,
        payload: UserUpdate,
        *,
        role: UserRole | None = None,
        is_active: bool | None = None,
    ) -> User | None:
        current = self.users.get_by_id(user_id)
        if current is None:
            return None
        changes = payload.model_dump(exclude_unset=True, exclude_none=True)
        email = changes.pop("email", None)
        password = changes.pop("password", None)
        if email is not None:
            normalized_email = str(TypeAdapter(EmailStr).validate_python(email)).lower()
            if self.users.email_exists(normalized_email, exclude_user_id=user_id):
                raise ValueError("A user with this email already exists")
            changes["email"] = normalized_email
        if password is not None:
            changes["hashed_password"] = hash_password(password)
        if role is not None:
            changes["role"] = role
        if is_active is not None:
            changes["is_active"] = is_active
        updated = current.model_copy(update=changes)
        return self.users.update(user_id, updated)

    def delete_user(self, user_id: int) -> bool:
        if self.users.get_by_id(user_id) is None:
            return False
        # TinyDB has no multi-table transaction; hold the shared lock across both changes.
        from app.db.tinydb import get_db_lock

        with get_db_lock():
            self.profiles.delete_by_user_id(user_id)
            return self.users.delete(user_id)

    def get_profile(self, user_id: int):
        return self.profiles.get_by_user_id(user_id)

    def create_profile(self, user_id: int, payload: ProfileCreate):
        if self.users.get_by_id(user_id) is None:
            raise LookupError("User not found")
        if self.profiles.get_by_user_id(user_id) is not None:
            raise ValueError("A profile already exists for this user")
        return self.profiles.create(payload_to_profile(payload, user_id))

    def update_profile(self, user_id: int, payload: ProfileUpdate):
        current = self.profiles.get_by_user_id(user_id)
        if current is None:
            return None
        changes = payload.model_dump(exclude_unset=True, exclude_none=True)
        return self.profiles.update(current.id, current.model_copy(update=changes))

    def delete_profile(self, user_id: int) -> bool:
        return self.profiles.delete_by_user_id(user_id)

    def profile_belongs_to_user(self, profile_id: int, user_id: int) -> bool:
        profile = self.profiles.get_by_user_id(user_id)
        return profile is not None and profile.id == profile_id

    def delete_profile_by_id(self, profile_id: int) -> bool:
        return self.profiles.delete_by_id(profile_id)


def payload_to_profile(payload: ProfileCreate, user_id: int):
    from app.models.profile import Profile

    return Profile(user_id=user_id, **payload.model_dump())
