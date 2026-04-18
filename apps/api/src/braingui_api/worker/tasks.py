import tempfile
from pathlib import Path

from ..database import async_session_factory
from ..models.job import Job, JobStatus
from ..redis_client import publish_progress
from ..services.ingest import compute_chunks, download_and_normalize
from ..services.inference import run_tribe_inference
from ..services.stitch import stitch_chunks_to_bin
from ..storage import generate_presigned_url, upload_to_r2


async def _update_job(job_id: str, **kwargs) -> None:
    async with async_session_factory() as session:
        job = await session.get(Job, job_id)
        if job is None:
            return
        for k, v in kwargs.items():
            setattr(job, k, v)
        await session.commit()


async def process_video_job(ctx: dict, *, job_id: str, video_url: str) -> None:
    """ARQ background task: full processing pipeline for one job."""

    async def progress(pct: int, status: str, message: str) -> None:
        await _update_job(job_id, status=JobStatus(status), progress_pct=pct)
        await publish_progress(job_id, pct, status, message)

    try:
        with tempfile.TemporaryDirectory(prefix=f"braingui_{job_id}_") as tmp:
            work_dir = Path(tmp)

            video_path, audio_path, sha256, duration_sec, has_audio, has_speech = (
                await download_and_normalize(video_url, work_dir, progress)
            )

            await _update_job(
                job_id,
                sha256=sha256,
                duration_sec=duration_sec,
                has_audio=has_audio,
                has_speech=has_speech,
            )

            video_key = f"jobs/{job_id}/video_720p.mp4"
            audio_key = f"jobs/{job_id}/audio_16k.wav"
            await upload_to_r2(video_path, video_key)
            if has_audio:
                await upload_to_r2(audio_path, audio_key)
            await progress(55, "running_inference", "Assets uploaded, starting inference")

            chunks = compute_chunks(duration_sec, window=90, overlap=10)
            chunk_results = []
            for i, (start, end) in enumerate(chunks):
                pct = 55 + int(25 * i / len(chunks))
                await progress(pct, "running_inference", f"Inference chunk {i + 1}/{len(chunks)}")
                result = await run_tribe_inference(
                    job_id=job_id,
                    video_key=video_key,
                    audio_key=audio_key,
                    chunk_index=i,
                    start_sec=start,
                    end_sec=end,
                )
                chunk_results.append(result)

            await progress(83, "stitching", "Stitching predictions")

            bin_path = work_dir / "vertices.bin"
            stitch_chunks_to_bin(chunk_results, bin_path)

            blob_key = f"jobs/{job_id}/vertices.bin"
            await upload_to_r2(bin_path, blob_key)

            await _update_job(
                job_id,
                status=JobStatus.complete,
                progress_pct=100,
                vertex_blob_key=blob_key,
            )
            await publish_progress(job_id, 100, "complete", "Done")

    except Exception as exc:
        await _update_job(job_id, status=JobStatus.failed, error_message=str(exc))
        await publish_progress(job_id, -1, "failed", f"Failed: {exc}")
        raise


class WorkerSettings:
    functions = [process_video_job]
    redis_settings = None  # set at runtime from config

    @classmethod
    def get_settings(cls, redis_url: str):
        from arq.connections import RedisSettings
        cls.redis_settings = RedisSettings.from_dsn(redis_url)
        return cls
