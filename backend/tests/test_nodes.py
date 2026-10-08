import uuid
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def _node_payload(**overrides):
    # Unique id per test run, since tests share the app database
    payload = {
        "id": f"CHN-TEST-{uuid.uuid4().hex[:8].upper()}",
        "name": "Test Node",
        "locality": "Adyar",
        "latitude": 13.0012,
        "longitude": 80.2565,
    }
    return {**payload, **overrides}

def test_create_and_get_node():
    payload = _node_payload()
    response = client.post("/api/nodes/", json=payload)
    assert response.status_code == 201
    assert response.json()["is_active"] is True

    response = client.get(f"/api/nodes/{payload['id']}")
    assert response.status_code == 200
    assert response.json()["locality"] == "Adyar"

def test_create_duplicate_node_conflicts():
    payload = _node_payload()
    assert client.post("/api/nodes/", json=payload).status_code == 201
    assert client.post("/api/nodes/", json=payload).status_code == 409

def test_get_missing_node_returns_404():
    assert client.get("/api/nodes/CHN-DOES-NOT-EXIST").status_code == 404

def test_list_nodes_filters_by_active():
    active = _node_payload()
    inactive = _node_payload(is_active=False)
    client.post("/api/nodes/", json=active)
    client.post("/api/nodes/", json=inactive)

    active_ids = {n["id"] for n in client.get("/api/nodes/", params={"active": True}).json()}
    inactive_ids = {n["id"] for n in client.get("/api/nodes/", params={"active": False}).json()}

    assert active["id"] in active_ids and active["id"] not in inactive_ids
    assert inactive["id"] in inactive_ids and inactive["id"] not in active_ids
