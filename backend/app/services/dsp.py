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
