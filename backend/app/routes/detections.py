from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import DetectionEvent
from ..schemas import DetectionCreate, DetectionResponse

router = APIRouter(prefix="/api/detections", tags=["detections"])

@router.post("/", response_model=DetectionResponse)
def create_detection(detection: DetectionCreate, db: Session = Depends(get_db)):
    """
    Ingest a new detection event from a sensing node.
    """
    db_event = DetectionEvent(**detection.model_dump())
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

@router.get("/", response_model=List[DetectionResponse])
def get_detections(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Retrieve historical detection events for the map dashboard.
    """
    return db.query(DetectionEvent).order_by(DetectionEvent.timestamp.desc()).offset(skip).limit(limit).all()
