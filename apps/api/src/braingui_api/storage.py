import asyncio
from datetime import datetime, timedelta, timezone
from pathlib import Path

import boto3
from botocore.config import Config

from .config import settings


def _get_client():
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


def _presign_sync(key: str, expires_in: int) -> str:
    return _get_client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.r2_bucket_name, "Key": key},
        ExpiresIn=expires_in,
    )


async def upload_to_r2(local_path: Path, key: str) -> str:
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _upload_sync, local_path, key)
    return f"{settings.r2_public_base_url}/{key}"


async def generate_presigned_url(key: str, expires_in: int = 900) -> tuple[str, str]:
    loop = asyncio.get_event_loop()
    url = await loop.run_in_executor(None, _presign_sync, key, expires_in)
    expires_at = (datetime.now(timezone.utc) + timedelta(seconds=expires_in)).isoformat()
    return url, expires_at
