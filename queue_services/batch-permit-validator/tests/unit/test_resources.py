"""HTTP tests for batch-permit-validator resources (same layout as strr-pay ``test_resources``)."""

from http import HTTPStatus
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest
from simple_cloudevent import SimpleCloudEvent

import batch_permit_validator.resources.batch_permit_validator as bpvm_module


def test_empty_post(client):
    """Quick test of an empty post, just pop off the Queue (strr-pay pattern)."""
    res = client.post("/")
    assert res.status_code == HTTPStatus.OK
    assert res.get_json() == {}


@pytest.mark.parametrize(
    "payload",
    [
        {"message": {"attributes": {}}},
        {"message": {"attributes": {"objectId": ""}}},
    ],
)
def test_worker_invalid_file_name(client, payload):
    """Missing or empty objectId returns 400."""
    response = client.post("/", json=payload)
    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.get_json() == {"error": "Invalid File Name"}


def test_worker_triggers_cloud_run_job(client):
    """Valid objectId triggers Cloud Run Jobs run_job with configured parent and file arg."""
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
    call_kw = mock_jobs_client.run_job.call_args.kwargs
    job_request = call_kw["request"]
    assert job_request.name == (
        "projects/test-project/locations/us-central1/jobs/batch-permit-validator-job"
    )
    assert job_request.overrides.container_overrides[0].args == [
        "bulk-validation/requests/file.json",
    ]
    assert job_request.overrides.timeout.seconds == 45 * 60
    assert job_request.overrides.task_count == 1


def test_send_bulk_validation_response_no_body(client):
    """Empty body returns 200 without calling downstream services."""
    response = client.post("/bulk-validation-response")
    assert response.status_code == HTTPStatus.OK


def test_send_bulk_validation_response_no_cloud_event(client):
    """When gcp_queue cannot parse a cloud event, handler returns 200."""
    with patch(
        "batch_permit_validator.resources.batch_permit_validator.gcp_queue.get_simple_cloud_event",
        return_value=None,
    ):
        response = client.post("/bulk-validation-response", data=b"{}")
    assert response.status_code == HTTPStatus.OK


def test_send_bulk_validation_response_posts_callback(client, mocker):
    """Successful callback POST returns 200."""
    ce = SimpleCloudEvent(
        id="1",
        source="test",
        subject="subj",
        type="strr.batchPermitValidationResult",
        data={
            "callBackUrl": "https://callback.example/hook",
            "preSignedUrl": "https://storage.example/out.json",
        },
    )
    mock_post = mocker.patch(
        "batch_permit_validator.resources.batch_permit_validator.requests.post",
        return_value=MagicMock(status_code=200),
    )
    with patch(
        "batch_permit_validator.resources.batch_permit_validator.gcp_queue.get_simple_cloud_event",
        return_value=ce,
    ):
        response = client.post("/bulk-validation-response", data=b"{}")
    assert response.status_code == HTTPStatus.OK
    mock_post.assert_called_once_with(
        "https://callback.example/hook",
        data={"fileUrl": "https://storage.example/out.json"},
        timeout=10,
    )


def test_send_bulk_validation_response_callback_non_200(client, mocker):
    """Non-200 from callback URL yields 500."""
    ce = SimpleCloudEvent(
        id="1",
        source="test",
        subject="subj",
        type="strr.batchPermitValidationResult",
        data={
            "callBackUrl": "https://callback.example/hook",
            "preSignedUrl": "https://storage.example/out.json",
        },
    )
    mocker.patch(
        "batch_permit_validator.resources.batch_permit_validator.requests.post",
        return_value=MagicMock(status_code=500),
    )
    with patch(
        "batch_permit_validator.resources.batch_permit_validator.gcp_queue.get_simple_cloud_event",
        return_value=ce,
    ):
        response = client.post("/bulk-validation-response", data=b"{}")
    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR


def test_send_bulk_validation_response_no_validation_payload_when_wrong_event_type(client):
    """Parsed cloud event but wrong type yields no validation response → 200 empty."""
    ce = SimpleCloudEvent(
        id="1",
        source="test",
        subject="subj",
        type="strr.someOtherType",
        data={"callBackUrl": "https://cb", "preSignedUrl": "https://file"},
    )
    with patch(
        "batch_permit_validator.resources.batch_permit_validator.gcp_queue.get_simple_cloud_event",
        return_value=ce,
    ):
        response = client.post("/bulk-validation-response", data=b"{}")
    assert response.status_code == HTTPStatus.OK


def test_send_bulk_validation_response_propagates_when_post_raises(client, mocker):
    """Callback POST failure re-raises after logging."""
    ce = SimpleCloudEvent(
        id="1",
        source="test",
        subject="subj",
        type="strr.batchPermitValidationResult",
        data={
            "callBackUrl": "https://callback.example/hook",
            "preSignedUrl": "https://storage.example/out.json",
        },
    )
    mocker.patch(
        "batch_permit_validator.resources.batch_permit_validator.requests.post",
        side_effect=RuntimeError("network down"),
    )
    with patch(
        "batch_permit_validator.resources.batch_permit_validator.gcp_queue.get_simple_cloud_event",
        return_value=ce,
    ):
        with pytest.raises(RuntimeError, match="network down"):
            client.post("/bulk-validation-response", data=b"{}")


def test_worker_propagates_when_run_job_raises(client):
    """Cloud Run client failure re-raises after logging."""
    payload = {
        "message": {
            "attributes": {
                "objectId": "bulk-validation/requests/file.json",
            }
        }
    }
    mock_jobs_client = MagicMock()
    mock_jobs_client.run_job.side_effect = RuntimeError("run_job failed")
    with patch(
        "batch_permit_validator.resources.batch_permit_validator.run_v2.JobsClient",
        return_value=mock_jobs_client,
    ):
        with pytest.raises(RuntimeError, match="run_job failed"):
            client.post("/", json=payload)


def test_test_response_endpoint_logs_json(client):
    """Smoke test for /test-response happy path."""
    response = client.post("/test-response", json={"hello": "world"})
    assert response.status_code == HTTPStatus.OK


def test_test_response_logs_error_when_get_json_raises(client):
    """Exception in /test-response is logged; bare except leaves no return (Flask 3 → TypeError)."""
    mock_request = MagicMock()
    mock_request.get_json.side_effect = ValueError("bad json")
    with patch.object(bpvm_module, "request", mock_request):
        with pytest.raises(TypeError, match="did not return a valid response"):
            client.post("/test-response")
