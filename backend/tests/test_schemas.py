import pytest
from pydantic import ValidationError
from app.schemas import DetectionCreate, SensorNodeCreate

VALID_DETECTION = {
    "latitude": 13.0827,
    "longitude": 80.2707,
    "rms": 0.45,
    "dominant_freq_hz": 480.0,
    "peak_magnitude": 0.2,
}

def test_detection_accepts_optional_features():
    detection = DetectionCreate(**VALID_DETECTION, node_id="CHN-ADYAR-01", harmonic_ratio=0.4)
    assert detection.node_id == "CHN-ADYAR-01"
    assert detection.peak_to_peak is None

@pytest.mark.parametrize("field, value", [
    ("latitude", 91),
    ("longitude", -181),
    ("rms", -0.1),
    ("dominant_freq_hz", 0),
    ("dominant_freq_hz", 9000),
    ("peak_magnitude", -1),
    ("harmonic_ratio", -0.5),
])
def test_detection_rejects_out_of_range(field, value):
    with pytest.raises(ValidationError):
        DetectionCreate(**{**VALID_DETECTION, field: value})

def test_node_id_format():
    SensorNodeCreate(id="CHN-ADYAR-01", name="Adyar", latitude=13.0, longitude=80.25)
    for bad_id in ["chn-adyar-01", "-CHN", "A", "CHN ADYAR"]:
        with pytest.raises(ValidationError):
            SensorNodeCreate(id=bad_id, name="Adyar", latitude=13.0, longitude=80.25)

def test_detection_location_from_node_only():
    features = {k: v for k, v in VALID_DETECTION.items() if k not in ("latitude", "longitude")}
    detection = DetectionCreate(**features, node_id="CHN-ADYAR-01")
    assert detection.latitude is None

def test_detection_requires_some_location():
    features = {k: v for k, v in VALID_DETECTION.items() if k not in ("latitude", "longitude")}
    with pytest.raises(ValidationError):
        DetectionCreate(**features)
    with pytest.raises(ValidationError):
        DetectionCreate(**features, latitude=13.0)
