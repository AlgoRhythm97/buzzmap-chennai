from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = ""
    frontend_origin: str = "http://localhost:5173"

    model_path: str = ""
    max_upload_mb: int = 2

    min_recording_seconds: int = 3
    max_recording_seconds: int = 10

    sample_rate: int = 16000

    # Low enough to keep non-mosquito insects (~150-250 Hz) in band so they can be rejected
    band_low_hz: int = 100
    band_high_hz: int = 1500

    # Event detector for raw waveform ingestion
    detector_baseline_ms: int = 50  # leading pre-trigger audio used to calibrate the noise floor
    detector_threshold_multiplier: float = 3.5
    detector_min_event_ms: int = 20
    detector_padding_samples: int = 64

    uncertainty_threshold: float = 0.60

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
