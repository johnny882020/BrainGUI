from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import JWTError
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..middleware.rate_limit import limiter
from ..redis_client import get_redis
from ..services import auth as auth_svc

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class RegisterBody(BaseModel):
    username: str
    email: EmailStr
    password: str
    public_key: str  # X25519 base64 public key from mobile client

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        if not (3 <= len(v) <= 32):
            raise ValueError("username must be 3–32 characters")
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("username may only contain letters, digits, _ or -")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 10:
            raise ValueError("password must be at least 10 characters")
        return v


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class RefreshBody(BaseModel):
    refresh_token: str


class LogoutBody(BaseModel):
    refresh_token: str


@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(
    request: Request,
    body: RegisterBody,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    from ..models.user import User
    existing = await db.execute(
        select(User).where(User.username == body.username)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="username already taken")

    user = await auth_svc.create_user(
        db, body.username, body.email, body.password, body.public_key
    )
    access = auth_svc.create_access_token(user.id)
    refresh = auth_svc.create_refresh_token()
    await auth_svc.store_refresh_token(redis, user.id, refresh)
    return {"userId": user.id, "accessToken": access, "refreshToken": refresh}


@router.post("/login")
@limiter.limit("10/minute")
async def login(
    request: Request,
    body: LoginBody,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    user = await auth_svc.authenticate(db, body.email, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="invalid credentials")
    access = auth_svc.create_access_token(user.id)
    refresh = auth_svc.create_refresh_token()
    await auth_svc.store_refresh_token(redis, user.id, refresh)
    return {"userId": user.id, "accessToken": access, "refreshToken": refresh}


@router.post("/refresh")
async def refresh(body: RefreshBody, redis=Depends(get_redis)):
    try:
        user_id, new_refresh = await auth_svc.rotate_refresh_token(redis, body.refresh_token)
    except ValueError:
        raise HTTPException(status_code=401, detail="invalid or expired refresh token")
    return {"accessToken": auth_svc.create_access_token(user_id), "refreshToken": new_refresh}


@router.delete("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(body: LogoutBody, redis=Depends(get_redis)):
    await auth_svc.invalidate_refresh_token(redis, body.refresh_token)
