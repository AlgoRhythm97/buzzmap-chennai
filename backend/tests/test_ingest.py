import uuid
import numpy as np
from fastapi.testclient import TestClient
from app.main import app
from scripts.mock_sensor import generate_stream

client = TestClient(app)
SAMPLE_RATE = 16000

def _register_node():
    node_id = f"CHN-TEST-{uuid.uuid4().hex[:8].upper()}"
    node = {"id": node_id, "name": "Test Node", "latitude": 13.0418, "longitude": 80.2341}
    assert client.post("/api/nodes/", json=node).status_code == 201
    return node_id

def _stream_with_quiet_start(species, seed, duration_sec=2.0):
    """Mock capture whose first 100 ms are guaranteed noise-only (pre-trigger baseline)."""
    rng = np.random.default_rng(seed)
    stream, truth = generate_stream(species, duration_sec=duration_sec, rng=rng)
    quiet = rng.normal(0, 0.05, SAMPLE_RATE // 10)
    return np.concatenate([quiet, stream]), truth

def test_waveform_ingest_stores_one_detection_per_event():
    node_id = _register_node()
    samples, truth = _stream_with_quiet_start(["AEDES", "CULEX"], seed=21)

    response = client.post("/api/ingest/waveform", json={
        "node_id": node_id, "sample_rate": SAMPLE_RATE, "samples": samples.tolist(),
    })
    assert response.status_code == 200

    body = response.json()
    assert body["events_detected"] == len(truth) == len(body["detections"])
    for detection, t in zip(body["detections"], truth):
        assert detection["node_id"] == node_id
        assert detection["species_class"] == "UNKNOWN"
        assert abs(detection["dominant_freq_hz"] - t.fund_freq_hz) <= 20
        assert detection["harmonic_ratio"] is not None

    stored = client.get("/api/detections/", params={"node_id": node_id}).json()
    assert len(stored) == len(truth)

def test_waveform_ingest_noise_only_stores_nothing():
    samples = np.random.default_rng(22).normal(0, 0.05, SAMPLE_RATE)
    response = client.post("/api/ingest/waveform", json={
        "latitude": 13.0, "longitude": 80.2, "sample_rate": SAMPLE_RATE, "samples": samples.tolist(),
    })
    assert response.status_code == 200
    assert response.json() == {"events_detected": 0, "detections": []}

def test_waveform_ingest_rejects_unknown_node():
    samples = np.zeros(SAMPLE_RATE)
    response = client.post("/api/ingest/waveform", json={
        "node_id": "CHN-NO-SUCH-NODE", "sample_rate": SAMPLE_RATE, "samples": samples.tolist(),
    })
    assert response.status_code == 422

def test_waveform_ingest_rejects_too_short_and_too_long():
    base = {"latitude": 13.0, "longitude": 80.2, "sample_rate": SAMPLE_RATE}
    assert client.post("/api/ingest/waveform", json={**base, "samples": [0.0] * 100}).status_code == 422
    # Default max_recording_seconds is 10
    too_long = [0.0] * (11 * SAMPLE_RATE)
    assert client.post("/api/ingest/waveform", json={**base, "samples": too_long}).status_code == 422
