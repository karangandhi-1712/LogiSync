import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .config import settings
from .models import Base

# If DATABASE_URL is set in environment, use it, else default to instant SQLite
env_db_url = os.environ.get("DATABASE_URL")

if env_db_url and "postgresql" in env_db_url:
    try:
        engine = create_engine(env_db_url, pool_pre_ping=True)
    except Exception:
        sqlite_path = os.path.join(os.path.dirname(__file__), "mmlp.db")
        engine = create_engine(f"sqlite:///{sqlite_path}", connect_args={"check_same_thread": False})
else:
    sqlite_path = os.path.join(os.path.dirname(__file__), "mmlp.db")
    engine = create_engine(f"sqlite:///{sqlite_path}", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create tables if needed. Safe to call repeatedly."""
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"init_db notice: {e}")
