import json

import redis.asyncio as aioredis

from .config import settings

_pool: aioredis.ConnectionPool | None = None


def get_redis() -> aioredis.Redis:
    global _pool
    if _pool is None:
        _pool = aioredis.ConnectionPool.from_url(settings.redis_url)
    return aioredis.Redis(connection_pool=_pool)


async def publish_progress(job_id: str, pct: int, status: str, message: str) -> None:
    redis = get_redis()
    payload = json.dumps({"jobId": job_id, "progressPct": pct, "status": status, "message": message})
    await redis.publish(f"job:{job_id}:progress", payload)
