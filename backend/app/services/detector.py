import numpy as np
from typing import List

# Scales MAD so it estimates the standard deviation for Gaussian noise
MAD_TO_SIGMA = 1.4826

class EnergyDetector:
    """
    An explainable energy detector that listens continuously for flight events
    by robustly thresholding the background noise using Median Absolute Deviation (MAD).

    The signal is converted to a short-time RMS envelope (a sliding window of
    `frame_size` samples), so a single wingbeat is not split apart every time the
    waveform crosses zero. Both the envelope and the threshold are in amplitude units.
    """
    def __init__(self, threshold_multiplier: float = 3.5, min_event_length: int = 100, frame_size: int = 16):
        self.threshold_multiplier = threshold_multiplier
        self.min_event_length = min_event_length
        self.frame_size = frame_size
        self.baseline_rms = None
        self.mad = None

    def rms_envelope(self, signal: np.ndarray) -> np.ndarray:
        """
        Computes a centred sliding-window RMS envelope, one value per input sample.
        """
        kernel = np.ones(self.frame_size) / self.frame_size
        mean_power = np.convolve(signal**2, kernel, mode="same")
        return np.sqrt(np.maximum(mean_power, 0.0))

    def calibrate(self, background_signal: np.ndarray):
        """
        Calibrates the detector's baseline against a sample of pure ambient noise.
        """
        envelope = self.rms_envelope(background_signal)
        self.baseline_rms = float(np.median(envelope))
        self.mad = float(MAD_TO_SIGMA * np.median(np.abs(envelope - self.baseline_rms)))

    @property
    def threshold(self) -> float:
        if self.baseline_rms is None or self.mad is None:
            raise ValueError("Detector must be calibrated before use.")
        return self.baseline_rms + (self.threshold_multiplier * self.mad)

    def detect_events(self, signal: np.ndarray) -> List[tuple]:
        """
        Detects events in the signal where the RMS envelope significantly exceeds the ambient baseline.
        Returns a list of tuples containing (start_idx, end_idx) of detected flight events.
        """
        threshold = self.threshold

        envelope = self.rms_envelope(signal)

        # Find indices where the envelope exceeds the robust threshold
        above_threshold = np.where(envelope > threshold)[0]

        events = []
        if len(above_threshold) == 0:
            return events

        # Group continuous sequences into distinct events
        breaks = np.where(np.diff(above_threshold) > 1)[0]
        start_indices = np.insert(above_threshold[breaks + 1], 0, above_threshold[0])
        end_indices = np.append(above_threshold[breaks], above_threshold[-1])

        for start, end in zip(start_indices, end_indices):
            if end - start >= self.min_event_length:
                events.append((int(start), int(end)))

        return events
