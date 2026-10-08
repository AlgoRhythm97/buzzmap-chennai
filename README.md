# BuzzMap Chennai

> BuzzMap Chennai is a software prototype of a low-cost optical mosquito sensing network that transforms mosquito wingbeat signals into AI-assisted vector surveillance observations across Chennai.

Each sensing node is an optical tunnel: an IR LED shining onto a photodiode. A flying
insect's wingbeats modulate the light. The backend finds those flight events, extracts
wingbeat features, classifies the species (or answers `UNKNOWN` when unsure) and stores
the result. A live dashboard maps every node and charts activity across the city.

## Architecture

```
ESP32 node / simulated sensor
        ↓  raw capture (pre-trigger baseline + beam crossing)
Event detection        RMS envelope vs. MAD-scaled noise threshold
        ↓  padded event windows
Signal processing      DC removal → Hann window → FFT → features
        ↓  feature vector
Classification         Random Forest with open-set rejection → species or UNKNOWN
        ↓
Storage                FastAPI + SQLAlchemy + SQLite
        ↓  REST, polled every 5 s
Dashboard              Leaflet map · KPIs · activity chart · detection details
```

| Stage | What it does | Code |
|---|---|---|
| Event detection | Calibrates on ambient noise, then flags stretches where the short-time RMS envelope rises well above it. Only flight events are kept, not empty noise. | [`detector.py`](backend/app/services/detector.py) |
| Signal processing | Measures dominant (wingbeat) frequency, harmonic ratio, RMS, peak-to-peak, peak magnitude and spectral energy | [`dsp.py`](backend/app/services/dsp.py) |
| Classification | Names a species only if every feature is inside the trained range *and* confidence ≥ threshold; otherwise `UNKNOWN` | [`classifier.py`](backend/app/services/classifier.py) |
| API & storage | Nodes, detections, raw waveform ingestion, dashboard stats | [`backend/app/routes/`](backend/app/routes/) |
| Dashboard | Live map, insights, latest detections, per-detection result page | [`frontend/src/`](frontend/src/) |
| Firmware | ESP32 sketch that captures beam crossings and uploads them | [`firmware/`](firmware/) |

## Tech stack

- **Hardware:** ESP32, Arduino CLI (C++)
- **Backend:** Python 3, FastAPI, Uvicorn, SQLAlchemy, SQLite, Pydantic
- **DSP & ML:** NumPy, SciPy, scikit-learn (Random Forest), joblib
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Leaflet / React-Leaflet, Recharts
- **Testing:** pytest

## Run it locally

You need Python 3.11+ and Node.js 20+. Open three terminals from the repository root.

### 1. Backend (terminal 1)

```bash
cd backend
python3 -m venv buzz_venv
source buzz_venv/bin/activate
pip install -r requirements.txt

python -m scripts.train_classifier        # trains models/classifier.joblib (~3 s)
python -m scripts.seed_demo --reset       # 9 Chennai nodes + 7 days of history
uvicorn app.main:app --reload
```

The API runs at http://localhost:8000, with interactive docs at http://localhost:8000/docs.
The SQLite database (`backend/buzzmap.db`) is created automatically.

Skipping the training step is fine: the app still runs, but every detection is `UNKNOWN`.

### 2. Live telemetry (terminal 2)

```bash
cd backend
source buzz_venv/bin/activate
python -m scripts.live_demo --interval 8
```

Every 8 seconds a few random nodes upload simulated raw captures to
`/api/ingest/waveform`, so the full detection → DSP → classification pipeline runs.

### 3. Dashboard (terminal 3)

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173. **Map** shows the nodes, sized by detections in the last
24 hours. **Insights** shows the KPIs, the activity chart and the latest detections;
click a detection to see its features.

### Real hardware

See [`firmware/README.md`](firmware/README.md) for wiring and flashing an ESP32 node
with Arduino CLI. Start the backend with `--host 0.0.0.0` so nodes on your network can
reach it.

## Configuration

Backend settings come from environment variables or `backend/.env`; see
[`backend/.env.example`](backend/.env.example).

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./buzzmap.db` | Any SQLAlchemy URL |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Allowed CORS origin (the `127.0.0.1` form is allowed too) |
| `MODEL_PATH` | `backend/models/classifier.joblib` | Trained classifier bundle |
| `UNCERTAINTY_THRESHOLD` | `0.60` | Minimum class probability to name a species |
| `BAND_LOW_HZ` / `BAND_HIGH_HZ` | `100` / `1500` | Frequency band searched for the wingbeat |
| `MAX_RECORDING_SECONDS` | `10` | Longest accepted raw capture |
| `DETECTOR_*` | see `.env.example` | Event detector baseline, threshold, minimum length, padding |

Frontend settings live in `frontend/.env`: `VITE_API_URL` and `VITE_POLL_INTERVAL_MS`.

## API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Liveness check |
| `GET` `POST` | `/api/nodes/` | List (`?active=`) or register sensing nodes |
| `GET` | `/api/nodes/{id}` | One node |
| `POST` | `/api/ingest/waveform` | Raw capture → server-side detection, DSP and classification |
| `POST` | `/api/detections/` | Store pre-computed features (classified on arrival) |
| `GET` | `/api/detections/` | Filter by `node_id`, `species`, `since`, `until`; paginate with `skip`/`limit` |
| `GET` | `/api/detections/{id}` | One detection |
| `GET` | `/api/stats/summary` | KPIs over `window_hours` |
| `GET` | `/api/stats/timeseries` | Counts per time bucket by species |

Timestamps are UTC.

## Tests

```bash
cd backend
source buzz_venv/bin/activate
pytest
```

Tests run against an in-memory database and never touch `buzzmap.db` or your trained
model. Frontend checks: `npm run build` and `npm run lint` in `frontend/`.

## Limitations

- **Synthetic training data.** The species profiles in
  [`mock_sensor.py`](backend/scripts/mock_sensor.py) are illustrative, not field
  measurements, so the reported accuracy only reflects that simulation. Real captures
  differ in amplitude and are mostly reported as `UNKNOWN` until the model is retrained
  on labelled recordings from actual nodes.
- **SQLite with no migrations.** After a schema change, delete `buzzmap.db` or run
  `seed_demo --reset`.
- **Prototype scale.** Stats are aggregated in Python, which is fine for thousands of
  detections but not millions.
