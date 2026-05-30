from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from .config import get_settings
from .database import Base, engine
from .middleware.logging import RequestLoggingMiddleware
from .middleware.rate_limit import limiter
from .redis_client import close_redis
from .routers import auth, channels


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await close_redis()


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="BrainLink API",
        version="0.1.0",
        docs_url="/docs" if settings.app_env == "development" else None,
        redoc_url=None,
        lifespan=lifespan,
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["Authorization", "Content-Type"],
    )
    app.add_middleware(RequestLoggingMiddleware)

    app.include_router(auth.router)
    app.include_router(channels.router)

    Instrumentator().instrument(app).expose(app, endpoint="/metrics")

    @app.get("/api/v1/health")
    async def health():
        return {"status": "ok"}

    @app.get("/api/v1/ready")
    async def ready():
        from .redis_client import get_redis
        try:
            redis = get_redis()
            await redis.ping()
            redis_ok = True
        except Exception:
            redis_ok = False
        return {"redis": "ok" if redis_ok else "error"}

    return app


app = create_app()
