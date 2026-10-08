from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import settings

# Use local SQLite as default if no URL is provided in .env
DATABASE_URL = settings.database_url or "sqlite:///./buzzmap.db"

# SQLite requires check_same_thread=False for FastAPI
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """
    Dependency generator to yield database sessions.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
