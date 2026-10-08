from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = ""
    frontend_origin: str = "http://localhost:5173"

    model_path: str = ""
    max_upload_mb: int = 2

    min_recording_seconds: int = 3
    max_recording_seconds: int = 10

    sample_rate: int = 16000

    band_low_hz: int = 200
    band_high_hz: int = 1500

    uncertainty_threshold: float = 0.60

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
