"""
Trains the species classifier on synthetic wingbeat events.

Usage (from backend/):
    python -m scripts.train_classifier
    python -m scripts.train_classifier --samples-per-class 1000 --out models/classifier.joblib
"""
import argparse
import numpy as np
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split

from app.config import settings
from app.services.classifier import DEFAULT_MODEL_PATH, FEATURE_NAMES, save_bundle
from app.services.dsp import process_waveform
from scripts.mock_sensor import SPECIES_PROFILES, generate_event

def build_dataset(samples_per_class: int, sample_rate: int = 16000, seed: int = 0):
    """
    Simulates beam crossings for every species and runs each through the same
    DSP pipeline used at ingestion, with random sensor noise and padding.
    Returns (X, y) with X columns in FEATURE_NAMES order.
    """
    rng = np.random.default_rng(seed)
    padding = settings.detector_padding_samples
    X, y = [], []
    for species in SPECIES_PROFILES:
        for _ in range(samples_per_class):
            event, _ = generate_event(species, rng, sample_rate)
            noise_std = rng.uniform(0.02, 0.08)
            window = np.concatenate([np.zeros(padding), event, np.zeros(padding)])
            window += rng.normal(0, noise_std, len(window))

            features = process_waveform(
                window, sample_rate,
                band_low_hz=settings.band_low_hz, band_high_hz=settings.band_high_hz,
            )
            X.append([features[name] for name in FEATURE_NAMES])
            y.append(species)
    return np.asarray(X), np.asarray(y)

def train(X: np.ndarray, y: np.ndarray, seed: int = 0) -> RandomForestClassifier:
    model = RandomForestClassifier(n_estimators=200, min_samples_leaf=2, random_state=seed, n_jobs=-1)
    model.fit(X, y)
    return model

def main():
    parser = argparse.ArgumentParser(description="Train the BuzzMap species classifier on synthetic data.")
    parser.add_argument("--samples-per-class", type=int, default=600)
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--out", type=Path, default=DEFAULT_MODEL_PATH)
    args = parser.parse_args()

    X, y = build_dataset(args.samples_per_class, seed=args.seed)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, stratify=y, random_state=args.seed)

    model = train(X_train, y_train, seed=args.seed)
    print(classification_report(y_test, model.predict(X_test)))

    # Refit on everything before saving
    model = train(X, y, seed=args.seed)
    save_bundle(model, X, args.out)
    print(f"Saved classifier to {args.out}")

if __name__ == "__main__":
    main()
