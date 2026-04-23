import pytest

from noc_expiry.config import TestConfig
from noc_expiry.job import create_app

pytest_plugins = [
    "strr_test_utils.utils_fixtures",
    "strr_test_utils.db_fixtures",
    "strr_test_utils.redis_fixtures",
]


@pytest.fixture(scope="session")
def app(db_engine):
    """
    Flask app for integration tests.

    The job package is ``noc_expiry`` while the repo folder is
    ``noc-expiry`` (job name); wire ``create_app`` here so
    strr_test_utils can run integration tests against this app.
    """
    TestConfig.SQLALCHEMY_DATABASE_URI = str(db_engine.url)
    _app = create_app("test")
    with _app.app_context():
        yield _app
