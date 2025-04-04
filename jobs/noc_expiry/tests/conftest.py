"""Test fixtures for NOC expiry job tests."""

import pytest

from noc_expiry.job import create_app


@pytest.fixture(scope="session")
def app():
    """Return a session-wide application."""
    _app = create_app()

    return _app
