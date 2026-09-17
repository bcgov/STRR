"""Integration tests for database configuration and Alembic behavior."""

import runpy
from pathlib import Path

import dotenv
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from testcontainers.postgres import PostgresContainer


def test_production_config_connects_with_pg8000(monkeypatch, postgres_container):
    """The production configuration can execute a real query through pg8000."""
    database_url = make_url(postgres_container.get_connection_url())
    for env_name in (
        "CLOUD_RUN_JOB",
        "CLOUDSQL_INSTANCE_CONNECTION_NAME",
        "DATABASE_UNIX_SOCKET",
        "K_SERVICE",
    ):
        monkeypatch.delenv(env_name, raising=False)
    monkeypatch.setattr(dotenv, "load_dotenv", lambda *_args, **_kwargs: False)
    monkeypatch.setenv("DATABASE_HOST", database_url.host)
    monkeypatch.setenv("DATABASE_NAME", database_url.database)
    monkeypatch.setenv("DATABASE_PASSWORD", database_url.password)
    monkeypatch.setenv("DATABASE_PORT", str(database_url.port))
    monkeypatch.setenv("DATABASE_USERNAME", database_url.username)
    monkeypatch.setenv("DEPLOYMENT_ENV", "production")

    config_path = Path(__file__).resolve().parents[2] / "src/strr_api/config.py"
    production = runpy.run_path(str(config_path))["Production"]
    engine = create_engine(production.SQLALCHEMY_DATABASE_URI, **production.SQLALCHEMY_ENGINE_OPTIONS)

    try:
        assert engine.dialect.driver == "pg8000"
        with engine.connect() as connection:
            assert connection.execute(text("SELECT 1")).scalar_one() == 1
    finally:
        engine.dispose()


def test_alembic_runs_with_configured_owner_role(monkeypatch):
    """Alembic runs migrations with the configured DB owner role."""
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
