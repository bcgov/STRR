import logging
from unittest.mock import MagicMock, patch

import pytest
from structlog.testing import capture_logs


@pytest.fixture(name="log_capture")
def fixture_log_capture():
    """
    Intercepts structlog messages and returns them as a list of dicts.
    Usage:
        def test_my_job(log_capture):
            run_job()
            assert any(log.get("event") == "Success" for log in log_capture)
    """
    with capture_logs() as caps:
        yield caps


@pytest.fixture
def caplog_info(caplog):
    """
    Automatically sets caplog to INFO level for the duration of the test.
    Useful for standard library logging.
    """
    caplog.set_level(logging.INFO)
    return caplog


@pytest.fixture
def mock_gcp_storage():
    """
    Provides a pre-configured mock for GCP Storage Service.
    Commonly used across STRR jobs for bucket operations.
    """
    with patch(
        "strr_test_utils.db_fixtures.GCPStorageService", autospec=True
    ) as mock_service:
        # Default mock behaviors
        mock_service.get_bucket.return_value = MagicMock()
        mock_service.upload_file.return_value = "mock_file_key"
        yield mock_service


@pytest.fixture
def mock_gcp_queue():
    """
    Provides a pre-configured mock for the GCP Queue Publisher.
    Ensures tests don't attempt to hit real Pub/Sub topics.
    """
    with patch(
        "strr_test_utils.db_fixtures.gcp_queue_publisher", autospec=True
    ) as mock_pub:
        yield mock_pub
