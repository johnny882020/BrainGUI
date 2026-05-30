# BrainLink

Non-invasive, unidirectional brain-machine interface using only your phone's built-in sensors.

Your brain controls the environment — the environment never stimulates back.

## How it works

BrainLink reads four sensor streams on your phone to infer your mental state and intent:

| Sensor | What it measures | Output |
|---|---|---|
| Front camera | Facial landmarks, blink rate, gaze | Mental state (focused / relaxed / excited / stressed / neutral) |
| Microphone | Breathing rhythm, vocal energy | Arousal & valence |
| Accelerometer / Gyroscope | Head & hand gestures | Motor intent (confirm / reject / left / right) |
| Touch screen | Tap rhythm, error rate | Cognitive load |

All sensor processing runs **on-device**. Raw camera frames, audio, and motion data never leave your phone. Only classified labels (e.g. "focused", "confirm") are transmitted to peers, and those are **end-to-end encrypted** with NaCl box (X25519 + XSalsa20-Poly1305).

## Output channels

1. **UI adaptation** — the app's theme and layout adjust in real-time to your mental state
2. **Peer communication** — broadcast your mental context to paired users via an encrypted channel
3. **IoT triggers** (coming soon) — control smart home devices from intent events

## Setup

### Prerequisites
- Node 22, pnpm 9
- Python 3.11
- Docker & docker-compose (for local API + Redis/Postgres)
- Expo Go app on your iOS or Android device

### Quick start

```bash
# Start infra
docker compose -f infra/docker-compose.yml up -d

# Install dependencies
pnpm install

# Start API
cd apps/api && pip install -r requirements.txt -e . && uvicorn braingui_api.main:app --reload

# Start mobile (in a second terminal)
pnpm --filter @brainlink/mobile start
```

Configure your API URL in `apps/mobile/.env`:
```
EXPO_PUBLIC_API_URL=http://<your-local-ip>:8000
EXPO_PUBLIC_WS_URL=ws://<your-local-ip>:8000
```

### Tests

```bash
# API
cd apps/api && pytest tests/ -v

# Mobile
pnpm --filter @brainlink/mobile test
```

## Security

- Passwords: bcrypt (cost 12)
- Tokens: JWT RS256, 15 min access / 7 day rotating refresh
- Biometric data: never persisted or transmitted
- Thought packets: E2E encrypted, server sees only ciphertext
- Rate limiting: 5 req/min registration, 100 req/min general
- Secrets: environment variables only

## Architecture

```
apps/
  api/        FastAPI relay + auth (Python 3.11)
  mobile/     React Native + Expo (TypeScript)
packages/
  types/      Shared TypeScript types
infra/
  docker-compose.yml  PostgreSQL + Redis for local dev
```
