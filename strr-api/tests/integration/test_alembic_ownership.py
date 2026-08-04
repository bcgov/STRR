"""Integration tests for standalone Alembic migration behavior."""

from pathlib import Path

import docker
import pytest
from alembic import command
from alembic.config import Config
from docker.errors import DockerException
from sqlalchemy import create_engine, text
from testcontainers.postgres import PostgresContainer


def _require_docker():
    try:
        client = docker.from_env()
        client.ping()
    except DockerException as exc:
        pytest.skip(f"Docker is required for this integration test: {exc}")
    finally:
        if "client" in locals():
            client.close()


def test_alembic_runs_with_configured_owner_role(monkeypatch):
    """Alembic runs migrations with the configured DB owner role."""
    _require_docker()

    api_root = Path(__file__).resolve().parents[2]
    migrations_path = api_root / "migrations"
    owner = "strr"

    with PostgresContainer("postgres:16-alpine") as postgres:
        db_url = postgres.get_connection_url()
        monkeypatch.setenv("DATABASE_URL", db_url)
        monkeypatch.setenv("DATABASE_OWNER_ROLE", owner)

        engine = create_engine(db_url)
        with engine.begin() as conn:
            quoted_owner = conn.dialect.identifier_preparer.quote(owner)
            conn.execute(text(f"CREATE ROLE {quoted_owner} LOGIN"))
            conn.execute(text(f"GRANT USAGE, CREATE ON SCHEMA public TO {quoted_owner}"))

        cfg = Config(str(migrations_path / "alembic.ini"))
        cfg.set_main_option("script_location", str(migrations_path))
        cfg.set_main_option("sqlalchemy.url", db_url)
        command.upgrade(cfg, "head")

        with engine.connect() as conn:
            class_mismatches = conn.execute(
                text(
                    """
                    SELECT c.relkind, n.nspname, c.relname, pg_get_userbyid(c.relowner) AS owner
                    FROM pg_class c
                    JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = 'public'
                      AND c.relkind IN ('r', 'p', 'S', 'v', 'm', 'f')
                      AND pg_get_userbyid(c.relowner) != :owner
                    ORDER BY c.relkind, c.relname
                    """
                ),
                {"owner": owner},
            ).fetchall()
            type_mismatches = conn.execute(
                text(
                    """
                    SELECT n.nspname, t.typname, pg_get_userbyid(t.typowner) AS owner
                    FROM pg_type t
                    JOIN pg_namespace n ON n.oid = t.typnamespace
                    WHERE n.nspname = 'public'
                      AND t.typtype IN ('d', 'e')
                      AND pg_get_userbyid(t.typowner) != :owner
                    ORDER BY t.typname
                    """
                ),
                {"owner": owner},
            ).fetchall()
            current_role = conn.execute(text("SELECT current_user")).scalar_one()

        assert class_mismatches == []
        assert type_mismatches == []
        assert current_role != owner
