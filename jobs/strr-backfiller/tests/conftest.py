import pytest

from backfiller.config import TestConfig
from backfiller.job import create_app

pytest_plugins = [
    "strr_test_utils.utils_fixtures",
    "strr_test_utils.db_fixtures",
    "strr_test_utils.redis_fixtures",
    "strr_test_utils.parent_fixtures",
]


@pytest.fixture(scope="session")
def app(db_engine):
    """
    Flask app for integration tests.

    The job package is ``backfiller`` while the repo folder is ``strr-backfiller``,
    so strr_test_utils cannot discover ``create_app`` automatically; we wire it here
    (same pattern as a manually registered app in other jobs).
    """
    TestConfig.SQLALCHEMY_DATABASE_URI = str(db_engine.url)
    _app = create_app("test")
    with _app.app_context():
        yield _app
