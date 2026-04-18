import json

import redis.asyncio as aioredis

from .config import settings

_redis: aioredis.Redis | None = None


def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.redis_url, decode_responses=False)
    return _redis


async def publish_progress(job_id: str, pct: int, status: str, message: str) -> None:
    redis = get_redis()
    payload = json.dumps({"jobId": job_id, "progressPct": pct, "status": status, "message": message})
    await redis.publish(f"job:{job_id}:progress", payload)
