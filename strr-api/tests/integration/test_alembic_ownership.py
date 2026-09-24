"""Integration tests for database configuration and Alembic behavior."""

import runpy
from contextlib import nullcontext
from pathlib import Path

import dotenv
import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from testcontainers.postgres import PostgresContainer


def local_config(monkeypatch, database_url, environment):
    """Load the actual application config against an isolated local database."""
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
    monkeypatch.setenv("DEPLOYMENT_ENV", environment)

    config_path = Path(__file__).resolve().parents[2] / "src/strr_api/config.py"
    return runpy.run_path(str(config_path))["Migration" if environment == "migration" else "Production"]


def test_production_config_connects_with_pg8000(monkeypatch, postgres_container):
    """The production configuration can execute a real query through pg8000."""
    database_url = make_url(postgres_container.get_connection_url())
    production = local_config(monkeypatch, database_url, "production")
    engine = create_engine(production.SQLALCHEMY_DATABASE_URI, **production.SQLALCHEMY_ENGINE_OPTIONS)

    try:
        assert engine.dialect.driver == "pg8000"
        with engine.connect() as connection:
            assert connection.execute(text("SELECT 1")).scalar_one() == 1
    finally:
        engine.dispose()


@pytest.mark.parametrize("migration_mode", ("standalone", "flask"))
def test_alembic_runs_with_configured_owner_role(monkeypatch, migration_mode):
    """A non-superuser migrates through pg8000 using the configured owner role."""
    from strr_api import create_app, db

    api_root = Path(__file__).resolve().parents[2]
    migrations_path = api_root / "migrations"
    owner = "strr"

    with PostgresContainer("postgres:16-alpine") as postgres:
        admin_url = postgres.get_connection_url()
        database_url = make_url(admin_url).set(
            drivername="postgresql+pg8000", username="strr_migrator", password="local:migration@pass"
        )
        db_url = database_url.render_as_string(hide_password=False)
        monkeypatch.setenv("DATABASE_URL", db_url)
        monkeypatch.setenv("DATABASE_OWNER_ROLE", owner)

        admin_engine = create_engine(admin_url)
        with admin_engine.begin() as conn:
            quoted_owner = conn.dialect.identifier_preparer.quote(owner)
            conn.execute(text(f"CREATE ROLE {quoted_owner} NOLOGIN"))
            conn.execute(text("CREATE ROLE strr_migrator LOGIN NOINHERIT NOSUPERUSER PASSWORD 'local:migration@pass'"))
            conn.execute(text(f"GRANT {quoted_owner} TO strr_migrator"))
            conn.execute(text(f"GRANT USAGE, CREATE ON SCHEMA public TO {quoted_owner}"))
        admin_engine.dispose()

        cfg = Config(str(migrations_path / "alembic.ini"))
        cfg.set_main_option("script_location", str(migrations_path))
        cfg.set_main_option("sqlalchemy.url", db_url.replace("%", "%%"))
        app = create_app(local_config(monkeypatch, database_url, "migration")) if migration_mode == "flask" else None
        with app.app_context() if app else nullcontext():
            try:
                if app:
                    assert app.config["POD_NAMESPACE"] == "migration"
                    assert db.engine.dialect.driver == "pg8000"
                command.upgrade(cfg, "head")
            finally:
                if app:
                    db.engine.dispose()

        engine = create_engine(db_url)
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
            is_superuser = conn.execute(text("SELECT rolsuper FROM pg_roles WHERE rolname = current_user")).scalar_one()
            valid_indexes = conn.execute(
                text(
                    """
                    SELECT count(*) FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
                    WHERE i.indisvalid AND c.relname IN (
                        'ix_application_registration_id_date', 'ix_registrations_noc_status',
                        'ix_registrations_is_set_aside', 'ix_registrations_decider_id'
                    )
                    """
                )
            ).scalar_one()
        engine.dispose()

        assert class_mismatches == []
        assert type_mismatches == []
        assert current_role == "strr_migrator"
        assert is_superuser is False
        assert valid_indexes == 4


def test_failed_pg8000_migration_rolls_back(monkeypatch, tmp_path):
    """The autocommit workaround preserves rollback for ordinary migrations."""
    api_root = Path(__file__).resolve().parents[2]
    (tmp_path / "env.py").write_text((api_root / "migrations/env.py").read_text())
    (tmp_path / "versions").mkdir()
    (tmp_path / "versions/failing.py").write_text(
        "from alembic import op\n"
        "revision = 'failing'\ndown_revision = None\n"
        "def upgrade():\n"
        "    op.execute('CREATE TABLE should_rollback (id integer)')\n"
        "    raise RuntimeError('expected migration failure')\n"
    )
    monkeypatch.delenv("DATABASE_OWNER_ROLE", raising=False)
    with PostgresContainer("postgres:16-alpine") as postgres:
        database_url = make_url(postgres.get_connection_url()).set(drivername="postgresql+pg8000")
        monkeypatch.setenv("DATABASE_URL", database_url.render_as_string(hide_password=False))
        cfg = Config()
        cfg.set_main_option("script_location", str(tmp_path))
        with pytest.raises(RuntimeError, match="expected migration failure"):
            command.upgrade(cfg, "head")
        engine = create_engine(database_url)
        try:
            with engine.connect() as connection:
                assert connection.execute(text("SELECT to_regclass('public.should_rollback')")).scalar_one() is None
        finally:
            engine.dispose()
