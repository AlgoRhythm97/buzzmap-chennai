from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional

from ..database import get_db
from ..models import DetectionEvent
from ..schemas import DetectionCreate, DetectionResponse
from ..services.ingestion import store_detection

router = APIRouter(prefix="/api/detections", tags=["detections"])

@router.post("/", response_model=DetectionResponse)
def create_detection(detection: DetectionCreate, db: Session = Depends(get_db)):
    """
    Ingest a new detection event (pre-computed features) from a sensing node.

    When `node_id` is given the node must be registered; its coordinates fill in
    any missing latitude/longitude and its `last_seen_at` is refreshed.
    """
    return store_detection(db, detection)

@router.get("/", response_model=List[DetectionResponse])
def get_detections(
    node_id: Optional[str] = None,
    species: Optional[str] = None,
    since: Optional[datetime] = None,
    until: Optional[datetime] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    """
    Retrieve historical detection events for the map dashboard, newest first.
    """
    query = db.query(DetectionEvent)
    if node_id is not None:
        query = query.filter(DetectionEvent.node_id == node_id)
    if species is not None:
        query = query.filter(DetectionEvent.species_class == species)
    if since is not None:
        query = query.filter(DetectionEvent.timestamp >= since)
    if until is not None:
        query = query.filter(DetectionEvent.timestamp < until)
    return query.order_by(DetectionEvent.timestamp.desc()).offset(skip).limit(limit).all()

@router.get("/{detection_id}", response_model=DetectionResponse)
def get_detection(detection_id: str, db: Session = Depends(get_db)):
    """
    Retrieve a single detection event (used by the result page).
    """
    db_event = db.get(DetectionEvent, detection_id)
    if db_event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Detection {detection_id} not found")
    return db_event
