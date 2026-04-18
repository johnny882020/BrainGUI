---
title: TRIBE v2 Inference
emoji: 🧠
colorFrom: blue
colorTo: purple
sdk: gradio
sdk_version: "5.9.1"
app_file: app.py
pinned: false
license: cc-by-nc-4.0
hardware: zero-gpu
short_description: TRIBE v2 predicted fMRI vertex timeseries from video
---

# TRIBE v2 Inference Space

Backend inference endpoint for [BrainGUI](https://github.com/johnny882020/BrainGUI). Accepts a video/audio object key from Cloudflare R2, runs Meta's TRIBE v2 model on ZeroGPU, and returns base64-encoded float16 vertex predictions.

> **License:** TRIBE v2 model weights are CC-BY-NC-4.0. Non-commercial use only.

---

## Space Secrets

These must be set in the Space's **Settings → Secrets** panel before the Space can process any requests:

| Secret | Description |
|---|---|
| `R2_ENDPOINT_URL` | Cloudflare R2 endpoint (e.g. `https://<account_id>.r2.cloudflarestorage.com`) |
| `R2_ACCESS_KEY_ID` | R2 access key ID |
| `R2_SECRET_ACCESS_KEY` | R2 secret access key |
| `R2_BUCKET_NAME` | R2 bucket name (default: `braingui`) |

The Space reads these at runtime via `os.environ`; they are never passed per-request.

---

## API

The Space exposes a single endpoint via Gradio's API layer.

### `POST /predict_chunk`

**Called by:** `apps/api/src/braingui_api/services/inference.py` using `gradio_client.Client`.

#### Inputs

| Parameter | Type | Description |
|---|---|---|
| `video_key` | `str` | R2 object key for the normalized MP4 (720p, H.264) |
| `audio_key` | `str` | R2 object key for the 16kHz mono WAV audio track |
| `chunk_index` | `int` | Zero-based chunk index (used to reconstruct ordering) |
| `start_sec` | `float` | Chunk start time in seconds |
| `end_sec` | `float` | Chunk end time in seconds (max window: 90 s) |

#### Output

Returns a JSON string:

```json
{
  "chunk_index": 0,
  "start_sec": 0.0,
  "end_sec": 90.0,
  "vertex_data_b64": "<base64-encoded float16 bytes>",
  "n_frames": 90,
  "n_vertices": 20484
}
```

`vertex_data_b64` decodes to a `(n_frames, 20484)` float16 NumPy array in row-major order — one predicted BOLD value per cortical vertex per second.

#### Python client example

```python
from gradio_client import Client
import json, base64, numpy as np

client = Client("your-hf-username/tribe-inference", hf_token="hf_...")
result_json = client.predict(
    "videos/jb_abc123.mp4",   # video_key
    "audio/jb_abc123.wav",    # audio_key
    0,                        # chunk_index
    0.0,                      # start_sec
    90.0,                     # end_sec
    api_name="/predict_chunk",
)
result = json.loads(result_json)
raw = base64.b64decode(result["vertex_data_b64"])
arr = np.frombuffer(raw, dtype=np.float16).reshape(result["n_frames"], result["n_vertices"])
```

---

## How BrainGUI Uses This Space

The BrainGUI ARQ worker (`apps/api/src/braingui_api/worker/tasks.py`) calls this Space as part of a multi-step pipeline:

1. **Ingest** — `yt-dlp` downloads the video; `ffmpeg` normalizes to 720p MP4 + 16kHz mono WAV; both are uploaded to Cloudflare R2.
2. **Chunk** — `compute_chunks(duration, window=90, overlap=10)` splits the video into 90-second windows with 10-second overlap.
3. **Infer** — For each chunk, the worker calls `run_tribe_inference()` which wraps `gradio_client.Client.predict(api_name="/predict_chunk")` via `asyncio.run_in_executor` (non-blocking).
4. **Stitch** — `stitch.py` applies a raised-cosine crossfade on the 10-second overlap regions, z-scores the full timeseries, and serializes as a float16 `.bin` file.
5. **Notify** — The completed `.bin` is uploaded to R2; the worker publishes a `complete` event on the Redis pub/sub channel; the SSE stream delivers it to the browser.

---

## ZeroGPU Notes

- The `@spaces.GPU(duration=300)` decorator allocates a GPU for up to 300 seconds per call. Each 90-second chunk typically takes 60–120 seconds on ZeroGPU (A100).
- The model is loaded once at cold start outside the `@spaces.GPU` function so that multiple consecutive chunks reuse the same model weights.
- If the Space is idle and experiences a cold start, the first call may time out. BrainGUI's worker has no retry — if a chunk fails, the job transitions to `failed`.
- ZeroGPU has a per-user quota. High-volume deployments should consider a dedicated GPU.

---

## Local Development / Testing

The Space includes a stub model that returns zero predictions, so `test_utils.py` can run without a GPU or the `tribev2` package:

```bash
pip install -r requirements.txt
python -m pytest test_utils.py -v   # 3 tests — no GPU required
```

To run the full Space locally with a real GPU and TRIBE v2 installed:

```bash
pip install tribev2 gradio spaces
R2_ENDPOINT_URL=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... R2_BUCKET_NAME=braingui \
  python app.py
```
