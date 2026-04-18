# BrainGUI

**Predict and visualise how a human cortex responds to any video — powered by Meta TRIBE v2.**

Paste a YouTube URL and watch a 3D brain surface animate frame-by-frame in sync with playback, showing predicted BOLD fMRI activity across 20,484 cortical vertices. Click any region to inspect its full activation timeseries and jump to the exact video moments that drove it.

> **Transparency notice:** BrainGUI displays *predictions* of group-averaged fMRI responses — not your brain and not real-time neural activity. Predictions are produced by [Meta TRIBE v2](https://huggingface.co/facebook/tribev2) (CC-BY-NC-4.0).

---

## Features

| Feature | Detail |
|---|---|
| **Synchronized playback** | Brain and video play in lock-step. Hemodynamic lag (+5 s) is corrected by default; a toggle exposes the scientifically literal delay. |
| **3D cortical surface** | WebGL rendering via [Niivue](https://niivue.com), fsaverage5 mesh, both hemispheres — rotatable, zoomable. |
| **HCP Glasser atlas** | 360-parcel multi-modal parcellation overlaid on the brain. Active regions (top 10th percentile) surface as labelled cards with plain-English descriptions. |
| **Bidirectional timeline** | Scrub the timeline to jump the brain — or click a parcel to see its full-video timeseries and seek to activation peaks. |
| **Shareable URLs** | Every job gets a permanent URL (`/j/:jobId`). Close the tab, come back when processing finishes. |
| **Honesty layer** | Onboarding card, persistent canvas label, and per-video domain warnings when audio or speech is absent. |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser                                                          │
│  React 18 · Vite · TypeScript · Niivue (WebGL) · Zustand         │
│  Recharts · Tailwind CSS v4 · React Router                       │
└────────────────────────────┬─────────────────────────────────────┘
                             │  REST + SSE
┌────────────────────────────▼─────────────────────────────────────┐
│  API  (FastAPI · SQLAlchemy async · Alembic · PostgreSQL 16)      │
│  Worker  (ARQ · Redis 7)                                          │
│  Pipeline: yt-dlp → ffmpeg → Cloudflare R2                        │
│           → chunk (90 s / 10 s overlap)                           │
│           → HF Space inference                                    │
│           → stitch (raised-cosine crossfade) → z-score            │
│           → float16 .bin → R2 → SSE notify                        │
└────────────────────────────┬─────────────────────────────────────┘
                             │  gradio_client
┌────────────────────────────▼─────────────────────────────────────┐
│  HF ZeroGPU Space  (TRIBE v2 · @spaces.GPU · Gradio 5)           │
│  R2 video/audio keys in → base64 float16 predictions out         │
└──────────────────────────────────────────────────────────────────┘
```

### Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite 6, Tailwind CSS v4, Niivue 0.47, Zustand 5, Recharts |
| Backend | FastAPI 0.115, SQLAlchemy 2 (async), Alembic, ARQ, boto3 (Cloudflare R2) |
| Inference | Meta TRIBE v2 on Hugging Face ZeroGPU (Gradio 5) |
| Storage | Cloudflare R2 — normalized videos and vertex timeseries blobs |
| Database | PostgreSQL 16 |
| Queue | Redis 7 (ARQ) |
| Deploy | Render (API web service + ARQ worker + React static site) |

---

## Repository Structure

```
BrainGUI/
├── apps/
│   ├── api/                          # FastAPI backend
│   │   ├── src/braingui_api/
│   │   │   ├── main.py               # FastAPI app factory + lifespan
│   │   │   ├── config.py             # Pydantic Settings
│   │   │   ├── database.py           # SQLAlchemy async engine + pool
│   │   │   ├── redis_client.py       # Redis pub/sub helpers
│   │   │   ├── storage.py            # R2 upload + presigned URLs
│   │   │   ├── __main__.py           # `braingui` entry point (uvicorn)
│   │   │   ├── models/job.py         # Job ORM + JobStatus enum
│   │   │   ├── routers/
│   │   │   │   ├── health.py         # GET /api/v1/health
│   │   │   │   └── jobs.py           # CRUD + SSE stream + vertex URL
│   │   │   ├── schemas/job.py        # Pydantic request/response models
│   │   │   ├── services/
│   │   │   │   ├── ingest.py         # yt-dlp + ffmpeg pipeline
│   │   │   │   ├── inference.py      # gradio_client HF Space wrapper
│   │   │   │   └── stitch.py         # crossfade + z-score + .bin writer
│   │   │   └── worker/tasks.py       # ARQ background task
│   │   ├── tests/
│   │   │   ├── test_api.py           # 6 API integration tests
│   │   │   └── test_stitch.py        # 14 stitch/chunk unit tests
│   │   ├── alembic/                  # DB migrations
│   │   ├── requirements.txt          # Pinned Python deps
│   │   ├── Dockerfile                # python:3.11-slim + ffmpeg
│   │   └── alembic.ini
│   └── web/                          # React frontend
│       ├── src/
│       │   ├── components/
│       │   │   ├── brain/            # Niivue canvas + useNiivue hook
│       │   │   ├── layout/           # AppShell, TopBar, panes
│       │   │   ├── timeline/         # Scrubber + RegionChart
│       │   │   ├── parcels/          # ParcelPanel (HCP atlas labels)
│       │   │   ├── video/            # VideoPlayer sync
│       │   │   └── ui/               # LandingPage, forms, processing screen
│       │   ├── hooks/
│       │   │   ├── useJobSSE.ts      # SSE subscription → jobStore
│       │   │   └── useVertexData.ts  # Fetch + decode .bin → brainStore
│       │   ├── stores/               # Zustand: playback, brain, job
│       │   └── lib/
│       │       ├── api.ts            # Typed fetch client (AbortSignal)
│       │       ├── constants.ts      # N_VERTICES, chunk sizes, hem. offset
│       │       ├── decodeFloat16.ts  # Float16 binary decoder
│       │       └── parcels.ts        # HCP Glasser parcel definitions
│       └── public/assets/            # fsaverage5 lh/rh .surf.gii meshes
├── packages/
│   └── types/src/index.ts            # Shared TS types (Job, SSEProgressEvent…)
├── spaces/
│   └── tribe-inference/              # HF ZeroGPU Space
│       ├── app.py                    # Gradio endpoint + @spaces.GPU
│       ├── utils.py                  # R2 download, ffmpeg trim, base64 encode
│       └── test_utils.py             # 3 utility unit tests
├── infra/
│   └── docker-compose.yml            # Local PostgreSQL 16 + Redis 7
├── .github/workflows/ci.yml          # Three-job CI pipeline
├── render.yaml                       # Render Blueprint (3 services)
├── runtime.txt                       # Python 3.11.11 (Render)
├── requirements.txt                  # Root: installs API deps + package
├── pnpm-workspace.yaml
├── turbo.json
├── .nvmrc                            # Node.js 22
└── .env.example
```

---

## Binary Wire Format

Vertex timeseries stored as a compact binary blob:

```
[ uint32 T_total ][ uint32 n_vertices=20484 ][ T × 20484 × float16  (row-major) ]
←────── 8 bytes ──────→←────────────── T × 40,968 bytes ──────────────────────→
```

For a 10-minute video: `600 × 20484 × 2 ≈ 24 MB`. The frontend decodes with the native `Float16Array` (Chrome 121+) or a pure-JS fallback for older engines, then slices one frame per animation tick.

---

## Getting Started

### Prerequisites

- Node.js 22+ and [pnpm](https://pnpm.io) 9+
- Python 3.11+
- Docker (for local PostgreSQL + Redis)
- `ffmpeg` installed system-wide

### 1 — Clone and install

```bash
git clone https://github.com/johnny882020/BrainGUI.git
cd BrainGUI
pnpm install --no-frozen-lockfile        # JS workspaces
pip install -r requirements.txt          # API deps + braingui entry point
```

### 2 — Start infrastructure

```bash
docker compose -f infra/docker-compose.yml up -d
```

### 3 — Configure environment

```bash
cp .env.example apps/api/.env
# Fill in: DATABASE_URL, REDIS_URL, R2_*, HF_SPACE_URL, HF_TOKEN, APP_BASE_URL
```

### 4 — Run migrations

```bash
cd apps/api && alembic upgrade head && cd ../..
```

### 5 — Start development servers

```bash
pnpm dev                        # frontend :5173 + backend :8000 in parallel

# Separate terminal — ARQ worker:
cd apps/api && python -m arq braingui_api.worker.tasks.WorkerSettings
```

### 6 — Deploy the HF Inference Space

Push `spaces/tribe-inference/` to a Hugging Face Space with `hardware: zero-gpu`. Set these Space Secrets:

```
R2_ENDPOINT_URL  R2_ACCESS_KEY_ID  R2_SECRET_ACCESS_KEY  R2_BUCKET_NAME
```

---

## Running Tests

```bash
# Backend — 20 unit + integration tests
cd apps/api && python -m pytest tests/ -v

# HF Space utilities — 3 tests (no GPU required)
cd spaces/tribe-inference && python -m pytest test_utils.py -v

# Frontend build (verifies TypeScript + Vite)
pnpm turbo run build --filter=@braingui/web
```

---

## CI / CD

### GitHub Actions (`.github/workflows/ci.yml`)

Three jobs run in parallel on every push to `main` and every pull request:

| Job | Steps |
|---|---|
| **frontend** | pnpm install → `turbo run lint typecheck build` (builds `@braingui/types` first via `dependsOn`) |
| **backend** | pip install → `ruff check src/` → `mypy src/` |
| **backend-tests** | pip install → `pytest tests/ -v` (20 tests) |

### Render (auto-deploy)

Three services defined in `render.yaml`, all with `autoDeploy: true`:

| Service | Type | Build | Start |
|---|---|---|---|
| `braingui-api` | Docker web service | `apps/api/Dockerfile` | `uvicorn braingui_api.main:app …` |
| `braingui-worker` | Docker worker | same Dockerfile | `python -m arq braingui_api.worker.tasks.WorkerSettings` |
| `braingui-web` | Static site | `pnpm turbo run build --filter=@braingui/web` | CDN-served SPA |

**To deploy via Blueprint (first time):**

1. Render dashboard → **New → Blueprint Instance**
2. Connect `johnny882020/BrainGUI`, branch `main`
3. Add secrets: `R2_*`, `HF_SPACE_URL`, `HF_TOKEN`, `APP_BASE_URL`

**For manually-configured services** (fallback — render.yaml ignored):

Render auto-detects Python, runs `pip install -r requirements.txt` (which installs all API deps plus the `braingui` entry point via `apps/api/`), then calls `braingui` — which starts uvicorn on `$PORT`. Pin Python to 3.11 via `runtime.txt`.

---

## Deployment Checklist

- [ ] Render PostgreSQL 16 database provisioned
- [ ] Render Redis 7 (noeviction) provisioned
- [ ] `DATABASE_URL` and `REDIS_URL` set on `braingui-api` and `braingui-worker`
- [ ] `R2_ENDPOINT_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL` set on both services
- [ ] `HF_SPACE_URL` and `HF_TOKEN` set on `braingui-worker`
- [ ] `APP_BASE_URL` set to your Render web URL
- [ ] HF Space deployed to ZeroGPU hardware with R2 secrets set
- [ ] First deploy: run `alembic upgrade head` (one-time via Render shell or pre-deploy hook)

---

## Environment Variables

| Variable | Service | Description |
|---|---|---|
| `DATABASE_URL` | api, worker | `postgresql+asyncpg://...` |
| `REDIS_URL` | api, worker | `redis://...` |
| `R2_ENDPOINT_URL` | api, worker | Cloudflare R2 endpoint |
| `R2_ACCESS_KEY_ID` | api, worker | R2 access key |
| `R2_SECRET_ACCESS_KEY` | api, worker | R2 secret key |
| `R2_BUCKET_NAME` | api, worker | Default: `braingui` |
| `R2_PUBLIC_BASE_URL` | api, worker | Public CDN base URL |
| `HF_SPACE_URL` | worker | Hugging Face Space URL |
| `HF_TOKEN` | worker | HF API token |
| `APP_BASE_URL` | api | Used in shareable job URLs |
| `CORS_ORIGINS` | api | JSON array of allowed origins |
| `VITE_API_BASE` | web (build) | API base URL injected at build time |

---

## Scientific Notes

- **Model:** `facebook/tribev2` (CC-BY-NC-4.0). Non-commercial use only.
- **Output:** `(T, 20484)` predicted BOLD at 1 Hz for fsaverage5 cortical vertices.
- **Subject mode:** Group-averaged unseen-subject prediction — represents a statistical average, not any individual.
- **Hemodynamic delay:** BOLD peaks ≈5 s after stimulus onset. The default display corrects for this. Toggle "Show real hemodynamic delay" for the literal view.
- **Domain:** Trained on naturalistic movies and podcasts. Out-of-distribution content produces weaker predictions; a banner warns when audio/speech is absent.
- **Atlas:** HCP Glasser 360-parcel multi-modal parcellation (Glasser et al., 2016, *Nature*).
- **Chunking:** 90-second windows with 10-second overlap; raised-cosine crossfade on boundaries; z-scored per-video before writing to `.bin`.

---

## Roadmap

- **V1 (current):** Core viewer — synchronized playback, Glasser atlas labels, bidirectional timeline, shareable URLs, honesty layer.
- **V2:** Modality attribution overlay (RGB per-vertex: text / audio / visual contribution). Functional network overlays.
- **V3:** In-silico experiment builder — GLM contrast maps between two user-defined video conditions.

---

## License

| Component | License |
|---|---|
| Application code | MIT |
| TRIBE v2 model weights | CC-BY-NC-4.0 (Meta) — non-commercial use only |
| HCP Glasser Atlas | Academic license (Glasser et al. 2016) |
