# backend/app/database.py

"""SQLAlchemy database setup for the Competitor Pricing Monitor.
Uses SQLite for the MVP.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Database URL – can be overridden via env var DATABASE_URL
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./competitor_monitor.db")

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def init_db():
    """Create all tables.
    Called at application start.
    """
    from . import models  # import models to register them with Base
    Base.metadata.create_all(bind=engine)
