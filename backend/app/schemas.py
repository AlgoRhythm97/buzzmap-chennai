from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class DetectionCreate(BaseModel):
    """
    Schema for validating incoming telemetry from the optical sensors.
    """
    latitude: float
    longitude: float
    rms: float
    dominant_freq_hz: float
    peak_magnitude: float

class DetectionResponse(BaseModel):
    """
    Schema for serializing detection events out to the frontend dashboard.
    """
    id: str
    timestamp: datetime
    latitude: float
    longitude: float
    rms: float
    dominant_freq_hz: float
    peak_magnitude: float
    species_class: str
    confidence: Optional[float] = None
    
    # Allows Pydantic to read data even if it is not a dict (e.g. from an ORM model)
    model_config = ConfigDict(from_attributes=True)
