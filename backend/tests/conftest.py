import os

# Must run before any `app` import: settings and the engine are created at import time.
# Tests get a fresh in-memory database per run and never touch buzzmap.db.
os.environ["DATABASE_URL"] = "sqlite://"

# Ignore any locally trained models/classifier.joblib so results don't depend on it;
# tests that need a classifier provide their own.
os.environ["MODEL_PATH"] = os.path.join(os.path.dirname(__file__), "no-such-model.joblib")
