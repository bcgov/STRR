"""Pytest configuration and shared fixtures for renewal-reminders."""

import pytest

from renewal_reminders import create_app
from renewal_reminders.config import TestConfig

pytest_plugins = [
    "strr_test_utils.utils_fixtures",
    "strr_test_utils.db_fixtures",
    "strr_test_utils.redis_fixtures",
]


@pytest.fixture(scope="session")
def app(db_engine):
    """
    Flask app for integration tests.

    Wire ``create_app`` so strr_test_utils can run integration tests against this app.
    """
    TestConfig.SQLALCHEMY_DATABASE_URI = str(db_engine.url)
    _app = create_app("test")
    with _app.app_context():
        yield _app
