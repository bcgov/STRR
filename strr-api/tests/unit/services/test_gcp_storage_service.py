# Copyright © 2025 Province of British Columbia
#
# Licensed under the BSD 3 Clause License, (the "License");
# you may not use this file except in compliance with the License.
# The template for the license can be found here
#    https://opensource.org/license/bsd-3-clause/
#
# Redistribution and use in source and binary forms,
# with or without modification, are permitted provided that the
# following conditions are met:
#
# 1. Redistributions of source code must retain the above copyright notice,
#    this list of conditions and the following disclaimer.
#
# 2. Redistributions in binary form must reproduce the above copyright notice,
#    this list of conditions and the following disclaimer in the documentation
#    and/or other materials provided with the distribution.
#
# 3. Neither the name of the copyright holder nor the names of its contributors
#    may be used to endorse or promote products derived from this software
#    without specific prior written permission.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
# THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
# ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
# LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
# CONSEQUENTIAL DAMAGES HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
# CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING
# IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
# POSSIBILITY OF SUCH DAMAGE.
"""Tests for GCPStorageService."""
import base64
import json
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest
from flask import Flask

from strr_api.exceptions import ExternalServiceException
from strr_api.services.gcp_storage_service import GCPStorageService


def _encoded_service_account_key():
    """Return a base64 encoded service account key for storage client tests."""
    service_account_info = {
        "client_email": "sa-api@example.com",
        "private_key_id": "test-key-id",
    }
    return base64.b64encode(json.dumps(service_account_info).encode("utf-8")).decode("utf-8")


def _app_with_config(**config):
    """Create a lightweight Flask app for config-only storage tests."""
    app = Flask(__name__)
    app.config.update(config)
    return app


def test_get_bucket_uses_service_account_key_when_configured():
    """get_bucket uses an explicit service account key when one is configured."""
    app = _app_with_config(
        GCP_AUTH_KEY=_encoded_service_account_key(),
        GCP_CS_PROJECT_ID="bcrbk9-test",
        GCP_CS_SA_SCOPE="https://www.googleapis.com/auth/cloud-platform",
    )

    expected_info = {
        "client_email": "sa-api@example.com",
        "private_key_id": "test-key-id",
    }

    with (
        patch("strr_api.services.gcp_storage_service.storage.Client") as mock_storage_client,
        patch("strr_api.services.gcp_storage_service.service_account.Credentials") as mock_credentials,
    ):
        mock_credentials.from_service_account_info.return_value = "credentials"
        with app.app_context():
            bucket = GCPStorageService.get_bucket("test-bucket")
    mock_credentials.from_service_account_info.assert_called_once_with(
        expected_info,
        scopes=["https://www.googleapis.com/auth/cloud-platform"],
    )
    mock_storage_client.assert_called_once_with(project="bcrbk9-test", credentials="credentials")
    mock_storage_client.return_value.bucket.assert_called_once_with("test-bucket")
    assert bucket == mock_storage_client.return_value.bucket.return_value


def test_get_bucket_uses_adc_when_key_missing():
    """get_bucket falls back to ADC when no GCP_AUTH_KEY is configured."""
    app = _app_with_config(
        GCP_AUTH_KEY=None,
        GCP_CS_PROJECT_ID="bcrbk9-test",
        GCP_CS_SA_SCOPE="https://www.googleapis.com/auth/cloud-platform",
    )

    with (
        patch("strr_api.services.gcp_storage_service.storage.Client") as mock_storage_client,
        patch("strr_api.services.gcp_storage_service.service_account.Credentials") as mock_credentials,
    ):
        with app.app_context():
            bucket = GCPStorageService.get_bucket("test-bucket")

    mock_credentials.from_service_account_info.assert_not_called()
    mock_storage_client.assert_called_once_with(project="bcrbk9-test", credentials=None)
    mock_storage_client.return_value.bucket.assert_called_once_with("test-bucket")
    assert bucket == mock_storage_client.return_value.bucket.return_value


@patch("strr_api.services.gcp_storage_service.GCPStorageService.get_bucket")
def test_registration_documents_bucket_uses_configured_bucket(mock_get_bucket):
    """registration_documents_bucket uses the configured registration documents bucket."""
    app = _app_with_config(GCP_CS_BUCKET_ID="registration-bucket")

    with app.app_context():
        bucket = GCPStorageService.registration_documents_bucket()

    mock_get_bucket.assert_called_once_with("registration-bucket")
    assert bucket == mock_get_bucket.return_value


@patch("strr_api.services.gcp_storage_service.uuid.uuid4", return_value="file-key")
@patch("strr_api.services.gcp_storage_service.GCPStorageService.registration_documents_bucket")
def test_registration_document_blob_operations_succeed(mock_bucket, mock_uuid):
    """Registration document upload, delete, and fetch delegate to the bucket blob."""
    mock_blob = MagicMock()
    mock_blob.download_as_bytes.return_value = b"file contents"
    mock_bucket.return_value.blob.return_value = mock_blob

    upload_key = GCPStorageService.upload_registration_document("application/pdf", b"file contents")
    GCPStorageService.delete_registration_document("file-key")
    contents = GCPStorageService.fetch_registration_document("file-key")

    assert upload_key == "file-key"
    assert contents == b"file contents"
    mock_uuid.assert_called_once()
    mock_bucket.return_value.blob.assert_any_call("file-key")
    mock_blob.upload_from_string.assert_called_once_with(data=b"file contents", content_type="application/pdf")
    mock_blob.delete.assert_called_once()
    mock_blob.download_as_bytes.assert_called_once()


@patch("strr_api.services.gcp_storage_service.GCPStorageService.registration_documents_bucket")
def test_upload_registration_document_raises_external_service_exception_on_failure(mock_bucket):
    """upload_registration_document wraps storage errors in ExternalServiceException."""
    mock_blob = MagicMock()
    mock_blob.upload_from_string.side_effect = RuntimeError("upload failed")
    mock_bucket.return_value.blob.return_value = mock_blob

    with pytest.raises(ExternalServiceException) as exc_info:
        GCPStorageService.upload_registration_document("application/pdf", b"file contents")
    assert exc_info.value.message == "Error uploading registration document to gcp bucket."
    assert isinstance(exc_info.value.__cause__, RuntimeError)


@patch("strr_api.services.gcp_storage_service.GCPStorageService.registration_documents_bucket")
def test_delete_registration_document_raises_external_service_exception_on_failure(mock_bucket):
    """delete_registration_document wraps storage errors in ExternalServiceException."""
    mock_blob = MagicMock()
    mock_blob.delete.side_effect = RuntimeError("delete failed")
    mock_bucket.return_value.blob.return_value = mock_blob

    with pytest.raises(ExternalServiceException) as exc_info:
        GCPStorageService.delete_registration_document("file-key")
    assert exc_info.value.message == "Error deleting registration document from gcp bucket."
    assert isinstance(exc_info.value.__cause__, RuntimeError)


@patch("strr_api.services.gcp_storage_service.GCPStorageService.registration_documents_bucket")
def test_fetch_registration_document_raises_external_service_exception_on_failure(mock_bucket):
    """fetch_registration_document wraps storage errors in ExternalServiceException."""
    mock_blob = MagicMock()
    mock_blob.download_as_bytes.side_effect = RuntimeError("download failed")
    mock_bucket.return_value.blob.return_value = mock_blob

    with pytest.raises(ExternalServiceException) as exc_info:
        GCPStorageService.fetch_registration_document("file-key")
    assert exc_info.value.message == "Error fetching registration document from gcp bucket."
    assert isinstance(exc_info.value.__cause__, RuntimeError)


@patch("strr_api.services.gcp_storage_service.uuid.uuid4", return_value="file-key")
@patch("strr_api.services.gcp_storage_service.GCPStorageService.get_bucket")
def test_file_upload_and_presigned_url_succeed(mock_get_bucket, mock_uuid):
    """Generic file upload and presigned URL generation use the target bucket."""
    mock_blob = MagicMock()
    mock_blob.generate_signed_url.return_value = "https://signed-url"
    mock_get_bucket.return_value.blob.return_value = mock_blob
    mock_storage_client = MagicMock()
    mock_storage_client._credentials = None
    mock_storage_client.bucket.return_value.blob.return_value = mock_blob

    upload_key = GCPStorageService.upload_file("text/csv", b"file contents", "target-bucket")
    with patch(
        "strr_api.services.gcp_storage_service.GCPStorageService._create_storage_client",
        return_value=mock_storage_client,
    ):
        url = GCPStorageService.get_presigned_url("target-bucket", "file-key", 10)

    assert upload_key == "file-key"
    assert url == "https://signed-url"
    mock_uuid.assert_called_once()
    mock_get_bucket.assert_called_once_with("target-bucket")
    mock_get_bucket.return_value.blob.assert_any_call("file-key")
    mock_storage_client.bucket.assert_called_once_with("target-bucket")
    mock_storage_client.bucket.return_value.blob.assert_called_once_with("file-key")
    mock_blob.upload_from_string.assert_called_once_with(data=b"file contents", content_type="text/csv")
    mock_blob.generate_signed_url.assert_called_once_with(
        version="v4",
        expiration=timedelta(minutes=10),
        method="GET",
    )


@patch("strr_api.services.gcp_storage_service.Request")
@patch("strr_api.services.gcp_storage_service.GCPStorageService._create_storage_client")
def test_presigned_url_uses_adc_token_signing_kwargs(mock_create_client, mock_request):
    """get_presigned_url supports keyless runtime credentials for signed URLs."""
    mock_credentials = MagicMock()
    mock_credentials.service_account_email = "sa-job@example.iam.gserviceaccount.com"
    mock_credentials.token = "access-token"

    mock_blob = MagicMock()
    mock_blob.generate_signed_url.return_value = "https://signed-url"
    mock_storage_client = MagicMock()
    mock_storage_client._credentials = mock_credentials
    mock_storage_client.bucket.return_value.blob.return_value = mock_blob
    mock_create_client.return_value = mock_storage_client

    url = GCPStorageService.get_presigned_url("target-bucket", "file-key", 10)

    assert url == "https://signed-url"
    mock_credentials.refresh.assert_called_once_with(mock_request.return_value)
    mock_blob.generate_signed_url.assert_called_once_with(
        version="v4",
        expiration=timedelta(minutes=10),
        method="GET",
        service_account_email="sa-job@example.iam.gserviceaccount.com",
        access_token="access-token",
    )


@patch("strr_api.services.gcp_storage_service.GCPStorageService.get_bucket")
def test_upload_file_raises_external_service_exception_on_failure(mock_get_bucket):
    """upload_file wraps storage errors in ExternalServiceException."""
    mock_blob = MagicMock()
    mock_blob.upload_from_string.side_effect = RuntimeError("upload failed")
    mock_get_bucket.return_value.blob.return_value = mock_blob

    with pytest.raises(ExternalServiceException) as exc_info:
        GCPStorageService.upload_file("text/csv", b"file contents", "target-bucket")
    assert exc_info.value.message == "Error uploading document to cloud storage bucket."
    assert isinstance(exc_info.value.__cause__, RuntimeError)


@patch("strr_api.services.gcp_storage_service.GCPStorageService.registration_documents_bucket")
def test_get_registration_document_creation_time_returns_iso_when_blob_exists(mock_bucket):
    """get_registration_document_creation_time returns blob time_created as ISO string when blob exists."""
    mock_blob = MagicMock()
    created_dt = datetime(2025, 1, 15, 10, 30, 0, tzinfo=timezone.utc)
    mock_blob.time_created = created_dt
    mock_bucket.return_value.blob.return_value = mock_blob

    result = GCPStorageService.get_registration_document_creation_time("some-blob-key")

    assert result == "2025-01-15T10:30:00+00:00"
    mock_blob.reload.assert_called_once()


@patch("strr_api.services.gcp_storage_service.GCPStorageService.registration_documents_bucket")
def test_get_registration_document_creation_time_returns_none_when_blob_missing(mock_bucket):
    """get_registration_document_creation_time returns None when blob does not exist or reload fails."""
    mock_blob = MagicMock()
    mock_blob.reload.side_effect = Exception("Blob not found")
    mock_bucket.return_value.blob.return_value = mock_blob

    result = GCPStorageService.get_registration_document_creation_time("missing-key")

    assert result is None


@patch("strr_api.services.gcp_storage_service.GCPStorageService.registration_documents_bucket")
def test_get_registration_document_creation_time_returns_none_when_time_created_is_none(mock_bucket):
    """get_registration_document_creation_time returns None when blob has no time_created."""
    mock_blob = MagicMock()
    mock_blob.time_created = None
    mock_bucket.return_value.blob.return_value = mock_blob

    result = GCPStorageService.get_registration_document_creation_time("no-time-key")

    assert result is None
    mock_blob.reload.assert_called_once()


@pytest.mark.conf(POD_NAMESPACE="test", GCP_CS_BUCKET_ID="registration-docs")
@patch("strr_api.services.gcp_storage_service.uuid.uuid4", return_value="blob-id")
@patch("strr_api.services.gcp_storage_service.GCPStorageService.registration_documents_bucket")
def test_upload_registration_document_sets_metadata(mock_bucket, mock_uuid, app, inject_config):
    """upload_registration_document tags the GCS object with observability metadata."""
    mock_blob = MagicMock()
    mock_bucket.return_value.blob.return_value = mock_blob

    with app.app_context():
        result = GCPStorageService.upload_registration_document(
            "application/pdf",
            b"abc",
            metadata={
                "upload_source": "registration",
                "entity_id": 123,
                "document_type": "NOC",
                "upload_step": "registration_document",
            },
        )

    assert result == "blob-id"
    assert mock_blob.metadata == {
        "content_type": "application/pdf",
        "size": "3",
        "environment": "test",
        "upload_source": "registration",
        "entity_id": "123",
        "document_type": "NOC",
        "upload_step": "registration_document",
    }
    mock_blob.upload_from_string.assert_called_once_with(data=b"abc", content_type="application/pdf")


@pytest.mark.conf(POD_NAMESPACE="test", GCP_CS_BUCKET_ID="registration-docs")
@patch("strr_api.services.gcp_storage_service.uuid.uuid4", return_value="blob-id")
@patch("strr_api.services.gcp_storage_service.GCPStorageService.registration_documents_bucket")
def test_upload_registration_document_logs_failure(mock_bucket, mock_uuid, app, inject_config):
    """upload_registration_document emits an alertable failure log before raising."""
    mock_blob = MagicMock()
    mock_blob.upload_from_string.side_effect = RuntimeError("upload failed")
    mock_bucket.return_value.blob.return_value = mock_blob

    with app.app_context(), patch("strr_api.services.gcp_storage_service.logger.error") as mock_logger:
        with pytest.raises(ExternalServiceException):
            GCPStorageService.upload_registration_document(
                "application/pdf",
                b"abc",
                metadata={
                    "upload_source": "registration",
                    "entity_id": 123,
                    "document_type": "NOC",
                    "upload_step": "registration_document",
                },
            )

    assert any("strr.document_upload.failed" in str(arg) for call in mock_logger.call_args_list for arg in call.args)


@patch("strr_api.services.gcp_storage_service.GCPStorageService._create_storage_client")
def test_get_batch_registration_document_creation_times_returns_empty_dict_for_empty_input(mock_make_client):
    """get_batch_registration_document_creation_times returns {} without calling GCP when given no blob names."""
    result = GCPStorageService.get_batch_registration_document_creation_times([])
    assert result == {}
    mock_make_client.assert_not_called()


@patch("strr_api.services.gcp_storage_service.GCPStorageService._create_storage_client")
def test_get_batch_registration_document_creation_times_batches_and_returns_timestamps(mock_make_client):
    """get_batch_registration_document_creation_times issues one batch request and maps file keys to ISO timestamps."""
    created_a = datetime(2025, 1, 10, 8, 0, 0, tzinfo=timezone.utc)
    created_b = datetime(2025, 2, 20, 12, 0, 0, tzinfo=timezone.utc)

    blob_a = MagicMock()
    blob_a.time_created = created_a
    blob_b = MagicMock()
    blob_b.time_created = created_b

    mock_client = MagicMock()
    mock_client.bucket.return_value.blob.side_effect = lambda name: {"key-a": blob_a, "key-b": blob_b}[name]
    mock_client.batch.return_value.__enter__ = MagicMock(return_value=None)
    mock_client.batch.return_value.__exit__ = MagicMock(return_value=False)
    mock_make_client.return_value = mock_client

    app = _app_with_config(GCP_CS_BUCKET_ID="test-bucket")
    with app.app_context():
        result = GCPStorageService.get_batch_registration_document_creation_times(["key-a", "key-b"])

    assert result == {
        "key-a": created_a.isoformat(),
        "key-b": created_b.isoformat(),
    }
    mock_client.batch.assert_called_once()


@patch("strr_api.services.gcp_storage_service.GCPStorageService._create_storage_client")
def test_get_batch_registration_document_creation_times_omits_blobs_without_time_created(mock_make_client):
    """get_batch_registration_document_creation_times omits blobs that have no time_created."""
    blob_ok = MagicMock()
    blob_ok.time_created = datetime(2025, 3, 1, tzinfo=timezone.utc)
    blob_no_time = MagicMock()
    blob_no_time.time_created = None

    mock_client = MagicMock()
    mock_client.bucket.return_value.blob.side_effect = lambda name: {"key-ok": blob_ok, "key-none": blob_no_time}[name]
    mock_client.batch.return_value.__enter__ = MagicMock(return_value=None)
    mock_client.batch.return_value.__exit__ = MagicMock(return_value=False)
    mock_make_client.return_value = mock_client

    app = _app_with_config(GCP_CS_BUCKET_ID="test-bucket")
    with app.app_context():
        result = GCPStorageService.get_batch_registration_document_creation_times(["key-ok", "key-none"])

    assert "key-ok" in result
    assert "key-none" not in result


@patch("strr_api.services.gcp_storage_service.GCPStorageService._create_storage_client")
def test_get_batch_registration_document_creation_times_returns_empty_dict_on_error(mock_make_client):
    """get_batch_registration_document_creation_times returns {} and does not raise when GCP errors."""
    mock_make_client.side_effect = Exception("GCP unavailable")

    app = _app_with_config(GCP_CS_BUCKET_ID="test-bucket")
    with app.app_context():
        result = GCPStorageService.get_batch_registration_document_creation_times(["key-a"])

    assert result == {}
