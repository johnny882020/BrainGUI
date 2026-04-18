import asyncio
import hashlib
import json
import logging
import subprocess
from collections.abc import Awaitable, Callable
from pathlib import Path

log = logging.getLogger(__name__)


def _run(cmd: list[str]) -> subprocess.CompletedProcess:
    """Run a subprocess and raise RuntimeError with stderr on failure."""
    try:
        return subprocess.run(cmd, check=True, capture_output=True)
    except subprocess.CalledProcessError as exc:
        stderr = exc.stderr.decode(errors="replace") if exc.stderr else ""
        raise RuntimeError(f"Command {cmd[0]} failed: {stderr}") from exc


async def download_and_normalize(
    video_url: str,
    work_dir: Path,
    progress_cb: Callable[[int, str, str], Awaitable[None]],
) -> tuple[Path, Path, str, float, bool, bool]:
    """Download and normalize video.

    Returns (video_path, audio_path, sha256, duration_sec, has_audio, has_speech).
    """
    await progress_cb(5, "downloading", "Starting download")

    raw_template = str(work_dir / "raw_video.%(ext)s")
    ydl_opts = [
        "yt-dlp",
        "--format", "bv*[height<=720][ext=mp4]+ba[ext=m4a]/bv*[height<=720]+ba/best[height<=720]",
        "--merge-output-format", "mp4",
        "--output", raw_template,
        "--no-playlist",
        "--quiet",
        video_url,
    ]

    log.info("Downloading %s", video_url)
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, lambda: _run(ydl_opts))
    await progress_cb(25, "processing", "Download complete, normalizing")

    raw_files = list(work_dir.glob("raw_video.*"))
    if not raw_files:
        raise RuntimeError("yt-dlp produced no output file")
    raw_file = raw_files[0]

    norm_video = work_dir / "video_720p.mp4"
    _run([
        "ffmpeg", "-i", str(raw_file), "-y",
        "-vf", "scale=iw*min(1\\,min(1280/iw\\,720/ih)):-2",
        "-c:v", "libx264", "-crf", "23", "-preset", "fast",
        "-c:a", "copy",
        str(norm_video),
    ])
    await progress_cb(40, "processing", "Video normalized")

    # Probe for audio stream
    probe_result = _run(
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_streams", str(norm_video)]
    )
    streams = json.loads(probe_result.stdout).get("streams", [])
    has_audio = any(s["codec_type"] == "audio" for s in streams)

    norm_audio = work_dir / "audio_16k.wav"
    has_speech = False
    if has_audio:
        _run([
            "ffmpeg", "-i", str(norm_video), "-y",
            "-vn", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le",
            str(norm_audio),
        ])
        has_speech = _detect_speech(norm_audio)
    else:
        norm_audio.write_bytes(b"")

    await progress_cb(50, "processing", "Audio extracted")

    # Get duration
    fmt_result = _run(
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", str(norm_video)]
    )
    duration_sec = float(json.loads(fmt_result.stdout)["format"]["duration"])

    sha256 = hashlib.sha256(norm_video.read_bytes()).hexdigest()
    log.info(
        "Ingest complete: duration=%.1fs has_audio=%s has_speech=%s sha256=%.8s",
        duration_sec, has_audio, has_speech, sha256,
    )
    return norm_video, norm_audio, sha256, duration_sec, has_audio, has_speech


def _detect_speech(audio_path: Path) -> bool:
    """Heuristic: check if audio has a recognizable stream (proxy for audio content)."""
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "quiet", "-print_format", "json",
             "-show_streams", "-select_streams", "a:0", str(audio_path)],
            capture_output=True, text=True,
        )
        return len(json.loads(result.stdout).get("streams", [])) > 0
    except Exception:
        return False


def compute_chunks(
    duration_sec: float, window: int = 90, overlap: int = 10
) -> list[tuple[float, float]]:
    chunks: list[tuple[float, float]] = []
    start = 0.0
    while start < duration_sec:
        end = min(start + window, duration_sec)
        chunks.append((start, end))
        if end >= duration_sec:
            break
        start += window - overlap
    return chunks
