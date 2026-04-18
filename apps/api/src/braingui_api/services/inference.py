import asyncio
import json

from ..config import settings

_client = None


def _get_gradio_client():
    global _client
    if _client is None:
        from gradio_client import Client
        _client = Client(settings.hf_space_url, hf_token=settings.hf_token or None)
    return _client


async def run_tribe_inference(
    job_id: str,
    video_key: str,
    audio_key: str,
    chunk_index: int,
    start_sec: float,
    end_sec: float,
) -> dict:
    """Call HF Space predict_chunk endpoint, return dict with vertex_data numpy array."""
    import numpy as np

    loop = asyncio.get_event_loop()

    def _call():
        client = _get_gradio_client()
        result_json = client.predict(
            video_key,
            audio_key,
            chunk_index,
            start_sec,
            end_sec,
            api_name="/predict_chunk",
        )
        return result_json

    result_json = await loop.run_in_executor(None, _call)
    result = json.loads(result_json)

    # Decode base64 float16 → numpy float32
    import base64
    raw = base64.b64decode(result["vertex_data_b64"])
    arr = np.frombuffer(raw, dtype=np.float16).astype(np.float32).reshape(-1, 20484)

    return {
        "chunk_index": result["chunk_index"],
        "start_sec": result["start_sec"],
        "end_sec": result["end_sec"],
        "vertex_data": arr.tolist(),
    }
