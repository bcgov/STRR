"""Lightweight Flask app for unit tests (no Docker Postgres)."""

import pytest

from strr_pay import create_app
from strr_pay.config import UnitTestConfig
from strr_pay.services import gcp_queue


@pytest.fixture
def app():
    application = create_app(environment=UnitTestConfig)
    gcp_queue.init_app(application)
    return application
