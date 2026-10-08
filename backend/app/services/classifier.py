import joblib
import numpy as np
from functools import lru_cache
from pathlib import Path
from typing import Optional, Tuple

from ..config import settings

UNKNOWN = "UNKNOWN"

# Order matters: the model is trained on feature vectors in exactly this order
FEATURE_NAMES = [
    "dominant_freq_hz",
    "harmonic_ratio",
    "rms",
    "peak_to_peak",
    "peak_magnitude",
    "spectral_energy",
]

DEFAULT_MODEL_PATH = Path(__file__).resolve().parents[2] / "models" / "classifier.joblib"

class SpeciesClassifier:
    """
    Random Forest species classifier with open-set rejection.

    It only names a class when two checks pass; otherwise it answers UNKNOWN:
      1. Every feature lies inside the range seen during training (with a margin),
         so insects unlike anything in the training data are not forced into a class.
      2. The winning class probability reaches `uncertainty_threshold`.
    """
    def __init__(self, bundle: dict, uncertainty_threshold: float):
        self.model = bundle["model"]
        # Predictions are one event at a time; thread start-up would dominate
        self.model.n_jobs = 1
        self.feature_names = bundle["feature_names"]
        self.feature_low = np.asarray(bundle["feature_low"])
        self.feature_high = np.asarray(bundle["feature_high"])
        self.uncertainty_threshold = uncertainty_threshold

    def classify(self, features: dict) -> Tuple[str, Optional[float]]:
        """
        Returns (species_class, confidence). Confidence is the top class probability,
        reported even when the answer is UNKNOWN; it is None when no prediction was made.
        """
        values = [features.get(name) for name in self.feature_names]
        if any(v is None for v in values):
            return UNKNOWN, None

        x = np.asarray(values, dtype=float)
        if np.any(x < self.feature_low) or np.any(x > self.feature_high):
            return UNKNOWN, None

        probabilities = self.model.predict_proba(x.reshape(1, -1))[0]
        best = int(np.argmax(probabilities))
        confidence = float(probabilities[best])
        if confidence < self.uncertainty_threshold:
            return UNKNOWN, confidence
        return str(self.model.classes_[best]), confidence

def save_bundle(model, training_features: np.ndarray, path: Path, margin: float = 0.1):
    """
    Saves the model with the accepted feature range: the 0.5th-99.5th percentile
    of the training data, widened by `margin` of that span on each side.
    """
    low = np.percentile(training_features, 0.5, axis=0)
    high = np.percentile(training_features, 99.5, axis=0)
    span = high - low
    bundle = {
        "model": model,
        "feature_names": FEATURE_NAMES,
        "feature_low": (low - margin * span).tolist(),
        "feature_high": (high + margin * span).tolist(),
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, path)

@lru_cache(maxsize=1)
def get_classifier() -> Optional[SpeciesClassifier]:
    """
    Loads the trained classifier once. Returns None when no model file exists,
    in which case detections are stored as UNKNOWN.
    """
    path = Path(settings.model_path) if settings.model_path else DEFAULT_MODEL_PATH
    if not path.exists():
        return None
    return SpeciesClassifier(joblib.load(path), settings.uncertainty_threshold)
