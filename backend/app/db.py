from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import get_settings

settings = get_settings()

# SQLite needs check_same_thread=False. Postgres gets pool_pre_ping so stale
# pooled connections don't kill requests after DB restarts.
_is_sqlite = settings.DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False} if _is_sqlite else {}

engine_kwargs: dict = {"connect_args": connect_args, "echo": settings.DEBUG}
if not _is_sqlite:
    engine_kwargs.update(pool_pre_ping=True, pool_size=5, max_overflow=10)

engine = create_engine(settings.DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency for obtaining a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_port_columns():
    """Versioned startup migration for the multi-port rollout.

    `create_all` never ALTERs existing tables, so databases created before
    the `port_id` columns existed need an explicit migration. Safe to run on
    every startup (idempotent): adds the column, backfills 'voc', adds index.
    """
    from sqlalchemy import text

    targets = (("trucks", "port_id"), ("slots", "port_id"))
    with engine.begin() as conn:
        if _is_sqlite:
            for table, column in targets:
                cols = [row[1] for row in conn.exec_driver_sql(f"PRAGMA table_info({table})").fetchall()]
                if column not in cols:
                    conn.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN {column} VARCHAR(32) DEFAULT 'voc'")
                conn.exec_driver_sql(f"UPDATE {table} SET {column}='voc' WHERE {column} IS NULL")
                conn.exec_driver_sql(
                    f"CREATE INDEX IF NOT EXISTS ix_{table}_{column} ON {table} ({column})"
                )
        else:
            for table, column in targets:
                conn.execute(text(
                    f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} VARCHAR(32) DEFAULT 'voc'"
                ))
                conn.execute(text(f"UPDATE {table} SET {column}='voc' WHERE {column} IS NULL"))
                conn.execute(text(
                    f"CREATE INDEX IF NOT EXISTS ix_{table}_{column} ON {table} ({column})"
                ))
