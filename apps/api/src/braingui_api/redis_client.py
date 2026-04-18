import json
import logging

import redis.asyncio as aioredis

from .config import settings

log = logging.getLogger(__name__)

_redis: aioredis.Redis | None = None


def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(
            settings.redis_url,
            decode_responses=False,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
        )
    return _redis


async def close_redis() -> None:
    global _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None
        log.info("Redis connection closed")


async def publish_progress(job_id: str, pct: int, status: str, message: str) -> None:
    payload = json.dumps({
        "jobId": job_id,
        "progressPct": pct,
        "status": status,
        "message": message,
    })
    try:
        await get_redis().publish(f"job:{job_id}:progress", payload)
    except Exception:
        log.exception("Failed to publish progress for job %s", job_id)
