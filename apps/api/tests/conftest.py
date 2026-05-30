import base64
import os

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Generate a throwaway RSA keypair for tests before any app import reads config
_priv_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_priv_pem = _priv_key.private_bytes(
    serialization.Encoding.PEM,
    serialization.PrivateFormat.TraditionalOpenSSL,
    serialization.NoEncryption(),
)
_pub_pem = _priv_key.public_key().public_bytes(
    serialization.Encoding.PEM,
    serialization.PublicFormat.SubjectPublicKeyInfo,
)
os.environ["JWT_PRIVATE_KEY_B64"] = base64.b64encode(_priv_pem).decode()
os.environ["JWT_PUBLIC_KEY_B64"] = base64.b64encode(_pub_pem).decode()

import os
from unittest.mock import MagicMock, patch

os.environ["APP_ENV"] = "test"

# Patch rate limiter to no-op before any app module is imported
def _noop_limit(*args, **kwargs):
    def decorator(fn):
        return fn
    return decorator

_mock_limiter = MagicMock()
_mock_limiter.limit = _noop_limit

patch("braingui_api.middleware.rate_limit.limiter", _mock_limiter).start()

from braingui_api.database import Base, get_db  # noqa: E402
from braingui_api.main import app  # noqa: E402
from braingui_api.redis_client import get_redis  # noqa: E402

TEST_DB = "sqlite+aiosqlite:///:memory:"
engine = create_async_engine(TEST_DB)
TestSessionFactory = async_sessionmaker(engine, expire_on_commit=False)


async def override_db():
    async with TestSessionFactory() as session:
        yield session


class FakeRedis:
    def __init__(self):
        self._store: dict[str, tuple[str, int | None]] = {}

    async def setex(self, key, ttl, value):
        self._store[key] = (value, ttl)

    async def get(self, key):
        entry = self._store.get(key)
        return entry[0] if entry else None

    async def delete(self, key):
        self._store.pop(key, None)

    async def ping(self):
        return True


fake_redis = FakeRedis()


def override_redis():
    return fake_redis


app.dependency_overrides[get_db] = override_db
app.dependency_overrides[get_redis] = override_redis


@pytest.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    fake_redis._store.clear()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c
