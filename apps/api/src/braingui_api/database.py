from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from .config import get_settings

settings = get_settings()

_engine_kwargs: dict = {"echo": settings.app_env == "development"}
if "postgresql" in settings.database_url:
    _engine_kwargs.update(pool_size=5, max_overflow=10, pool_recycle=1800)

engine = create_async_engine(settings.database_url, **_engine_kwargs)
AsyncSessionFactory = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionFactory() as session:
        yield session
