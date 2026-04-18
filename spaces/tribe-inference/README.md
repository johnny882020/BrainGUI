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

This Space provides a backend inference endpoint for BrainGUI.
It accepts a video/audio object key from Cloudflare R2, runs
Meta's TRIBE v2 model, and returns base64-encoded float16 vertex predictions.

## API

Call `/predict_chunk` with:
- `video_key` — R2 object key for normalized video
- `audio_key` — R2 object key for 16kHz mono WAV audio
- `chunk_index` — integer chunk index
- `start_sec` — start time in seconds
- `end_sec` — end time in seconds

Returns JSON: `{ chunk_index, start_sec, end_sec, vertex_data_b64, n_frames, n_vertices }`

## License

TRIBE v2 model: CC-BY-NC-4.0. Non-commercial use only.
