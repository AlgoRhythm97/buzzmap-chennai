from pydantic import BaseModel, ConfigDict, Field, model_validator
from datetime import datetime
from typing import Annotated, Dict, List, Optional

from .config import settings

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

class LocatedPayload(BaseModel):
    """
    Common location fields for sensor uploads.
    Coordinates may be omitted when `node_id` is given; the node's location is used.
    """
    node_id: Optional[str] = None
    latitude: Optional[Latitude] = None
    longitude: Optional[Longitude] = None

    @model_validator(mode="after")
    def require_location(self):
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("latitude and longitude must be given together")
        if self.latitude is None and self.node_id is None:
            raise ValueError("either node_id or latitude/longitude is required")
        return self

class DetectionCreate(LocatedPayload):
    """
    Schema for validating incoming telemetry (pre-computed features) from the optical sensors.
    """
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

class WaveformIngest(LocatedPayload):
    """
    Schema for a raw optical capture; the server runs detection and DSP itself.
    The first `detector_baseline_ms` of samples must be pre-trigger ambient noise.
    """
    sample_rate: int = Field(ge=1000, le=96000)
    samples: List[float] = Field(min_length=1)

    @model_validator(mode="after")
    def limit_duration(self):
        max_samples = settings.max_recording_seconds * self.sample_rate
        if len(self.samples) > max_samples:
            raise ValueError(f"capture longer than {settings.max_recording_seconds} s ({max_samples} samples)")
        return self

class WaveformIngestResponse(BaseModel):
    events_detected: int
    detections: List[DetectionResponse]

class StatsSummary(BaseModel):
    """
    Headline KPIs for the surveillance dashboard.
    """
    window_hours: int
    total_detections: int
    detections_in_window: int
    by_species_in_window: Dict[str, int]
    total_nodes: int
    active_nodes: int
    # Active nodes that reported within the last `online_minutes`
    online_nodes: int
    online_minutes: int
    last_detection_at: Optional[datetime] = None

class TimeseriesBucket(BaseModel):
    bucket_start: datetime
    total: int
    by_species: Dict[str, int]
