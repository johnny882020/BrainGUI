"""Utility helpers for the TRIBE v2 inference Space."""
import base64
import os
import subprocess
from pathlib import Path

import boto3
import numpy as np
from botocore.config import Config


def get_r2_client():
    return boto3.client(
        "s3",
        endpoint_url=os.environ["R2_ENDPOINT_URL"],
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )


def download_from_r2(key: str, local_path: Path) -> None:
    bucket = os.environ["R2_BUCKET_NAME"]
    get_r2_client().download_file(bucket, key, str(local_path))


def ffmpeg_trim(input_path: Path, output_path: Path, start_sec: float, end_sec: float) -> None:
    duration = end_sec - start_sec
    subprocess.run(
        [
            "ffmpeg", "-y",
            "-ss", str(start_sec),
            "-i", str(input_path),
            "-t", str(duration),
            "-c", "copy",
            str(output_path),
        ],
        check=True,
        capture_output=True,
    )


def encode_predictions(arr: np.ndarray) -> str:
    """Encode (T, 20484) float32 array as base64 float16 string."""
    f16 = arr.astype(np.float16)
    return base64.b64encode(f16.tobytes()).decode("ascii")
