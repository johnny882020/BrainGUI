"""TRIBE v2 ZeroGPU inference endpoint for BrainGUI."""
import json
import os
import tempfile
from pathlib import Path

import gradio as gr
import numpy as np
import spaces

from utils import download_from_r2, encode_predictions, ffmpeg_trim

# ---------------------------------------------------------------------------
# Model loading — runs once at cold start, outside @spaces.GPU
# ---------------------------------------------------------------------------
_model = None


def _load_model():
    global _model
    if _model is not None:
        return _model
    try:
        from tribev2 import TribeModel  # type: ignore[import]
        _model = TribeModel.from_pretrained(
            "facebook/tribev2",
            cache_folder="/tmp/tribe_cache",
        )
    except ImportError:
        # Stub for development / testing without the actual package
        class _StubModel:
            def get_events_dataframe(self, **kwargs):
                return None

            def predict(self, events=None):
                # Return zero predictions for 90 seconds at 1 Hz
                return np.zeros((90, 20484), dtype=np.float32)

        _model = _StubModel()
    return _model


_load_model()


# ---------------------------------------------------------------------------
# Inference — runs on GPU via ZeroGPU
# ---------------------------------------------------------------------------
@spaces.GPU(duration=300)
def predict_chunk(
    video_key: str,
    audio_key: str,
    chunk_index: int,
    start_sec: float,
    end_sec: float,
) -> str:
    """
    Download slice from R2, run TRIBE v2, return base64-encoded float16 predictions.

    Returns JSON string:
      {chunk_index, start_sec, end_sec, vertex_data_b64, n_frames, n_vertices}
    """
    model = _load_model()
    bucket = os.environ["R2_BUCKET_NAME"]

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        video_local = tmp_path / "full_video.mp4"
        audio_local = tmp_path / "full_audio.wav"
        trimmed_video = tmp_path / "trimmed.mp4"
        trimmed_audio = tmp_path / "trimmed.wav"

        # Download from R2
        download_from_r2(video_key, video_local)
        if audio_key and (audio_key != video_key):
            try:
                download_from_r2(audio_key, audio_local)
                ffmpeg_trim(audio_local, trimmed_audio, start_sec, end_sec)
            except Exception:
                trimmed_audio = None
        else:
            trimmed_audio = None

        # Trim video to chunk window
        ffmpeg_trim(video_local, trimmed_video, start_sec, end_sec)

        # Build events dataframe (handles transcript via internal whisperX pipeline)
        events_df = model.get_events_dataframe(
            video_path=str(trimmed_video),
            audio_path=str(trimmed_audio) if trimmed_audio else None,
        )

        # Run TRIBE v2 prediction → (T, 20484) float32
        predictions: np.ndarray = model.predict(events=events_df)

    encoded = encode_predictions(predictions)

    result = {
        "chunk_index": chunk_index,
        "start_sec": start_sec,
        "end_sec": end_sec,
        "vertex_data_b64": encoded,
        "n_frames": int(predictions.shape[0]),
        "n_vertices": int(predictions.shape[1]),
    }
    return json.dumps(result)


# ---------------------------------------------------------------------------
# Gradio interface — hidden inputs/outputs; called via API only
# ---------------------------------------------------------------------------
with gr.Blocks(title="TRIBE v2 Inference") as demo:
    gr.Markdown("## TRIBE v2 Inference Endpoint\n_For BrainGUI backend use only._")

    with gr.Row(visible=False):
        video_key_in = gr.Text(label="video_key")
        audio_key_in = gr.Text(label="audio_key")
        chunk_index_in = gr.Number(label="chunk_index", value=0)
        start_in = gr.Number(label="start_sec", value=0)
        end_in = gr.Number(label="end_sec", value=90)
        output = gr.Text(label="result_json")

    gr.Button("Run Inference").click(
        predict_chunk,
        inputs=[video_key_in, audio_key_in, chunk_index_in, start_in, end_in],
        outputs=output,
        api_name="predict_chunk",
    )

if __name__ == "__main__":
    demo.launch()
