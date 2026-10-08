"""
Seeds the database with the Chennai demo nodes and a few days of historical detections.

Writes directly to the database (so timestamps can be backdated) but runs every
simulated event through the same DSP and classifier as live ingestion.

Usage (from backend/):
    python -m scripts.seed_demo --reset
    python -m scripts.seed_demo --days 3 --per-node-per-day 40
"""
import argparse
import numpy as np
from datetime import timedelta

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models import DetectionEvent, SensorNode
from app.services.classifier import get_classifier
from app.services.dsp import process_waveform
from app.services.ingestion import classify_features
from app.timeutils import utc_now
from scripts.chennai_nodes import CHENNAI_NODES, node_registration, pick_species
from scripts.mock_sensor import generate_event

SAMPLE_RATE = 16000
IST_OFFSET = timedelta(hours=5, minutes=30)

# Relative mosquito activity per local (IST) hour: peaks around dawn and dusk
HOURLY_ACTIVITY = np.array([
    3, 2, 2, 2, 3, 6, 8, 6, 4, 3, 2, 2,  # 00-11
    2, 2, 2, 3, 4, 6, 9, 10, 8, 6, 5, 4,  # 12-23
], dtype=float)

def random_timestamps(rng, count: int, days: int, now):
    """Draws UTC timestamps over the last `days` days following the IST activity curve."""
    hour_probabilities = HOURLY_ACTIVITY / HOURLY_ACTIVITY.sum()
    local_now = now + IST_OFFSET
    local_midnight = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    timestamps = []
    while len(timestamps) < count:
        day = int(rng.integers(0, days + 1))
        hour = int(rng.choice(24, p=hour_probabilities))
        local = local_midnight - timedelta(days=day) + timedelta(hours=hour, seconds=float(rng.uniform(0, 3600)))
        if local < local_now:
            timestamps.append(local - IST_OFFSET)
    return sorted(timestamps)

def simulate_features(species: str, rng) -> dict:
    """One beam crossing with sensor noise, through the ingestion DSP pipeline."""
    event, _ = generate_event(species, rng, SAMPLE_RATE)
    padding = settings.detector_padding_samples
    window = np.concatenate([np.zeros(padding), event, np.zeros(padding)])
    window += rng.normal(0, rng.uniform(0.02, 0.08), len(window))
    return process_waveform(window, SAMPLE_RATE, settings.band_low_hz, settings.band_high_hz)

def seed(days: int, per_node_per_day: int, reset: bool, seed_value: int):
    if reset:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    rng = np.random.default_rng(seed_value)
    now = utc_now()
    db = SessionLocal()
    try:
        for node_def in CHENNAI_NODES:
            node = db.get(SensorNode, node_def["id"])
            if node is None:
                node = SensorNode(**node_registration(node_def))
                db.add(node)

            count = int(rng.poisson(per_node_per_day * days))
            timestamps = random_timestamps(rng, count, days, now)
            for timestamp, species in zip(timestamps, pick_species(node_def, rng, count)):
                features = simulate_features(species, rng)
                species_class, confidence = classify_features(features)
                db.add(DetectionEvent(
                    node_id=node.id, timestamp=timestamp,
                    latitude=node.latitude, longitude=node.longitude,
                    species_class=species_class, confidence=confidence,
                    **features,
                ))
            if timestamps:
                node.last_seen_at = max(timestamps[-1], node.last_seen_at or timestamps[-1])
            db.commit()
            print(f"{node.id:<24} {count:>5} detections")
    finally:
        db.close()

def main():
    parser = argparse.ArgumentParser(description="Seed BuzzMap Chennai with demo nodes and historical detections.")
    parser.add_argument("--days", type=int, default=7)
    parser.add_argument("--per-node-per-day", type=int, default=25)
    parser.add_argument("--reset", action="store_true", help="drop and recreate all tables first")
    parser.add_argument("--seed", type=int, default=0)
    args = parser.parse_args()

    if get_classifier() is None:
        print("No trained model found; detections will be UNKNOWN. Run `python -m scripts.train_classifier` first.")
    seed(args.days, args.per_node_per_day, args.reset, args.seed)

if __name__ == "__main__":
    main()
