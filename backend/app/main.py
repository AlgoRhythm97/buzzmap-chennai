from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import engine, Base
from .routes import detections, ingest, nodes, stats

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="BuzzMap Chennai",
    version="0.1.0"
)

# localhost and 127.0.0.1 are different origins to the browser; accept both spellings
frontend_origins = {
    settings.frontend_origin,
    settings.frontend_origin.replace("localhost", "127.0.0.1"),
    settings.frontend_origin.replace("127.0.0.1", "localhost"),
}

app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(frontend_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(nodes.router)
app.include_router(detections.router)
app.include_router(ingest.router)
app.include_router(stats.router)

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "buzzmap-chennai",
        "version": "0.1.0"
    }
