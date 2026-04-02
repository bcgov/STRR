import pytest

from batch_permit_validator import create_app
from batch_permit_validator.config import UnitTestConfig


@pytest.fixture
def app():
    """Flask app with test config and deterministic Cloud Run job settings."""
    application = create_app(environment=UnitTestConfig)
    application.config.update(
        GCP_PROJECT_ID="test-project",
        GCP_CLOUD_RUN_JOB_LOCATION="us-central1",
        GCP_CLOUD_RUN_JOB_NAME="batch-permit-validator-job",
    )
    yield application


@pytest.fixture
def client(app):
    """HTTP client for the Flask app."""
    return app.test_client()
