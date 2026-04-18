import asyncio
import json
import logging
import secrets
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import async_session_factory, get_session
from ..models.job import Job, JobStatus
from ..redis_client import get_redis
from ..schemas.job import CreateJobRequest, CreateJobResponse, JobResponse, VertexUrlResponse
from ..storage import generate_presigned_url

log = logging.getLogger(__name__)
router = APIRouter(prefix="/jobs", tags=["jobs"])

# Strong references to in-process background tasks so they aren't GC'd mid-run
_background_tasks: set[asyncio.Task] = set()


def _job_to_response(job: Job) -> JobResponse:
    return JobResponse(
        id=job.id,
        videoUrl=job.video_url,
        sha256=job.sha256,
        status=job.status,
        progressPct=job.progress_pct,
        durationSec=job.duration_sec,
        vertexBlobUrl=job.vertex_blob_key,
        hasAudio=job.has_audio,
        hasSpeech=job.has_speech,
        errorMessage=job.error_message,
        createdAt=job.created_at,
        updatedAt=job.updated_at,
    )


@router.post("", status_code=202, response_model=CreateJobResponse)
async def create_job(
    body: CreateJobRequest,
    session: AsyncSession = Depends(get_session),
) -> CreateJobResponse:
    job_id = "jb_" + secrets.token_urlsafe(6)[:8]
    job = Job(
        id=job_id,
        video_url=body.videoUrl,
        status=JobStatus.queued,
        progress_pct=0,
        has_audio=True,
        has_speech=True,
    )
    try:
        session.add(job)
        await session.commit()
    except Exception as exc:
        log.exception("Database error creating job %s", job_id)
        raise HTTPException(
            status_code=503, detail="Database unavailable — check DATABASE_URL"
        ) from exc

    # Try ARQ/Redis first; fall back to an in-process asyncio task if Redis is unavailable.
    queued_via_redis = False
    try:
        from arq import create_pool as arq_create_pool  # lazy — avoids redis chain in tests
        from arq.connections import RedisSettings
        redis_settings = RedisSettings.from_dsn(settings.redis_url)
        pool = await arq_create_pool(redis_settings)
        await pool.enqueue_job("process_video_job", job_id=job_id, video_url=body.videoUrl)
        await pool.close()
        queued_via_redis = True
    except Exception as exc:
        log.warning(
            "Redis unavailable for job %s (%s) — running in-process", job_id, exc
        )

    if not queued_via_redis:
        from ..worker.tasks import process_video_job  # lazy — avoids arq worker imports
        task = asyncio.create_task(
            process_video_job({}, job_id=job_id, video_url=body.videoUrl)
        )
        _background_tasks.add(task)
        task.add_done_callback(_background_tasks.discard)

    log.info("Created job %s for %s (redis=%s)", job_id, body.videoUrl, queued_via_redis)
    return CreateJobResponse(
        id=job_id,
        shareUrl=f"{settings.app_base_url}/j/{job_id}",
    )


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str, session: AsyncSession = Depends(get_session)) -> JobResponse:
    job = await session.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return _job_to_response(job)


@router.get("/{job_id}/stream")
async def stream_job(job_id: str, request: Request) -> StreamingResponse:
    """SSE endpoint — uses Redis pub/sub when available, falls back to DB polling."""

    async def _redis_stream() -> AsyncGenerator[str, None]:
        redis = get_redis()
        pubsub = redis.pubsub()
        await pubsub.subscribe(f"job:{job_id}:progress")
        try:
            async for message in pubsub.listen():
                if await request.is_disconnected():
                    break
                if message["type"] == "message":
                    data = message["data"]
                    if isinstance(data, bytes):
                        data = data.decode()
                    yield f"data: {data}\n\n"
                    try:
                        if json.loads(data).get("status") in ("complete", "failed"):
                            break
                    except Exception:
                        pass
        finally:
            await pubsub.unsubscribe(f"job:{job_id}:progress")
            await pubsub.close()

    async def _db_poll_stream() -> AsyncGenerator[str, None]:
        """Poll the database every second and emit an event on any change."""
        last_pct, last_status = -1, ""
        while True:
            if await request.is_disconnected():
                break
            async with async_session_factory() as session:
                job = await session.get(Job, job_id)
            if job:
                pct = job.progress_pct
                status = str(job.status)
                if pct != last_pct or status != last_status:
                    payload = json.dumps({
                        "jobId": job_id,
                        "progressPct": pct,
                        "status": status,
                        "message": job.error_message or status,
                        "errorMessage": job.error_message,
                    })
                    yield f"data: {payload}\n\n"
                    last_pct, last_status = pct, status
                    if status in ("complete", "failed"):
                        break
            await asyncio.sleep(1)

    # Try pinging Redis; fall back to DB polling if unavailable
    use_redis = False
    try:
        await asyncio.wait_for(get_redis().ping(), timeout=2.0)
        use_redis = True
    except Exception:
        log.info("Redis unavailable — using DB polling for SSE on job %s", job_id)

    generator = _redis_stream() if use_redis else _db_poll_stream()

    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/{job_id}/vertex-url", response_model=VertexUrlResponse)
async def get_vertex_url(
    job_id: str, session: AsyncSession = Depends(get_session)
) -> VertexUrlResponse:
    job = await session.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != JobStatus.complete or not job.vertex_blob_key:
        raise HTTPException(status_code=409, detail="Job not yet complete")

    url, expires_at = await generate_presigned_url(job.vertex_blob_key, expires_in=900)
    return VertexUrlResponse(url=url, expiresAt=expires_at)
