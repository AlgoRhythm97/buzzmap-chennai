import numpy as np
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..config import settings
from ..models import DetectionEvent, SensorNode
from ..schemas import DetectionCreate, WaveformIngest
from .detector import EnergyDetector
from .dsp import process_waveform

def store_detection(db: Session, detection: DetectionCreate, commit: bool = True) -> DetectionEvent:
    """
    Persists one detection. When `node_id` is given the node must be registered;
    its coordinates fill in any missing latitude/longitude and its `last_seen_at` is refreshed.
    """
    data = detection.model_dump()

    node = None
    if detection.node_id is not None:
        node = db.get(SensorNode, detection.node_id)
        if node is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Unknown node_id {detection.node_id}; register it via /api/nodes first",
            )
        if data["latitude"] is None:
            data["latitude"] = node.latitude
            data["longitude"] = node.longitude

    db_event = DetectionEvent(**data)
    db.add(db_event)
    db.flush()  # assigns the default timestamp

    if node is not None:
        node.last_seen_at = db_event.timestamp

    if commit:
        db.commit()
        db.refresh(db_event)
    return db_event

def ingest_waveform(db: Session, payload: WaveformIngest) -> List[DetectionEvent]:
    """
    Server-side pipeline for a raw sensor capture: calibrate the energy detector on the
    leading pre-trigger samples, find flight events in the rest, extract DSP features
    for each padded event window and store one detection per event.
    """
    # Reject unknown nodes even when the capture turns out to contain no events
    if payload.node_id is not None and db.get(SensorNode, payload.node_id) is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Unknown node_id {payload.node_id}; register it via /api/nodes first",
        )

    samples = np.asarray(payload.samples, dtype=float)
    baseline_len = int(payload.sample_rate * settings.detector_baseline_ms / 1000)
    if len(samples) <= baseline_len * 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Capture too short: need more than {baseline_len * 2} samples "
                   f"({settings.detector_baseline_ms} ms of pre-trigger baseline plus signal)",
        )

    detector = EnergyDetector(
        threshold_multiplier=settings.detector_threshold_multiplier,
        min_event_length=int(payload.sample_rate * settings.detector_min_event_ms / 1000),
    )
    detector.calibrate(samples[:baseline_len])
    windows = detector.extract_event_windows(samples, padding=settings.detector_padding_samples)

    stored = []
    for window in windows:
        features = process_waveform(
            window, payload.sample_rate,
            band_low_hz=settings.band_low_hz, band_high_hz=settings.band_high_hz,
        )
        detection = DetectionCreate(
            node_id=payload.node_id,
            latitude=payload.latitude,
            longitude=payload.longitude,
            **features,
        )
        stored.append(store_detection(db, detection, commit=False))

    # One transaction per capture: either every event is stored or none
    db.commit()
    for event in stored:
        db.refresh(event)
    return stored
