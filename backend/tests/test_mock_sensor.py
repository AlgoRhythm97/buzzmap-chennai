import numpy as np
import pytest
from app.services.dsp import process_waveform
from app.services.detector import EnergyDetector
from scripts.mock_sensor import SPECIES_PROFILES, generate_event, generate_stream

SAMPLE_RATE = 16000

@pytest.mark.parametrize("species", list(SPECIES_PROFILES))
def test_generate_event_recovers_fundamental(species):
    rng = np.random.default_rng(10)
    event, fund_freq = generate_event(species, rng, SAMPLE_RATE)
    features = process_waveform(event, SAMPLE_RATE, band_low_hz=100, band_high_hz=1500)

    # FFT bin width is sample_rate / len(event), at most 20 Hz for a 0.05 s event
    assert abs(features["dominant_freq_hz"] - fund_freq) <= 20

def test_generate_stream_ground_truth():
    species = ["AEDES", "CULEX", "ANOPHELES", "NON_MOSQUITO"]
    stream, truth = generate_stream(species, duration_sec=4.0, rng=np.random.default_rng(11))

    assert len(stream) == 4 * SAMPLE_RATE
    assert [t.species for t in truth] == species
    assert all(a.end_idx < b.start_idx for a, b in zip(truth, truth[1:]))

def test_detector_finds_every_streamed_event():
    rng = np.random.default_rng(12)
    detector = EnergyDetector(threshold_multiplier=3.5, min_event_length=200)
    detector.calibrate(rng.normal(0, 0.05, SAMPLE_RATE))

    stream, truth = generate_stream(["AEDES", "CULEX", "ANOPHELES"], duration_sec=3.0, rng=rng)
    events = detector.detect_events(stream)

    assert len(events) == len(truth)
    for (start, end), t in zip(events, truth):
        # Each detection overlaps its inserted event
        assert start <= t.end_idx and end >= t.start_idx

def test_generate_stream_rejects_overcrowding():
    with pytest.raises(ValueError):
        generate_stream(["AEDES"] * 50, duration_sec=1.0, rng=np.random.default_rng(13))
