# ── Stage 1: Build React frontend ─────────────────────────────────────────────
FROM node:22-slim AS web-builder
WORKDIR /workspace

# Copy workspace config files
COPY pnpm-workspace.yaml turbo.json pnpm-lock.yaml package.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

# VITE_API_BASE is intentionally empty — frontend served same-origin from API
RUN npm install -g pnpm@9 && \
    pnpm install --frozen-lockfile && \
    pnpm turbo run build --filter=@braingui/web

# ── Stage 2: Python API + embedded frontend ────────────────────────────────────
FROM python:3.11-slim

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV PYTHONPATH=/app/src

COPY apps/api/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/api/src/ ./src/
COPY apps/api/alembic/ ./alembic/
COPY apps/api/alembic.ini ./

# Embed the compiled frontend so FastAPI can serve it at /
COPY --from=web-builder /workspace/apps/web/dist ./web/dist

EXPOSE 8000
CMD ["uvicorn", "braingui_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
