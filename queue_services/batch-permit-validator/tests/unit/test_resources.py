"""HTTP tests for batch-permit-validator resources (same layout as strr-pay ``test_resources``)."""

from http import HTTPStatus
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest
import requests
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
        # Empty/missing file names
        {"message": {"attributes": {}}},
        {"message": {"attributes": {"objectId": ""}}},
        {"message": "not-a-dict"},
        {"kind": "storage#object"},
        {"name": ""},
        ["list-not-dict"],
        {},
        # Whitespace-only strings
        {"name": "   "},
        {"objectId": "   "},
        {"message": {"attributes": {"objectId": "   "}}},
        # Non-string file names (lists, dicts, ints)
        {"name": ["file.json"]},
        {"name": {"path": "file.json"}},
        {"name": 123},
    ],
)
def test_worker_invalid_file_name(client, payload):
    """Invalid, empty, whitespace-only, or non-string file names return 400 BAD_REQUEST."""
    response = client.post("/", json=payload)
    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.get_json() == {"error": "Invalid File Name"}


@pytest.mark.parametrize(
    "payload,expected_file_name",
    [
        (
            {"message": {"attributes": {"objectId": "bulk-validation/requests/file.json"}}},
            "bulk-validation/requests/file.json",
        ),
        (
            {"message": {"attributes": {"name": "bulk-validation/requests/file.json"}}},
            "bulk-validation/requests/file.json",
        ),
        (
            {
                "kind": "storage#object",
                "name": "4ddfd945-2248-4f66-ba35-570a5de7582d",
                "bucket": "strr_bulk_validation_requests_dev",
            },
            "4ddfd945-2248-4f66-ba35-570a5de7582d",
        ),
        (
            {"objectId": "4ddfd945-2248-4f66-ba35-570a5de7582d"},
            "4ddfd945-2248-4f66-ba35-570a5de7582d",
        ),
    ],
)
def test_worker_triggers_cloud_run_job(client, payload, expected_file_name):
    """Valid file name in GCS object event or Pub/Sub triggers Cloud Run Jobs run_job."""
    mock_jobs_client = MagicMock()
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
    assert job_request.overrides.container_overrides[0].args == [expected_file_name]
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


def test_send_bulk_validation_response_posts_callback(
    client, mocker, validation_event_valid, patch_get_simple_cloud_event
):
    """Successful callback POST returns 200."""
    mock_post = mocker.patch(
        "batch_permit_validator.resources.batch_permit_validator.requests.post",
        return_value=MagicMock(status_code=200),
    )
    patch_get_simple_cloud_event(validation_event_valid)
    response = client.post("/bulk-validation-response", data=b"{}")
    assert response.status_code == HTTPStatus.OK
    mock_post.assert_called_once_with(
        "https://callback.example/hook",
        data={"fileUrl": "https://storage.example/out.json"},
        timeout=10,
    )


def test_send_bulk_validation_response_callback_non_200(
    client, mocker, validation_event_valid, patch_get_simple_cloud_event
):
    """Non-200 from callback URL yields 500 with error payload."""
    mocker.patch(
        "batch_permit_validator.resources.batch_permit_validator.requests.post",
        return_value=MagicMock(status_code=500, text="Internal Server Error"),
    )
    patch_get_simple_cloud_event(validation_event_valid)
    response = client.post("/bulk-validation-response", data=b"{}")
    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    assert response.get_json() == {"error": "Callback endpoint failed with status 500"}


@pytest.mark.parametrize(
    "data",
    [
        # Empty/missing URLs
        {"callBackUrl": "", "preSignedUrl": "https://storage.example/out.json"},
        {"callBackUrl": "https://callback.example/hook", "preSignedUrl": ""},
        {"callBackUrl": None, "preSignedUrl": "https://storage.example/out.json"},
        # Non-string callback URLs
        {
            "callBackUrl": ["https://callback.example/hook"],
            "preSignedUrl": "https://storage.example/out.json",
        },
        {"callBackUrl": 123, "preSignedUrl": "https://storage.example/out.json"},
        {
            "callBackUrl": {"url": "https://callback.example/hook"},
            "preSignedUrl": "https://storage.example/out.json",
        },
        # Non-string presigned URLs
        {
            "callBackUrl": "https://callback.example/hook",
            "preSignedUrl": ["https://storage.example/out.json"],
        },
        {"callBackUrl": "https://callback.example/hook", "preSignedUrl": 456},
        {
            "callBackUrl": "https://callback.example/hook",
            "preSignedUrl": {"url": "https://storage.example/out.json"},
        },
    ],
)
def test_send_bulk_validation_response_invalid_urls(client, data):
    """Invalid, empty, or non-string callback/presigned URLs return 400 BAD_REQUEST."""
    ce = SimpleCloudEvent(
        id="1",
        source="test",
        subject="subj",
        type="strr.batchPermitValidationResult",
        data=data,
    )
    with patch(
        "batch_permit_validator.resources.batch_permit_validator.gcp_queue.get_simple_cloud_event",
        return_value=ce,
    ):
        response = client.post("/bulk-validation-response", data=b"{}")
    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.get_json() == {"error": "Missing required callback URL or presigned URL"}


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


def test_send_bulk_validation_response_timeout(
    client, mocker, validation_event_valid, patch_get_simple_cloud_event
):
    """Timeout from requests.post yields 504 GATEWAY_TIMEOUT."""
    mocker.patch(
        "batch_permit_validator.resources.batch_permit_validator.requests.post",
        side_effect=requests.exceptions.Timeout("timed out"),
    )
    patch_get_simple_cloud_event(validation_event_valid)
    response = client.post("/bulk-validation-response", data=b"{}")
    assert response.status_code == HTTPStatus.GATEWAY_TIMEOUT
    assert response.get_json() == {"error": "Callback URL timed out"}


def test_send_bulk_validation_response_request_exception(
    client, mocker, validation_event_valid, patch_get_simple_cloud_event
):
    """RequestException from requests.post yields 500 INTERNAL_SERVER_ERROR."""
    mocker.patch(
        "batch_permit_validator.resources.batch_permit_validator.requests.post",
        side_effect=requests.exceptions.RequestException("connection dropped"),
    )
    patch_get_simple_cloud_event(validation_event_valid)
    response = client.post("/bulk-validation-response", data=b"{}")
    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    assert response.get_json() == {"error": "Callback request failure"}


def test_send_bulk_validation_response_unexpected_exception(
    client, mocker, validation_event_valid, patch_get_simple_cloud_event
):
    """Generic exception from requests.post yields 500 INTERNAL_SERVER_ERROR."""
    mocker.patch(
        "batch_permit_validator.resources.batch_permit_validator.requests.post",
        side_effect=RuntimeError("unexpected"),
    )
    patch_get_simple_cloud_event(validation_event_valid)
    response = client.post("/bulk-validation-response", data=b"{}")
    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    assert response.get_json() == {"error": "Internal server error"}


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
    """Exception in /test-response is logged and returns 500."""
    mock_request = MagicMock()
    mock_request.get_json.side_effect = ValueError("bad json")
    with patch.object(bpvm_module, "request", mock_request):
        response = client.post("/test-response")
    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    assert response.get_json() == {"error": "Internal server error"}
