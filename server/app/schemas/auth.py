from pydantic import BaseModel


class GoogleLoginRequest(BaseModel):
    id_token: str


class GoogleTokenRequest(BaseModel):
    access_token: str
    email: str
    name: str | None = None
    picture: str | None = None
    sub: str


class AuthResponse(BaseModel):
    access_token: str
    user: "UserResponse"


class UserResponse(BaseModel):
    id: str
    email: str
    display_name: str
    avatar_url: str | None

    model_config = {"from_attributes": True}
