"""Test fixtures for NOC expiry job tests."""

import pytest

from noc_expiry.job import create_app
from noc_expiry.config import UnitTestConfig


@pytest.fixture(scope="session")
def app():
    """Return a session-wide application."""
    _app = create_app(UnitTestConfig)

    return _app
