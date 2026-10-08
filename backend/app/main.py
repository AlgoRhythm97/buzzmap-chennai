from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import engine, Base
from .routes import detections, ingest, nodes

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="BuzzMap Chennai",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(nodes.router)
app.include_router(detections.router)
app.include_router(ingest.router)

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "buzzmap-chennai",
        "version": "0.1.0"
    }
