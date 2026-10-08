import numpy as np

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

def extract_features(signal: np.ndarray, sample_rate: int) -> dict:
    """
    Extracts key flight features from the windowed signal.
    """
    # Time domain feature: Root Mean Square (RMS)
    rms = np.sqrt(np.mean(signal**2))
    
    # Frequency domain features
    freqs, magnitudes = compute_fft(signal, sample_rate)
    
    # Find dominant frequency
    dominant_idx = np.argmax(magnitudes)
    dominant_freq = freqs[dominant_idx]
    
    return {
        "rms": float(rms),
        "dominant_freq_hz": float(dominant_freq),
        "peak_magnitude": float(magnitudes[dominant_idx])
    }
