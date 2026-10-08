import joblib
import numpy as np
import pytest
from sklearn.model_selection import train_test_split

from app.services.classifier import FEATURE_NAMES, UNKNOWN, SpeciesClassifier, save_bundle
from scripts.train_classifier import build_dataset, train

@pytest.fixture(scope="module")
def trained(tmp_path_factory):
    X, y = build_dataset(samples_per_class=150, seed=1)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, stratify=y, random_state=1)
    path = tmp_path_factory.mktemp("model") / "classifier.joblib"
    save_bundle(train(X_train, y_train), X_train, path)
    return joblib.load(path), X_test, y_test

def _as_features(row):
    return dict(zip(FEATURE_NAMES, row))

def test_known_species_are_classified(trained):
    bundle, X_test, y_test = trained
    classifier = SpeciesClassifier(bundle, uncertainty_threshold=0.6)
    predictions = [classifier.classify(_as_features(row))[0] for row in X_test]

    named = [(p, t) for p, t in zip(predictions, y_test) if p != UNKNOWN]
    # Most events get a name, and named answers are almost always right
    assert len(named) / len(y_test) > 0.7
    assert np.mean([p == t for p, t in named]) > 0.9

def test_out_of_range_features_are_unknown(trained):
    bundle, X_test, _ = trained
    classifier = SpeciesClassifier(bundle, uncertainty_threshold=0.6)
    features = _as_features(X_test[0])
    features["dominant_freq_hz"] = 1400.0  # far above every trained species

    assert classifier.classify(features) == (UNKNOWN, None)

def test_low_confidence_is_unknown(trained):
    bundle, X_test, _ = trained
    # No probability can reach a threshold above 1, so everything is rejected
    classifier = SpeciesClassifier(bundle, uncertainty_threshold=1.01)
    label, confidence = classifier.classify(_as_features(X_test[0]))

    assert label == UNKNOWN
    assert 0 < confidence <= 1

def test_missing_feature_is_unknown(trained):
    bundle, X_test, _ = trained
    classifier = SpeciesClassifier(bundle, uncertainty_threshold=0.6)
    features = _as_features(X_test[0])
    features["harmonic_ratio"] = None

    assert classifier.classify(features) == (UNKNOWN, None)
