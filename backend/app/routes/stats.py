from collections import Counter, defaultdict
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models import DetectionEvent, SensorNode
from ..schemas import StatsSummary, TimeseriesBucket

router = APIRouter(prefix="/api/stats", tags=["stats"])

@router.get("/summary", response_model=StatsSummary)
def get_summary(
    window_hours: int = Query(24, ge=1, le=24 * 30),
    online_minutes: int = Query(15, ge=1, le=24 * 60),
    db: Session = Depends(get_db),
):
    """
    Headline KPIs: detection totals, species breakdown over the window and node health.
    """
    now = datetime.utcnow()
    window_start = now - timedelta(hours=window_hours)

    species_counts = (
        db.query(DetectionEvent.species_class, func.count())
        .filter(DetectionEvent.timestamp >= window_start)
        .group_by(DetectionEvent.species_class)
        .all()
    )
    by_species = {species: count for species, count in species_counts}

    active = db.query(SensorNode).filter(SensorNode.is_active.is_(True))
    online = active.filter(SensorNode.last_seen_at >= now - timedelta(minutes=online_minutes))

    return StatsSummary(
        window_hours=window_hours,
        total_detections=db.query(func.count(DetectionEvent.id)).scalar(),
        detections_in_window=sum(by_species.values()),
        by_species_in_window=by_species,
        total_nodes=db.query(func.count(SensorNode.id)).scalar(),
        active_nodes=active.count(),
        online_nodes=online.count(),
        online_minutes=online_minutes,
        last_detection_at=db.query(func.max(DetectionEvent.timestamp)).scalar(),
    )

@router.get("/timeseries", response_model=List[TimeseriesBucket])
def get_timeseries(
    hours: int = Query(24, ge=1, le=24 * 7),
    bucket_minutes: int = Query(60, ge=5, le=24 * 60),
    node_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Detection counts per time bucket (oldest first), split by species, for activity charts.
    Every bucket in the range is returned, including empty ones, so charts have no gaps.
    """
    bucket = timedelta(minutes=bucket_minutes)
    now = datetime.utcnow()
    # Align buckets to multiples of bucket_minutes since midnight
    midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
    current_start = midnight + ((now - midnight) // bucket) * bucket
    n_buckets = -(-hours * 60 // bucket_minutes)  # ceiling division
    first_start = current_start - (n_buckets - 1) * bucket

    query = db.query(DetectionEvent.timestamp, DetectionEvent.species_class).filter(
        DetectionEvent.timestamp >= first_start
    )
    if node_id is not None:
        query = query.filter(DetectionEvent.node_id == node_id)

    counts = defaultdict(Counter)
    for timestamp, species in query.all():
        counts[(timestamp - first_start) // bucket][species] += 1

    return [
        TimeseriesBucket(
            bucket_start=first_start + i * bucket,
            total=sum(counts[i].values()),
            by_species=dict(counts[i]),
        )
        for i in range(n_buckets)
    ]
