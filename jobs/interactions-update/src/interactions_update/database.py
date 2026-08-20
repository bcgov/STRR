import os

from cloud_sql_connector import sqlalchemy_settings_from_env
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Global singleton to hold the pooled engine
_engine = None


def _has_local_database_env() -> bool:
    return bool(
        os.getenv("DATABASE_UNIX_SOCKET")
        or all(
            os.getenv(env_name)
            for env_name in ("DATABASE_USERNAME", "DATABASE_NAME", "DATABASE_HOST")
        )
    )


def get_engine():
    """Lazily initialize the pooled engine with recycling and pooling."""
    global _engine
    if _engine is not None:
        return _engine

    # 1. Determine pool size based on workers (default to 10)
    workers = int(os.getenv("MAX_WORKERS", "10"))

    # Pool Configuration
    pool_params = {
        "pool_size": workers,
        "max_overflow": 5,
        "pool_pre_ping": True,  # Verifies connection is alive before use
        "pool_recycle": 3600,  # Recycle connections after 1 hour
        "pool_timeout": 30,  # Seconds to wait for a connection from the pool
    }

    url, engine_options = sqlalchemy_settings_from_env()
    if "creator" not in engine_options:
        if database_url := os.getenv("DATABASE_URL"):
            url = database_url
        elif not _has_local_database_env():
            raise ValueError("Missing database connection environment variables.")

    # Keep this job's existing pool sizing when the shared helper supplies a creator.
    engine_options = {**engine_options, **pool_params}
    _engine = create_engine(url, **engine_options)
    return _engine


def get_session():
    """Generator for sessions using the singleton engine pool."""
    engine = get_engine()
    # expire_on_commit=False prevents issues when accessing objects
    # after a thread has committed but before the session closes.
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    with factory() as session:
        yield session
