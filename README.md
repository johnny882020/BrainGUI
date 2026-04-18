# BrainGUI

**A research and education tool for exploring predicted neural activity in response to video stimuli, powered by Meta's TRIBE v2 foundation model.**

Paste a YouTube URL (or upload a video) and watch a 3D cortical brain surface animate in synchronized playback — showing how an average fMRI subject's cortex is predicted to respond, second by second. Click any brain region to see its full activation timeseries and jump to the moments in the video that drove it.

> **Important:** BrainGUI displays *predictions* of average fMRI responses, not your brain and not real-time neural activity. Predictions are produced by [Meta TRIBE v2](https://huggingface.co/facebook/tribev2) (CC-BY-NC-4.0), trained on naturalistic movies and podcasts.

---

## Features

| Feature | Description |
|---------|-------------|
| **Synchronized playback** | Brain and video play in sync. Hemodynamic lag (+5s) is corrected by default; a toggle reveals the scientifically literal delay. |
| **3D cortical surface** | WebGL brain rendering via [Niivue](https://niivue.com), fsaverage5 mesh, both hemispheres. Rotatable, zoomable. |
| **HCP Glasser atlas labels** | 360-parcel atlas overlaid on the brain. Active regions (top 10th percentile) surface as labeled cards with plain-language descriptions. |
| **Bidirectional timeline** | Scrub the timeline to jump the brain — or click a parcel to see its full-video timeseries and jump to activation peaks. |
| **Shareable URLs** | Every job gets a permanent URL. Close the tab and come back when processing finishes. |
| **Honesty layer** | Onboarding card, persistent canvas label, and per-video domain warnings when audio or speech is absent. |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser                                                     │
│  React 18 + Vite · Niivue (WebGL) · Zustand · Recharts      │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST + SSE
┌──────────────────────────▼──────────────────────────────────┐
│  Backend  (FastAPI · ARQ · PostgreSQL · Redis)               │
│  yt-dlp download → ffmpeg normalize → R2 upload             │
│  → chunk (90s windows, 10s overlap) → HF Space inference    │
│  → stitch (crossfade) → z-score → float16 .bin → R2         │
└──────────────────────────┬──────────────────────────────────┘
                           │ gradio_client
┌──────────────────────────▼──────────────────────────────────┐
│  HF ZeroGPU Space  (TRIBE v2 · @spaces.GPU)                  │
│  Accepts R2 video/audio keys, returns base64 float16 preds  │
└─────────────────────────────────────────────────────────────┘
```

**Stack at a glance:**

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS v4, Niivue, Zustand, Recharts |
| Backend | FastAPI, SQLAlchemy (async), Alembic, ARQ, boto3 (Cloudflare R2) |
| Inference | Meta TRIBE v2 on Hugging Face ZeroGPU Space (Gradio 5) |
| Storage | Cloudflare R2 — normalized videos (24h TTL), vertex timeseries (permanent) |
| Database | PostgreSQL 16 |
| Queue | Redis 7 |
| Deploy | Render (API + worker + frontend static site) |

---

## Wire Format

The vertex timeseries is stored and transferred as a compact binary blob:

```
[ uint32 T_total ][ uint32 n_vertices=20484 ][ T × 20484 × float16 (row-major) ]
←─── 8 bytes ───→←───────────────── T × 40,968 bytes ──────────────────────────→
```

For a 10-minute video: `600 × 20484 × 2 ≈ 24 MB`. The frontend decodes this with a `Float16Array` (Chrome 121+) or a pure-JS fallback, then slices one frame per animation tick.

---

## Getting Started

### Prerequisites

- Node.js 22+ and [pnpm](https://pnpm.io) 9+
- Python 3.11+, [Poetry](https://python-poetry.org)
- Docker (for local PostgreSQL + Redis)
- `ffmpeg` installed on your system

### 1. Clone and install

```bash
git clone https://github.com/johnny882020/BrainGUI.git
cd BrainGUI
pnpm install
```

### 2. Start local services

```bash
docker compose -f infra/docker-compose.yml up -d
```

### 3. Configure environment

```bash
cp .env.example apps/api/.env
# Fill in R2 credentials and HF Space URL
```

### 4. Run database migrations

```bash
cd apps/api
poetry install
poetry run alembic upgrade head
cd ../..
```

### 5. Start development servers

```bash
# Frontend + backend in parallel:
pnpm dev

# ARQ worker (separate terminal):
cd apps/api && poetry run arq braingui_api.worker.tasks.WorkerSettings
```

### 6. Deploy the HF Inference Space

Push `spaces/tribe-inference/` to a Hugging Face Space with `hardware: zero-gpu`. Set these Space Secrets:

```
R2_ENDPOINT_URL  R2_ACCESS_KEY_ID  R2_SECRET_ACCESS_KEY  R2_BUCKET_NAME
```

---

## Running Tests

```bash
# Backend unit + integration (23 tests)
python -m pytest apps/api/tests/ -v

# HF Space utility tests (no GPU required)
python -m pytest spaces/tribe-inference/test_utils.py -v
```

---

## Deployment (Render)

The `render.yaml` in the repo root defines three services — API web service, ARQ worker, and React static site. Connect the repo to Render and click **New Blueprint Instance**.

Set the following as Render secrets:

```
R2_ENDPOINT_URL, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_BASE_URL
HF_SPACE_URL, HF_TOKEN, APP_BASE_URL, CORS_ORIGINS
```

---

## Scientific Notes

- **Model:** `facebook/tribev2`, CC-BY-NC-4.0. Non-commercial use only.
- **Outputs:** `(T, 20484)` predicted fMRI BOLD at 1 Hz for the fsaverage5 cortical surface vertices.
- **Subject mode:** "Unseen subject" / group-averaged — represents a predicted average, not any individual.
- **Hemodynamic delay:** BOLD peaks ~5s after stimulus. The default display corrects for this. Toggle "Show real hemodynamic delay" for the literal view.
- **Domain:** Trained on naturalistic movies and podcasts. Out-of-distribution content will produce weaker predictions.
- **Atlas:** HCP Glasser 360-parcel multi-modal parcellation (Glasser et al., 2016).

---

## Roadmap

- **V1 (current):** Core viewer — synchronized playback, parcel labels, bidirectional timeline, shareable URLs.
- **V2:** Modality attribution overlay (RGB: text / audio / video contribution per vertex). Functional network overlays.
- **V3:** In-silico experiment builder — GLM contrast maps between two conditions.

---

## License

- **Application code:** MIT
- **TRIBE v2 model weights:** CC-BY-NC-4.0 (Meta). Non-commercial use only.
- **HCP Glasser Atlas:** used under academic license terms.
