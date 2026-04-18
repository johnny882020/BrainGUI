import asyncio
import logging
from datetime import UTC, datetime, timedelta
from pathlib import Path

import boto3
from botocore.config import Config

from .config import settings

log = logging.getLogger(__name__)


def _get_client() -> boto3.client:
    if not settings.r2_endpoint_url:
        raise RuntimeError(
            "R2 storage not configured — set R2_ENDPOINT_URL, R2_ACCESS_KEY_ID, "
            "R2_SECRET_ACCESS_KEY in environment variables"
        )
    return boto3.client(
        "s3",
        endpoint_url=settings.r2_endpoint_url,
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )


def _upload_sync(local_path: Path, key: str) -> None:
    _get_client().upload_file(str(local_path), settings.r2_bucket_name, key)
    log.debug("Uploaded %s → %s", local_path.name, key)


def _presign_sync(key: str, expires_in: int) -> str:
    return _get_client().generate_presigned_url(  # type: ignore[no-any-return]
        "get_object",
        Params={"Bucket": settings.r2_bucket_name, "Key": key},
        ExpiresIn=expires_in,
    )


async def upload_to_r2(local_path: Path, key: str) -> str:
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _upload_sync, local_path, key)
    return f"{settings.r2_public_base_url}/{key}"


async def generate_presigned_url(key: str, expires_in: int = 900) -> tuple[str, str]:
    loop = asyncio.get_running_loop()
    url = await loop.run_in_executor(None, _presign_sync, key, expires_in)
    expires_at = (datetime.now(UTC) + timedelta(seconds=expires_in)).isoformat()
    return url, expires_at
