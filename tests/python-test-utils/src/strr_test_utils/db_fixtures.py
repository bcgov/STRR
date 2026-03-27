import importlib
import os
import sys
from pathlib import Path
from typing import Optional

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
from testcontainers.postgres import PostgresContainer


def find_repo_root(start_path: Path) -> Optional[Path]:
    """Recursively finds the repository root by looking for the 'jobs' directory."""
    for parent in start_path.parents:
        if (parent / ".git").exists():
            return parent
    return None


@pytest.fixture(scope="session")
def package_info(request):
    """Discovers the package name of the job currently being tested."""
    root_path = Path(request.config.rootpath)
    return {"package": root_path.name.replace("-", "_"), "root_path": root_path}


@pytest.fixture(scope="session")
def app_modules(package_info):
    """
    Dynamically imports the core modules.
    Returns None values if it doesn't follow the Connect Python App pattern.
    """
    pkg = package_info["package"]
    modules = {"config": None, "models": None}

    try:
        modules["config"] = importlib.import_module(f"{pkg}.config")
    except ImportError:
        pass

    try:
        modules["models"] = importlib.import_module(f"{pkg}.models")
    except ImportError:
        pass

    return modules


@pytest.fixture(scope="session")
def postgres_container(request):
    """
    Starts a Postgres Container.
    Only starts the Docker container if a test in the current run
    actually has 'session', 'db', or 'app' in its arguments.
    """
    needed_by_test = False
    db_fixtures = {"session", "app", "setup_database", "postgres_container"}
    for item in request.session.items:
        # Check if the test or any of its fixtures depend on our DB fixtures
        if any(fixture in item.fixturenames for fixture in db_fixtures):
            needed_by_test = True
            break
    # postgres container not needed, so don't start it.
    if not needed_by_test:
        return None

    with PostgresContainer("postgres:16-alpine") as postgres:
        os.environ["DATABASE_URL"] = postgres.get_connection_url()
        yield postgres


@pytest.fixture(scope="session")
def setup_database(postgres_container, request):
    """
    Uses Alembic to migrate the test database.
    Does NOT require a Flask app to be instantiated.
    """
    repo_root = find_repo_root(Path(request.config.rootpath))
    if not repo_root:
        pytest.fail("Could not find repo root to locate migrations.")

    # Path to strr-api where the migrations live
    api_root = repo_root / "strr-api"
    migrations_path = api_root / "migrations"
    ini_path = migrations_path / "alembic.ini"

    if not ini_path.exists():
        pytest.fail(f"Alembic config not found at {ini_path}")

    # Ensure strr-api is in sys.path so migrations can import models
    if str(api_root) not in sys.path:
        sys.path.insert(0, str(api_root))

    db_url = postgres_container.get_connection_url()

    # Configure Alembic programmatically
    alembic_cfg = Config(str(ini_path))
    alembic_cfg.set_main_option("script_location", str(migrations_path))
    alembic_cfg.set_main_option("sqlalchemy.url", db_url)

    # Run Migrations to 'head'
    command.upgrade(alembic_cfg, "head")
    yield db_url


@pytest.fixture(scope="session")
def db_engine(setup_database):
    """Returns a SQLAlchemy engine connected to the migrated database."""
    engine = create_engine(setup_database)
    return engine


@pytest.fixture(scope="session")
def app(db_engine, package_info):
    """
    Optional Flask app fixture.
    If the job has a create_app, it instantiates it using the test DB.
    """
    pkg = package_info["package"]
    try:
        cfg_mod = importlib.import_module(f"{pkg}.config")
        app_mod = importlib.import_module(f"{pkg}")

        if hasattr(app_mod, "create_app"):
            TestConfig = getattr(cfg_mod, "TestConfig")
            # Update the config with our container URL
            TestConfig.SQLALCHEMY_DATABASE_URI = str(db_engine.url)

            # _app = job_mod.create_app(TestConfig)
            _app = app_mod.create_app(TestConfig)
            with _app.app_context():
                yield _app
            return
    except ImportError:
        pass

    yield None


@pytest.fixture(scope="function")
def session(db_engine, app, app_modules):
    """
    Transactional session fixture.
    Supports both Flask-SQLAlchemy (if app exists) and raw SQLAlchemy.
    """
    connection = db_engine.connect()
    transaction = connection.begin()

    db = None
    if app and hasattr(app, "extensions") and "sqlalchemy" in app.extensions:
        db = app.extensions["sqlalchemy"]

    elif app_modules.get("models") and hasattr(app_modules["models"], "db"):
        db = getattr(app_modules["models"], "db")

    if db:
        session_factory = sessionmaker(bind=connection)
        test_session = scoped_session(session_factory)

        old_session = db.session
        db.session = test_session

        yield test_session

        db.session = old_session
        test_session.remove()
    else:
        # For 'Lite' jobs using raw SQLAlchemy
        SessionLocal = sessionmaker(bind=connection)
        session = SessionLocal()
        yield session
        session.close()

    transaction.rollback()
    connection.close()
