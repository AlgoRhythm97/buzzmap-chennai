import uuid
from datetime import timedelta
from fastapi.testclient import TestClient
from app.database import SessionLocal
from app.main import app
from app.models import DetectionEvent, SensorNode
from app.timeutils import utc_now

client = TestClient(app)

def _node_with_detections(ages_and_species):
    """Registers a node and inserts detections `age` ago, bypassing the API to control timestamps."""
    node_id = f"CHN-TEST-{uuid.uuid4().hex[:8].upper()}"
    now = utc_now()
    db = SessionLocal()
    try:
        db.add(SensorNode(id=node_id, name="Stats Node", latitude=13.0, longitude=80.2, last_seen_at=now))
        for age, species in ages_and_species:
            db.add(DetectionEvent(
                node_id=node_id, timestamp=now - age, latitude=13.0, longitude=80.2,
                rms=0.3, dominant_freq_hz=480.0, peak_magnitude=0.2, species_class=species,
            ))
        db.commit()
    finally:
        db.close()
    return node_id

def test_summary_counts_window_and_nodes():
    before = client.get("/api/stats/summary").json()
    _node_with_detections([
        (timedelta(minutes=5), "AEDES"),
        (timedelta(minutes=10), "AEDES"),
        (timedelta(minutes=20), "UNKNOWN"),
        (timedelta(hours=48), "CULEX"),  # outside the 24 h window
    ])
    after = client.get("/api/stats/summary").json()

    assert after["total_detections"] - before["total_detections"] == 4
    assert after["detections_in_window"] - before["detections_in_window"] == 3
    assert after["by_species_in_window"]["AEDES"] - before["by_species_in_window"].get("AEDES", 0) == 2
    assert after["total_nodes"] - before["total_nodes"] == 1
    assert after["online_nodes"] - before["online_nodes"] == 1

def test_timeseries_buckets_by_hour_and_species():
    node_id = _node_with_detections([
        (timedelta(minutes=0), "AEDES"),
        (timedelta(minutes=0), "CULEX"),
        (timedelta(hours=3), "AEDES"),
        (timedelta(hours=30), "AEDES"),  # outside the 24 h range
    ])
    buckets = client.get("/api/stats/timeseries", params={"node_id": node_id}).json()

    assert len(buckets) == 24
    starts = [b["bucket_start"] for b in buckets]
    assert starts == sorted(starts)
    assert buckets[-1]["by_species"] == {"AEDES": 1, "CULEX": 1}
    assert buckets[-4]["by_species"] == {"AEDES": 1}
    assert sum(b["total"] for b in buckets) == 3

def test_timeseries_bucket_count_rounds_up():
    buckets = client.get("/api/stats/timeseries", params={"hours": 1, "bucket_minutes": 25}).json()
    assert len(buckets) == 3  # 60 / 25 rounded up

def test_node_activity_counts_species_in_window():
    node_id = _node_with_detections([
        (timedelta(minutes=5), "AEDES"),
        (timedelta(minutes=6), "AEDES"),
        (timedelta(minutes=7), "ANOPHELES"),
        (timedelta(hours=30), "CULEX"),  # outside the 24 h window
    ])
    activity = {a["node_id"]: a for a in client.get("/api/stats/nodes").json()}

    assert activity[node_id]["total"] == 3
    assert activity[node_id]["by_species"] == {"AEDES": 2, "ANOPHELES": 1}

    week = {a["node_id"]: a for a in client.get("/api/stats/nodes", params={"window_hours": 48}).json()}
    assert week[node_id]["by_species"]["CULEX"] == 1
