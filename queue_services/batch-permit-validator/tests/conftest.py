import pytest

from batch_permit_validator import create_app
from batch_permit_validator.config import UnitTestConfig

# Only ``client_fixtures`` is required: tests use ``client`` (and ``mocker`` from pytest-mock).
# strr-pay loads db/utils/redis for services that use those fixtures; this listener does not.
pytest_plugins = [
    "strr_test_utils.client_fixtures",
]


@pytest.fixture
def app():
    """Flask app for tests: ``UnitTestConfig`` plus GCP Cloud Run settings for resource tests."""
    application = create_app(environment=UnitTestConfig)
    application.config.update(
        GCP_PROJECT_ID="test-project",
        GCP_CLOUD_RUN_JOB_LOCATION="us-central1",
        GCP_CLOUD_RUN_JOB_NAME="batch-permit-validator-job",
    )
    yield application
