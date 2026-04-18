import asyncio
import secrets
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import get_session
from ..models.job import Job, JobStatus
from ..redis_client import get_redis
from ..schemas.job import CreateJobRequest, CreateJobResponse, JobResponse, VertexUrlResponse
from ..storage import generate_presigned_url

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _job_to_response(job: Job) -> JobResponse:
    return JobResponse(
        id=job.id,
        videoUrl=job.video_url,
        sha256=job.sha256,
        status=job.status,
        progressPct=job.progress_pct,
        durationSec=job.duration_sec,
        vertexBlobUrl=None,
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
    session.add(job)
    await session.commit()

    from arq import create_pool as arq_create_pool  # lazy import to avoid redis→jwt chain in tests
    from arq.connections import RedisSettings
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
    pool = await arq_create_pool(redis_settings)
    await pool.enqueue_job("process_video_job", job_id=job_id, video_url=body.videoUrl)
    await pool.close()

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
    """SSE endpoint for real-time job progress."""

    async def event_generator() -> AsyncGenerator[str, None]:
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
                    # Stop after 'complete' or 'failed'
                    import json
                    try:
                        parsed = json.loads(data)
                        if parsed.get("status") in ("complete", "failed"):
                            break
                    except Exception:
                        pass
        finally:
            await pubsub.unsubscribe(f"job:{job_id}:progress")
            await pubsub.close()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{job_id}/vertex-url", response_model=VertexUrlResponse)
async def get_vertex_url(job_id: str, session: AsyncSession = Depends(get_session)) -> VertexUrlResponse:
    job = await session.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != JobStatus.complete or not job.vertex_blob_key:
        raise HTTPException(status_code=409, detail="Job not yet complete")

    url, expires_at = await generate_presigned_url(job.vertex_blob_key, expires_in=900)
    return VertexUrlResponse(url=url, expiresAt=expires_at)
