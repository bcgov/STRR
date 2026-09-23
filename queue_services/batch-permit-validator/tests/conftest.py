import pytest
from simple_cloudevent import SimpleCloudEvent

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


@pytest.fixture
def validation_event_valid():
    """Valid BulkValidationResponse cloud event (default scenario)."""
    return SimpleCloudEvent(
        id="1",
        source="test",
        subject="subj",
        type="strr.batchPermitValidationResult",
        data={
            "callBackUrl": "https://callback.example/hook",
            "preSignedUrl": "https://storage.example/out.json",
        },
    )


@pytest.fixture
def patch_get_simple_cloud_event(mocker):
    """Factory fixture to patch gcp_queue.get_simple_cloud_event with a given event."""

    def _patch(event):
        mocker.patch(
            "batch_permit_validator.resources.batch_permit_validator.gcp_queue.get_simple_cloud_event",
            return_value=event,
        )

    return _patch
