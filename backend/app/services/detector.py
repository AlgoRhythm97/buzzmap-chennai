import numpy as np
from typing import List

class EnergyDetector:
    """
    An explainable energy detector that listens continuously for flight events
    by robustly thresholding the background noise using Median Absolute Deviation (MAD).
    """
    def __init__(self, threshold_multiplier: float = 3.5, min_event_length: int = 100):
        self.threshold_multiplier = threshold_multiplier
        self.min_event_length = min_event_length
        self.baseline_rms = None
        self.mad = None

    def calibrate(self, background_signal: np.ndarray):
        """
        Calibrates the detector's baseline against a sample of pure ambient noise.
        """
        self.baseline_rms = np.sqrt(np.mean(background_signal**2))
        self.mad = np.median(np.abs(background_signal - np.median(background_signal)))
        
    def detect_events(self, signal: np.ndarray) -> List[tuple]:
        """
        Detects events in the signal where energy significantly exceeds the ambient baseline.
        Returns a list of tuples containing (start_idx, end_idx) of detected flight events.
        """
        if self.baseline_rms is None or self.mad is None:
            raise ValueError("Detector must be calibrated before use.")
            
        threshold = self.baseline_rms + (self.threshold_multiplier * self.mad)
        
        # Calculate instantaneous energy (squared amplitude)
        energy = signal**2
        
        # Find indices where energy exceeds the dynamic threshold
        above_threshold = np.where(energy > threshold)[0]
        
        events = []
        if len(above_threshold) == 0:
            return events
            
        # Group continuous sequences into distinct events
        breaks = np.where(np.diff(above_threshold) > 1)[0]
        start_indices = np.insert(above_threshold[breaks + 1], 0, above_threshold[0])
        end_indices = np.append(above_threshold[breaks], above_threshold[-1])
        
        for start, end in zip(start_indices, end_indices):
            if end - start >= self.min_event_length:
                events.append((start, end))
                
        return events
