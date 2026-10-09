"""This set of fixtures relies heavily on code by convention for its configuration."""

import importlib
import os
from pathlib import Path

from flask_migrate import upgrade
from ldclient.integrations.test_data import TestData
import pytest
from sqlalchemy.orm import Session as AppSession
from testcontainers.postgres import PostgresContainer

# Discover the package name dynamically
# Assuming: /repo/jobs/package_name/tests/fixtures/db_fixtures.py
THIS_FILE = Path(__file__).resolve()
PACKAGE_ROOT = THIS_FILE.parents[2]
REPO_ROOT = PACKAGE_ROOT.parents[1]
PACKAGE_NAME = PACKAGE_ROOT.name.replace("-", "_")

try:
    job_module = importlib.import_module(f"{PACKAGE_NAME}.job")
    create_app = getattr(job_module, "create_app")
    _db = getattr(job_module, "db")

    config_module = importlib.import_module(f"{PACKAGE_NAME}.config")
    Testing = getattr(config_module, "TestConfig")

except ImportError as e:
    pytest.exit(
        f"Failed to dynamically load {PACKAGE_NAME}.job. Ensure tests are run from the package root."
    )


@pytest.fixture(scope="session")
def ld():
    td = TestData.data_source()
    yield td


@pytest.fixture(scope="session")
def postgres_container():
    with PostgresContainer("postgres:16-alpine") as postgres:
        yield postgres


@pytest.fixture(scope="session")
def app(ld, postgres_container):
    db_url = postgres_container.get_connection_url()
    Testing.SQLALCHEMY_DATABASE_URI = db_url
    Testing.POD_NAMESPACE = "Testing"
    _app = create_app(Testing, **{"ld_test_data": ld})
    with _app.app_context():
        yield _app


@pytest.fixture(scope="session")
def setup_database(app):
    default_path = REPO_ROOT / "strr-api" / "migrations"
    directory = os.getenv("MIGRATION_DIRECTORY", str(default_path))
    upgrade(directory=directory)
    yield


@pytest.fixture(scope="function")
def session(app, setup_database):
    connection = _db.engine.connect()
    transaction = connection.begin()
    session = AppSession(bind=connection, join_transaction_mode="create_savepoint")

    class TestScopedSession:
        def __call__(self):
            return session

        def __getattr__(self, name):
            return getattr(session, name)

        def remove(self):
            session.close()

    original_session_lookup = _db.session
    _db.session = TestScopedSession()
    yield session
    _db.session = original_session_lookup
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="session")
def client(app):  # pylint: disable=redefined-outer-name
    """Return a session-wide Flask test client."""
    return app.test_client()


@pytest.fixture(scope="session")
def client_ctx(app):  # pylint: disable=redefined-outer-name
    """Return session-wide Flask test client."""
    with app.test_client() as _client:
        yield _client
