import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Global singleton to hold the pooled engine
_engine = None


def _build_database_url_from_env() -> str:
    """Build DB URL using the shared DATABASE_* env contract used by other jobs."""
    db_user = os.getenv("DATABASE_USERNAME", "")
    db_password = os.getenv("DATABASE_PASSWORD", "")
    db_name = os.getenv("DATABASE_NAME", "")
    db_host = os.getenv("DATABASE_HOST", "")
    db_port = int(os.getenv("DATABASE_PORT", "5432"))
    db_unix_socket = os.getenv("DATABASE_UNIX_SOCKET", "")

    if db_unix_socket:
        return (
            f"postgresql+pg8000://{db_user}:{db_password}@/{db_name}"
            f"?unix_sock={db_unix_socket}/.s.PGSQL.5432"
        )

    if db_user and db_name and db_host:
        return (
            f"postgresql+pg8000://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
        )

    return ""


def get_engine():
    """Lazily initialize the pooled engine with recycling and pooling."""
    global _engine
    if _engine is not None:
        return _engine

    url = os.getenv("DATABASE_URL") or _build_database_url_from_env()

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

    if url:
        _engine = create_engine(url, **pool_params)
        return _engine

    raise ValueError("Missing database connection environment variables.")


def get_session():
    """Generator for sessions using the singleton engine pool."""
    engine = get_engine()
    # expire_on_commit=False prevents issues when accessing objects
    # after a thread has committed but before the session closes.
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    with factory() as session:
        yield session
