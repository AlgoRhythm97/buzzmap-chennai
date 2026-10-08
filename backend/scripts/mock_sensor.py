import numpy as np
from dataclasses import dataclass
from typing import List, Optional, Tuple
from scipy.signal.windows import tukey

@dataclass(frozen=True)
class SpeciesProfile:
    """
    Synthetic wingbeat signature for one insect class.

    Values are illustrative ranges for simulation, not calibrated field measurements.
    Mosquito classes deliberately overlap so the classifier has to be cautious.
    """
    freq_mean_hz: float
    freq_std_hz: float
    harmonic2: float  # 2nd-harmonic amplitude relative to the fundamental
    harmonic3: float  # 3rd-harmonic amplitude relative to the fundamental
    amplitude: float

SPECIES_PROFILES = {
    "AEDES": SpeciesProfile(freq_mean_hz=480, freq_std_hz=35, harmonic2=0.45, harmonic3=0.20, amplitude=0.5),
    "CULEX": SpeciesProfile(freq_mean_hz=390, freq_std_hz=30, harmonic2=0.30, harmonic3=0.10, amplitude=0.45),
    "ANOPHELES": SpeciesProfile(freq_mean_hz=560, freq_std_hz=35, harmonic2=0.60, harmonic3=0.30, amplitude=0.4),
    # Larger, slower insects such as houseflies
    "NON_MOSQUITO": SpeciesProfile(freq_mean_hz=190, freq_std_hz=20, harmonic2=0.15, harmonic3=0.05, amplitude=0.8),
}

@dataclass(frozen=True)
class GroundTruthEvent:
    species: str
    fund_freq_hz: float
    start_idx: int
    end_idx: int

def generate_wingbeat(
    duration_sec: float = 0.1,
    sample_rate: int = 16000,
    fund_freq: float = 600.0,
    harmonic2: float = 0.5,
    harmonic3: float = 0.2,
    amplitude: float = 0.5,
    noise_std: float = 0.05,
    rng: Optional[np.random.Generator] = None,
) -> np.ndarray:
    """
    Generates a synthetic mosquito wingbeat signal simulating optical sensor telemetry.

    Args:
        duration_sec: Duration of the signal in seconds.
        sample_rate: The sampling rate in Hz.
        fund_freq: Fundamental frequency in Hz (typically 400-800Hz for mosquitoes).
        harmonic2, harmonic3: Overtone amplitudes relative to the fundamental.
        amplitude: Amplitude of the fundamental.
        noise_std: Standard deviation of the ambient sensor white noise.
        rng: Optional random generator; falls back to the global NumPy RNG.

    Returns:
        A NumPy array containing the synthetic waveform.
    """
    t = np.linspace(0, duration_sec, int(sample_rate * duration_sec), endpoint=False)

    # Fundamental frequency (Wingbeat)
    signal = amplitude * np.sin(2 * np.pi * fund_freq * t)

    # Add harmonics (overtones caused by wing mechanics)
    signal += amplitude * harmonic2 * np.sin(2 * np.pi * (fund_freq * 2) * t)
    signal += amplitude * harmonic3 * np.sin(2 * np.pi * (fund_freq * 3) * t)

    # Add ambient sensor white noise
    normal = rng.normal if rng is not None else np.random.normal
    noise = normal(0, noise_std, signal.shape)

    return signal + noise

def generate_event(
    species: str,
    rng: np.random.Generator,
    sample_rate: int = 16000,
    min_duration_sec: float = 0.05,
    max_duration_sec: float = 0.15,
) -> Tuple[np.ndarray, float]:
    """
    Generates one noise-free beam crossing for a species: a wingbeat whose amplitude
    fades in and out as the insect enters and leaves the IR beam.
    Returns the waveform and the fundamental frequency that was used.
    """
    profile = SPECIES_PROFILES[species]
    fund_freq = float(max(rng.normal(profile.freq_mean_hz, profile.freq_std_hz), 50.0))
    duration = rng.uniform(min_duration_sec, max_duration_sec)

    signal = generate_wingbeat(
        duration_sec=duration,
        sample_rate=sample_rate,
        fund_freq=fund_freq,
        harmonic2=profile.harmonic2 * rng.uniform(0.8, 1.2),
        harmonic3=profile.harmonic3 * rng.uniform(0.8, 1.2),
        amplitude=profile.amplitude * rng.uniform(0.7, 1.3),
        noise_std=0.0,
        rng=rng,
    )
    return signal * tukey(len(signal), alpha=0.3), fund_freq

def generate_stream(
    species_sequence: List[str],
    duration_sec: float = 5.0,
    sample_rate: int = 16000,
    noise_std: float = 0.05,
    rng: Optional[np.random.Generator] = None,
) -> Tuple[np.ndarray, List[GroundTruthEvent]]:
    """
    Simulates a continuous sensor recording: ambient noise with one beam crossing
    per entry in `species_sequence`, each placed at a random spot in its own
    equal-length slot so events never overlap.
    Returns the stream and the ground-truth position of every inserted event.
    """
    rng = rng if rng is not None else np.random.default_rng()
    n_samples = int(duration_sec * sample_rate)
    stream = rng.normal(0, noise_std, n_samples)

    truth = []
    if not species_sequence:
        return stream, truth

    slot_len = n_samples // len(species_sequence)
    for slot, species in enumerate(species_sequence):
        event, fund_freq = generate_event(species, rng, sample_rate)
        if len(event) >= slot_len:
            raise ValueError("Stream is too short for the requested number of events.")
        start = slot * slot_len + int(rng.integers(0, slot_len - len(event)))
        stream[start:start + len(event)] += event
        truth.append(GroundTruthEvent(species, fund_freq, start, start + len(event) - 1))

    return stream, truth
