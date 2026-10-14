"""Engine / session wiring.

Schema changes are Alembic's job (see alembic/versions/). The ad-hoc
`ensure_*_columns` ALTER helpers that used to live here were removed once
`bookings`, `slots` and `trucks` went away — there is no incremental SQLite
drift left to paper over.
"""

from typing import Any, Dict

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import get_settings

settings = get_settings()

DATABASE_URL: str = settings.DATABASE_URL
_is_sqlite = DATABASE_URL.startswith("sqlite")

from sqlalchemy import event

engine_kwargs: Dict[str, Any] = {}
if _is_sqlite:
    engine_kwargs["connect_args"] = {"check_same_thread": False, "timeout": 30}
else:
    engine_kwargs.update(pool_pre_ping=True, pool_size=5, max_overflow=10)

engine = create_engine(DATABASE_URL, **engine_kwargs)

if _is_sqlite:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=30000")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency yielding a scoped session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()