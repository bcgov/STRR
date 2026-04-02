"""HTTP integration tests for the batch-permit-validator listener.

Exercise Flask + real ``GcpQueue.get_simple_cloud_event`` (wrapped Pub/Sub envelope) for
``/bulk-validation-response``. Unit tests in ``tests/unit/test_resources.py`` patch
``gcp_queue.get_simple_cloud_event``; these do not.
"""

import base64
from http import HTTPStatus
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest
from simple_cloudevent import SimpleCloudEvent
from simple_cloudevent import to_queue_message


def _pubsub_push_envelope(ce: SimpleCloudEvent) -> dict:
    """Build a Pub/Sub push body like GCP sends (see strr-email integration tests)."""
    return {
        "subscription": "projects/test-project/subscriptions/test-sub",
        "message": {
            "data": base64.b64encode(to_queue_message(ce)).decode("UTF-8"),
            "messageId": "10",
            "attributes": {},
        },
        "id": 1,
    }


@pytest.mark.integration
def test_worker_post_triggers_cloud_run_with_minimal_mocks(client):
    """POST / with objectId triggers Cloud Run; only external JobsClient is mocked."""
    mock_jobs_client = MagicMock()
    payload = {
        "message": {
            "attributes": {
                "objectId": "bulk-validation/requests/file.json",
            }
        }
    }
    with patch(
        "batch_permit_validator.resources.batch_permit_validator.run_v2.JobsClient",
        return_value=mock_jobs_client,
    ):
        response = client.post("/", json=payload)

    assert response.status_code == HTTPStatus.OK
    mock_jobs_client.run_job.assert_called_once()


@pytest.mark.integration
def test_bulk_validation_response_parses_pubsub_envelope_and_callbacks(client, mocker):
    """Real wrapped envelope parsing + outbound callback; only requests.post is mocked."""
    ce = SimpleCloudEvent(
        id="1",
        source="integration-test",
        subject="subj",
        type="strr.batchPermitValidationResult",
        data={
            "callBackUrl": "https://callback.example/hook",
            "preSignedUrl": "https://storage.example/out.json",
        },
    )
    envelope = _pubsub_push_envelope(ce)
    mock_post = mocker.patch(
        "batch_permit_validator.resources.batch_permit_validator.requests.post",
        return_value=MagicMock(status_code=200),
    )

    response = client.post("/bulk-validation-response", json=envelope)

    assert response.status_code == HTTPStatus.OK
    mock_post.assert_called_once_with(
        "https://callback.example/hook",
        data={"fileUrl": "https://storage.example/out.json"},
        timeout=10,
    )
