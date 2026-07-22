import os

from cloud_sql_connector import DBConfig
from cloud_sql_connector import getconn
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Global singleton to hold the pooled engine
_engine = None

CLOUDSQL_REQUIRED_ENVS = (
    "CLOUDSQL_INSTANCE_CONNECTION_NAME",
    "DATABASE_NAME",
    "DATABASE_USERNAME",
)


def _require_cloudsql_env():
    missing = [
        env_name for env_name in CLOUDSQL_REQUIRED_ENVS if not os.getenv(env_name)
    ]
    if missing:
        raise ValueError(
            f"Missing Cloud SQL IAM connection environment variables: {', '.join(missing)}"
        )


def _cloudsql_ip_type() -> str:
    ip_type_name = os.getenv("CLOUDSQL_IP_TYPE", "PUBLIC").upper()
    if ip_type_name not in ("PUBLIC", "PRIVATE"):
        raise ValueError("CLOUDSQL_IP_TYPE must be PUBLIC or PRIVATE")
    return ip_type_name


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

    _require_cloudsql_env()
    config = DBConfig(
        instance_name=os.environ["CLOUDSQL_INSTANCE_CONNECTION_NAME"],
        database=os.environ["DATABASE_NAME"],
        user=os.environ["DATABASE_USERNAME"],
        ip_type=_cloudsql_ip_type(),
        schema="",
    )

    # Apply pooling params to the creator-based engine
    _engine = create_engine(
        "postgresql+pg8000://", creator=lambda: getconn(config), **pool_params
    )
    return _engine


def get_session():
    """Generator for sessions using the singleton engine pool."""
    engine = get_engine()
    # expire_on_commit=False prevents issues when accessing objects
    # after a thread has committed but before the session closes.
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    with factory() as session:
        yield session
