from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import WaveformIngest, WaveformIngestResponse
from ..services.ingestion import ingest_waveform

router = APIRouter(prefix="/api/ingest", tags=["ingest"])

@router.post("/waveform", response_model=WaveformIngestResponse)
def ingest_raw_waveform(payload: WaveformIngest, db: Session = Depends(get_db)):
    """
    Ingest a raw optical capture from a sensing node. The server calibrates the
    energy detector on the pre-trigger baseline, extracts features for every
    flight event found and stores one detection per event.
    """
    detections = ingest_waveform(db, payload)
    return WaveformIngestResponse(events_detected=len(detections), detections=detections)
