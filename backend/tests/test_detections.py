import uuid
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

FEATURES = {"rms": 0.3, "dominant_freq_hz": 480.0, "peak_magnitude": 0.2}

def _register_node():
    node = {
        "id": f"CHN-TEST-{uuid.uuid4().hex[:8].upper()}",
        "name": "Test Node",
        "latitude": 12.9815,
        "longitude": 80.2180,
    }
    assert client.post("/api/nodes/", json=node).status_code == 201
    return node

def test_detection_inherits_node_location_and_updates_last_seen():
    node = _register_node()
    response = client.post("/api/detections/", json={**FEATURES, "node_id": node["id"]})
    assert response.status_code == 200

    data = response.json()
    assert data["node_id"] == node["id"]
    assert data["latitude"] == node["latitude"]
    assert data["longitude"] == node["longitude"]

    node_after = client.get(f"/api/nodes/{node['id']}").json()
    assert node_after["last_seen_at"] == data["timestamp"]

def test_detection_with_unknown_node_is_rejected():
    response = client.post("/api/detections/", json={**FEATURES, "node_id": "CHN-NO-SUCH-NODE"})
    assert response.status_code == 422

def test_get_detection_by_id():
    created = client.post("/api/detections/", json={**FEATURES, "latitude": 13.0, "longitude": 80.2}).json()

    response = client.get(f"/api/detections/{created['id']}")
    assert response.status_code == 200
    assert response.json() == created

    assert client.get("/api/detections/does-not-exist").status_code == 404

def test_filter_detections_by_node_and_time():
    node = _register_node()
    other = _register_node()
    for _ in range(3):
        client.post("/api/detections/", json={**FEATURES, "node_id": node["id"]})
    client.post("/api/detections/", json={**FEATURES, "node_id": other["id"]})

    results = client.get("/api/detections/", params={"node_id": node["id"]}).json()
    assert len(results) == 3
    assert all(d["node_id"] == node["id"] for d in results)

    future = (datetime.utcnow() + timedelta(hours=1)).isoformat()
    assert client.get("/api/detections/", params={"node_id": node["id"], "since": future}).json() == []
    assert len(client.get("/api/detections/", params={"node_id": node["id"], "until": future}).json()) == 3

def test_list_limit_is_bounded():
    assert client.get("/api/detections/", params={"limit": 0}).status_code == 422
    assert client.get("/api/detections/", params={"limit": 5000}).status_code == 422
