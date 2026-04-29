import pytest
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from interactions_update import database


def test_get_engine_singleton(monkeypatch, postgres_container):
    """
    Verify that multiple calls return the exact same engine object.
    Uses the real Postgres container to support pool arguments.
    """
    # Use the real container URL
    url = postgres_container.get_connection_url()
    monkeypatch.setenv("DATABASE_URL", url)

    engine1 = database.get_engine()
    engine2 = database.get_engine()

    assert engine1 is engine2
    assert isinstance(engine1, Engine)
    # Verify it's actually using the Postgres dialect
    assert engine1.dialect.name == "postgresql"


def test_get_engine_pool_sizing(monkeypatch, postgres_container):
    """Verify that pool size respects the MAX_WORKERS environment variable."""
    url = postgres_container.get_connection_url()
    monkeypatch.setenv("DATABASE_URL", url)
    monkeypatch.setenv("MAX_WORKERS", "15")

    engine = database.get_engine()

    # In Postgres, the pool is a QueuePool
    assert engine.pool.size() == 15
    assert engine.pool._max_overflow == 5
    assert engine.pool._recycle == 3600


def test_get_session_yields_session(monkeypatch, postgres_container):
    """Verify the generator correctly yields a usable SQLAlchemy Session."""
    url = postgres_container.get_connection_url()
    monkeypatch.setenv("DATABASE_URL", url)

    session_gen = database.get_session()
    session = next(session_gen)

    assert isinstance(session, Session)
    assert session.is_active

    # Clean up
    session.close()


def test_cloud_sql_missing_vars_raises_error(monkeypatch):
    """Verify that falling back to Cloud SQL without vars raises ValueError."""
    # Ensure DATABASE_URL is NOT set to trigger the fallback branch
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("INSTANCE_CONNECTION_NAME", raising=False)

    with pytest.raises(
        ValueError, match="Missing Cloud SQL connection environment variables"
    ):
        database.get_engine()


def test_session_expire_on_commit_config(monkeypatch, postgres_container):
    """Verify sessions are created with expire_on_commit=False for thread safety."""
    # Use real Postgres URL to satisfy get_engine's pool_params
    url = postgres_container.get_connection_url()
    monkeypatch.setenv("DATABASE_URL", url)

    session_gen = database.get_session()
    session = next(session_gen)

    # This setting ensures that once a thread commits,
    # the object data stays in memory for other threads/logic to read.
    assert session.expire_on_commit is False

    session.close()
