"""Authentication request and response schemas."""

from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field
from pydantic_core import PydanticCustomError

from app.core.security import BCRYPT_MAX_BYTES
from app.models.user import UserRole
from app.schemas.profile import ProfileRead


def validate_new_password(value: str) -> str:
    if len(value.encode("utf-8", errors="surrogatepass")) > BCRYPT_MAX_BYTES:
        raise PydanticCustomError("password_too_long", "Password exceeds the UTF-8 byte limit.")
    if any(0xD800 <= ord(character) <= 0xDFFF for character in value):
        raise PydanticCustomError("password_invalid", "Password contains invalid Unicode.")
    return value


NewPassword = Annotated[str, Field(min_length=8, max_length=128), AfterValidator(validate_new_password)]


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class ForgotPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    token: str = Field(min_length=1, max_length=4096)
    new_password: NewPassword


class ChangePasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    current_password: str = Field(min_length=1, max_length=128)
    new_password: NewPassword


class AuthMessageResponse(BaseModel):
    message: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AuthMeResponse(BaseModel):
    email: EmailStr
    role: UserRole
    profile: ProfileRead | None = None
