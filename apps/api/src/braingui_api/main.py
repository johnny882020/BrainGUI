import logging
import logging.config
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .routers import health, jobs

_LOGGING: dict = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s %(levelname)-8s %(name)s  %(message)s",
            "datefmt": "%Y-%m-%dT%H:%M:%S",
        },
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "default"},
    },
    "root": {"level": "INFO", "handlers": ["console"]},
    "loggers": {
        "uvicorn": {"propagate": True},
        "sqlalchemy.engine": {"level": "WARNING", "propagate": True},
    },
}

log = logging.getLogger(__name__)

# Compiled React frontend (present when built via root Dockerfile)
_WEB_DIST = Path("/app/web/dist")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logging.config.dictConfig(_LOGGING)
    log.info("BrainGUI API starting (frontend bundled=%s)", _WEB_DIST.exists())
    yield
    log.info("BrainGUI API shutting down")
    from .redis_client import close_redis
    await close_redis()


def create_app() -> FastAPI:
    app = FastAPI(
        title="BrainGUI API",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        # Allow any *.onrender.com preview/staging domain
        allow_origin_regex=r"https://[a-zA-Z0-9\-]+\.onrender\.com",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health.router, prefix="/api/v1")
    app.include_router(jobs.router, prefix="/api/v1")

    # Serve React SPA when frontend is bundled into the Docker image.
    # API routes above take priority; StaticFiles catches everything else.
    if _WEB_DIST.exists():
        app.mount("/", StaticFiles(directory=str(_WEB_DIST), html=True), name="static")

    return app


app = create_app()
