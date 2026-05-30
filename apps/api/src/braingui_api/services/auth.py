import hashlib
import secrets
import string
import uuid
from datetime import UTC, datetime, timedelta

import structlog
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..models.user import User

logger = structlog.get_logger()
import os as _os

_bcrypt_rounds = 4 if _os.environ.get("APP_ENV") == "test" else 12
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=_bcrypt_rounds)

_REFRESH_PREFIX = "refresh:"
_ID_CHARS = string.ascii_letters + string.digits


def _new_id() -> str:
    return "u_" + "".join(secrets.choice(_ID_CHARS) for _ in range(20))


def hash_email(email: str) -> str:
    return hashlib.sha256(email.lower().strip().encode()).hexdigest()


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: str) -> str:
    settings = get_settings()
    expire = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": user_id, "exp": expire, "type": "access"}
    return jwt.encode(payload, settings.jwt_private_key, algorithm=settings.jwt_algorithm)


def create_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def decode_access_token(token: str) -> str:
    """Returns user_id or raises JWTError."""
    settings = get_settings()
    data = jwt.decode(token, settings.jwt_public_key, algorithms=[settings.jwt_algorithm])
    if data.get("type") != "access":
        raise JWTError("not an access token")
    return str(data["sub"])


async def store_refresh_token(redis, user_id: str, token: str) -> None:
    settings = get_settings()
    ttl = settings.refresh_token_expire_days * 86400
    await redis.setex(f"{_REFRESH_PREFIX}{token}", ttl, user_id)


async def rotate_refresh_token(redis, old_token: str) -> tuple[str, str]:
    """Validates old token, returns (user_id, new_token). Invalidates old on use."""
    user_id: str | None = await redis.get(f"{_REFRESH_PREFIX}{old_token}")
    if not user_id:
        raise ValueError("invalid or expired refresh token")
    await redis.delete(f"{_REFRESH_PREFIX}{old_token}")
    new_token = create_refresh_token()
    await store_refresh_token(redis, user_id, new_token)
    return user_id, new_token


async def invalidate_refresh_token(redis, token: str) -> None:
    await redis.delete(f"{_REFRESH_PREFIX}{token}")


async def get_user_by_id(db: AsyncSession, user_id: str) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def create_user(
    db: AsyncSession, username: str, email: str, password: str, public_key: str
) -> User:
    user = User(
        id=_new_id(),
        username=username,
        email_hash=hash_email(email),
        hashed_password=hash_password(password),
        public_key=public_key,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    logger.info("user_created", user_id_hash=user.id[:4] + "****")
    return user


async def authenticate(db: AsyncSession, email: str, password: str) -> User | None:
    email_hash = hash_email(email)
    result = await db.execute(select(User).where(User.email_hash == email_hash))
    user = result.scalar_one_or_none()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user
