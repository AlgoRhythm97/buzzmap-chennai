from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_create_detection():
    # Valid payload matching the DetectionCreate schema
    payload = {
        "latitude": 13.0827,  # Chennai Coordinates
        "longitude": 80.2707,
        "rms": 0.45,
        "dominant_freq_hz": 605.2,
        "peak_magnitude": 1.2
    }
    
    response = client.post("/api/detections/", json=payload)
    assert response.status_code == 200
    
    data = response.json()
    assert data["latitude"] == 13.0827
    assert data["dominant_freq_hz"] == 605.2
    assert data["species_class"] == "UNKNOWN" # Verified open-set default
    assert "id" in data
    assert "timestamp" in data

def test_get_detections():
    response = client.get("/api/detections/")
    assert response.status_code == 200
    
    data = response.json()
    assert isinstance(data, list)
    # The list should contain at least the record we created in the previous test
    assert len(data) >= 1
