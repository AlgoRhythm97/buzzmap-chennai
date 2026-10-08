from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Annotated, Optional

Latitude = Annotated[float, Field(ge=-90, le=90)]
Longitude = Annotated[float, Field(ge=-180, le=180)]

class SensorNodeCreate(BaseModel):
    """
    Schema for registering a sensing node at a fixed location.
    """
    id: str = Field(pattern=r"^[A-Z0-9][A-Z0-9-]{2,39}$", examples=["CHN-ADYAR-01"])
    name: str = Field(min_length=1, max_length=100)
    locality: Optional[str] = Field(default=None, max_length=100)
    latitude: Latitude
    longitude: Longitude
    is_active: bool = True

class SensorNodeResponse(BaseModel):
    """
    Schema for serializing sensing nodes out to the frontend dashboard.
    """
    id: str
    name: str
    locality: Optional[str] = None
    latitude: float
    longitude: float
    is_active: bool
    created_at: datetime
    last_seen_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class DetectionCreate(BaseModel):
    """
    Schema for validating incoming telemetry from the optical sensors.
    """
    node_id: Optional[str] = None
    latitude: Latitude
    longitude: Longitude
    rms: float = Field(ge=0)
    # Upper bound is well above any insect wingbeat; rejects corrupted packets
    dominant_freq_hz: float = Field(gt=0, le=5000)
    peak_magnitude: float = Field(ge=0)
    peak_to_peak: Optional[float] = Field(default=None, ge=0)
    harmonic_ratio: Optional[float] = Field(default=None, ge=0)
    spectral_energy: Optional[float] = Field(default=None, ge=0)

class DetectionResponse(BaseModel):
    """
    Schema for serializing detection events out to the frontend dashboard.
    """
    id: str
    timestamp: datetime
    node_id: Optional[str] = None
    latitude: float
    longitude: float
    rms: float
    dominant_freq_hz: float
    peak_magnitude: float
    peak_to_peak: Optional[float] = None
    harmonic_ratio: Optional[float] = None
    spectral_energy: Optional[float] = None
    species_class: str
    confidence: Optional[float] = None

    # Allows Pydantic to read data even if it is not a dict (e.g. from an ORM model)
    model_config = ConfigDict(from_attributes=True)
