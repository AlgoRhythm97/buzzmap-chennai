import numpy as np
from typing import Optional

def remove_dc_offset(signal: np.ndarray) -> np.ndarray:
    """
    Removes the DC offset (zero-frequency bias) from the signal
    by subtracting the mean.
    """
    return signal - np.mean(signal)

def apply_window(signal: np.ndarray) -> np.ndarray:
    """
    Applies a Hann window to the signal to reduce spectral leakage
    at the edges before performing an FFT.
    """
    window = np.hanning(len(signal))
    return signal * window

def compute_fft(signal: np.ndarray, sample_rate: int):
    """
    Computes the one-sided Fast Fourier Transform (FFT) of the signal.
    Returns the frequencies and their corresponding magnitudes.
    """
    n = len(signal)
    fft_result = np.fft.rfft(signal)
    freqs = np.fft.rfftfreq(n, d=1.0/sample_rate)
    magnitudes = np.abs(fft_result) / n
    return freqs, magnitudes

def time_domain_features(signal: np.ndarray) -> dict:
    """
    Amplitude features describing how strongly the insect modulated the beam.
    """
    return {
        "rms": float(np.sqrt(np.mean(signal**2))),
        "peak_to_peak": float(np.ptp(signal)),
    }

def spectral_features(
    signal: np.ndarray,
    sample_rate: int,
    band_low_hz: Optional[float] = None,
    band_high_hz: Optional[float] = None,
    harmonic_tolerance_bins: int = 2,
) -> dict:
    """
    Frequency features describing the wingbeat.

    The dominant frequency is searched only inside [band_low_hz, band_high_hz] when given,
    so mains hum or slow body-shadow components cannot be mistaken for the wingbeat.
    The harmonic ratio is the 2nd-harmonic magnitude divided by the fundamental magnitude.
    """
    freqs, magnitudes = compute_fft(signal, sample_rate)

    in_band = np.ones_like(freqs, dtype=bool)
    if band_low_hz is not None:
        in_band &= freqs >= band_low_hz
    if band_high_hz is not None:
        in_band &= freqs <= band_high_hz
    band_indices = np.where(in_band)[0]
    if len(band_indices) == 0:
        raise ValueError("No FFT bins fall inside the requested frequency band.")

    dominant_idx = band_indices[np.argmax(magnitudes[band_indices])]
    dominant_freq = freqs[dominant_idx]
    peak_magnitude = magnitudes[dominant_idx]

    # Largest magnitude near twice the fundamental (tolerates bin rounding)
    harmonic_ratio = 0.0
    harmonic_idx = int(np.argmin(np.abs(freqs - 2 * dominant_freq)))
    if 2 * dominant_freq <= freqs[-1] and peak_magnitude > 0:
        lo = max(harmonic_idx - harmonic_tolerance_bins, 0)
        hi = harmonic_idx + harmonic_tolerance_bins + 1
        harmonic_ratio = np.max(magnitudes[lo:hi]) / peak_magnitude

    return {
        "dominant_freq_hz": float(dominant_freq),
        "peak_magnitude": float(peak_magnitude),
        "harmonic_ratio": float(harmonic_ratio),
        "spectral_energy": float(np.sum(magnitudes**2)),
    }

def extract_features(
    signal: np.ndarray,
    sample_rate: int,
    band_low_hz: Optional[float] = None,
    band_high_hz: Optional[float] = None,
) -> dict:
    """
    Extracts key flight features from the windowed signal.
    """
    return {
        **time_domain_features(signal),
        **spectral_features(signal, sample_rate, band_low_hz, band_high_hz),
    }

def process_waveform(
    signal: np.ndarray,
    sample_rate: int,
    band_low_hz: Optional[float] = None,
    band_high_hz: Optional[float] = None,
) -> dict:
    """
    Full DSP pipeline for one flight event: remove DC offset, then measure
    amplitude features on the centred signal and spectral features on the
    Hann-windowed signal (windowing would otherwise distort the RMS).
    """
    centred = remove_dc_offset(np.asarray(signal, dtype=float))
    windowed = apply_window(centred)
    return {
        **time_domain_features(centred),
        **spectral_features(windowed, sample_rate, band_low_hz, band_high_hz),
    }
