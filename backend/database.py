from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
import os

# DATABASE_URL should be set by dotenv in main.py before this is imported
# Default uses localhost (not 'db' which is for Docker)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://xtyl:xtylpassword@localhost:5432/xtyl_db")

# Configure engine with connection pool settings for remote database (Supabase)
# These settings help prevent "connection closed unexpectedly" errors
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=5,  # Number of connections to keep in pool
    max_overflow=10,  # Additional connections allowed beyond pool_size
    pool_timeout=30,  # Seconds to wait for a connection
    pool_recycle=1800,  # Recycle connections after 30 minutes (important for Supabase)
    pool_pre_ping=True,  # Test connections before using them (prevents stale connection errors)
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
