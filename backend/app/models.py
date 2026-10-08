from sqlalchemy import Column, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from .database import Base

class SensorNode(Base):
    """
    A physical (or simulated) optical sensing tunnel deployed at a fixed location.
    """
    __tablename__ = "sensor_nodes"

    # Human-readable identifier flashed onto the device, e.g. "CHN-ADYAR-01"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    locality = Column(String, nullable=True, index=True)

    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_seen_at = Column(DateTime, nullable=True)

    detections = relationship("DetectionEvent", back_populates="node")

class DetectionEvent(Base):
    __tablename__ = "detections"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    # Reporting node; nullable so ad-hoc uploads without a registered node still work
    node_id = Column(String, ForeignKey("sensor_nodes.id"), nullable=True, index=True)
    node = relationship("SensorNode", back_populates="detections")

    # Location (e.g. coordinates of the sensing node)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    # DSP Features
    rms = Column(Float, nullable=False)
    dominant_freq_hz = Column(Float, nullable=False)
    peak_magnitude = Column(Float, nullable=False)
    peak_to_peak = Column(Float, nullable=True)
    harmonic_ratio = Column(Float, nullable=True)
    spectral_energy = Column(Float, nullable=True)

    # ML Classification Results
    # Defaults to UNKNOWN for the open-set rejection architecture
    species_class = Column(String, default="UNKNOWN", index=True)
    confidence = Column(Float, nullable=True)
