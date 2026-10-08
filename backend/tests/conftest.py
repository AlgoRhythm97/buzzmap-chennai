import os

# Must run before any `app` import: settings and the engine are created at import time.
# Tests get a fresh in-memory database per run and never touch buzzmap.db.
os.environ["DATABASE_URL"] = "sqlite://"
