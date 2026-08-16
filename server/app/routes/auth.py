from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.deps import create_access_token, get_current_user
from app.models.portfolio import Portfolio
from app.models.user import User
from app.schemas.auth import AuthResponse, GoogleLoginRequest, GoogleTokenRequest, UserResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/google-token", response_model=AuthResponse)
async def google_token_login(body: GoogleTokenRequest, db: AsyncSession = Depends(get_db)):
    google_id = body.sub
    if not google_id or not body.email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token data")

    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()

    if user:
        user.last_login = datetime.utcnow()
        if body.picture:
            user.avatar_url = body.picture
    else:
        user = User(
            google_id=google_id,
            email=body.email,
            display_name=body.name or body.email.split("@")[0],
            avatar_url=body.picture,
        )
        db.add(user)
        await db.flush()
        db.add(Portfolio(user_id=user.id, name="My Portfolio"))

    await db.commit()
    await db.refresh(user)

    token = create_access_token(user.id)
    return AuthResponse(
        access_token=token,
        user=UserResponse(
            id=str(user.id),
            email=user.email,
            display_name=user.display_name,
            avatar_url=user.avatar_url,
        ),
    )


@router.post("/google", response_model=AuthResponse)
async def google_login(body: GoogleLoginRequest, db: AsyncSession = Depends(get_db)):
    try:
        idinfo = google_id_token.verify_oauth2_token(
            body.id_token, google_requests.Request(), settings.google_client_id
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token"
        )

    google_id = idinfo["sub"]
    email = idinfo.get("email", "")
    name = idinfo.get("name", email.split("@")[0])
    picture = idinfo.get("picture")

    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()

    if user:
        user.last_login = datetime.utcnow()
        if picture:
            user.avatar_url = picture
    else:
        user = User(
            google_id=google_id,
            email=email,
            display_name=name,
            avatar_url=picture,
        )
        db.add(user)
        await db.flush()
        db.add(Portfolio(user_id=user.id, name="My Portfolio"))

    await db.commit()
    await db.refresh(user)

    token = create_access_token(user.id)
    return AuthResponse(
        access_token=token,
        user=UserResponse(
            id=str(user.id),
            email=user.email,
            display_name=user.display_name,
            avatar_url=user.avatar_url,
        ),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return UserResponse(
        id=str(user.id),
        email=user.email,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
    )
