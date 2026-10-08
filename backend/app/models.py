from sqlalchemy import Column, String, Float, DateTime
from datetime import datetime
import uuid
from .database import Base

class DetectionEvent(Base):
    __tablename__ = "detections"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Location (e.g. coordinates of the sensing node)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    # DSP Features
    rms = Column(Float, nullable=False)
    dominant_freq_hz = Column(Float, nullable=False)
    peak_magnitude = Column(Float, nullable=False)
    
    # ML Classification Results
    # Defaults to UNKNOWN for the open-set rejection architecture
    species_class = Column(String, default="UNKNOWN", index=True)
    confidence = Column(Float, nullable=True)
