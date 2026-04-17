import os
import sys
import time

import pytest
from alembic import command
from alembic.config import Config
from testcontainers.postgres import PostgresContainer

# Force environment before any imports
# This is a known issue for testcontainers.
os.environ["TESTCONTAINERS_RYUK_DISABLED"] = "true"

pytest_plugins = ["strr_test_utils.utils_fixtures"]


@pytest.fixture(scope="session")
def postgres_container():
    """Spins up a Postgres container with retries for Docker timing issues."""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            # Note: Removed 'with' to yield the object and keep container alive for session
            postgres = PostgresContainer("postgres:16-alpine").start()
            yield postgres
            postgres.stop()
            return
        except Exception as e:
            if attempt == max_retries - 1:
                raise e
            print(f"\n⚠️ Docker timing issue (Attempt {attempt + 1}). Retrying...")
            time.sleep(2)


@pytest.fixture(scope="session")
def db_engine(postgres_container):
    """
    Sets up the database, runs migrations, and returns the engine.
    This triggers the 'standalone' logic in your new env.py.
    """
    # Use the connection URL from the container
    url = postgres_container.get_connection_url()
    os.environ["DATABASE_URL"] = url

    # Path Mapping: Ensure the Job can find the models and migrations
    # Adjust these paths based on your monorepo structure
    job_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    api_root = os.path.abspath(os.path.join(job_root, "../../strr-api"))

    # Add API root to sys.path so env.py can 'from strr_api.models... import SimpleBaseModel'
    if api_root not in sys.path:
        sys.path.insert(0, api_root)

    # Configure Alembic programmatically
    ini_path = os.path.join(api_root, "migrations/alembic.ini")
    alembic_cfg = Config(ini_path)

    # Point Alembic to the migrations folder in the flask app directory
    alembic_cfg.set_main_option("script_location", os.path.join(api_root, "migrations"))
    alembic_cfg.set_main_option("sqlalchemy.url", url)

    # Run Migrations
    # This triggers the 'except' block in your env.py
    command.upgrade(alembic_cfg, "head")

    from interactions_update.database import get_engine

    return get_engine()


@pytest.fixture(scope="function")
def db_session(db_engine):
    """Provides a fresh session for every test with automatic rollback."""
    from sqlalchemy.orm import sessionmaker

    Session = sessionmaker(bind=db_engine)
    session = Session()

    yield session

    session.rollback()
    session.close()
