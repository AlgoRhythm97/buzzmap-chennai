import numpy as np
import pytest
from app.services.dsp import remove_dc_offset, apply_window, extract_features
from app.services.detector import EnergyDetector
from scripts.mock_sensor import generate_wingbeat

def test_remove_dc_offset():
    signal = np.array([10.0, 12.0, 14.0])  # Mean is 12.0
    centered = remove_dc_offset(signal)
    assert np.allclose(centered, [-2.0, 0.0, 2.0])
    assert np.isclose(np.mean(centered), 0.0)

def test_apply_window():
    # Odd length so the window has an exact centre sample
    signal = np.ones(101)
    windowed = apply_window(signal)
    # Hann window tapers to 0 at the ends
    assert windowed[0] == 0.0
    assert windowed[-1] == 0.0
    assert np.isclose(windowed[50], 1.0) # Middle is 1.0

def test_extract_features():
    # Generate a pure 600Hz tone with no noise
    t = np.linspace(0, 0.1, int(16000 * 0.1), endpoint=False)
    signal = 0.5 * np.sin(2 * np.pi * 600 * t)
    
    features = extract_features(signal, 16000)
    
    # Dominant frequency should be exactly 600Hz
    assert np.isclose(features["dominant_freq_hz"], 600.0)
    assert features["rms"] > 0

def test_energy_detector():
    detector = EnergyDetector(threshold_multiplier=3.0, min_event_length=50)

    # Calibrate with pure noise (seeded so the test is deterministic)
    noise = np.random.default_rng(0).normal(0, 0.05, 1000)
    detector.calibrate(noise)
    
    # Create signal: noise -> loud event -> noise
    loud_event = np.sin(np.linspace(0, 10, 200)) * 2.0
    combined = np.concatenate([noise[:400], loud_event, noise[400:]])
    
    events = detector.detect_events(combined)
    assert len(events) == 1
    
    start, end = events[0]
    # The event should roughly align with our loud_event insertion (indices 400 to 600)
    assert 390 <= start <= 410
    assert 590 <= end <= 610

def test_energy_detector_ignores_pure_noise():
    detector = EnergyDetector(threshold_multiplier=3.5, min_event_length=100)
    rng = np.random.default_rng(1)
    detector.calibrate(rng.normal(0, 0.05, 2000))

    assert detector.detect_events(rng.normal(0, 0.05, 2000)) == []

def test_energy_detector_requires_calibration():
    detector = EnergyDetector()
    with pytest.raises(ValueError):
        detector.detect_events(np.zeros(100))
