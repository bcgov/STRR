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

from flask import Flask

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


@patch("strr_api.services.gcp_storage_service.uuid.uuid4", return_value="file-key")
@patch("strr_api.services.gcp_storage_service.GCPStorageService.get_bucket")
def test_file_upload_and_presigned_url_succeed(mock_get_bucket, mock_uuid):
    """Generic file upload and presigned URL generation use the target bucket."""
    mock_blob = MagicMock()
    mock_blob.generate_signed_url.return_value = "https://signed-url"
    mock_get_bucket.return_value.blob.return_value = mock_blob

    upload_key = GCPStorageService.upload_file("text/csv", b"file contents", "target-bucket")
    url = GCPStorageService.get_presigned_url("target-bucket", "file-key", 10)

    assert upload_key == "file-key"
    assert url == "https://signed-url"
    mock_uuid.assert_called_once()
    mock_get_bucket.assert_any_call("target-bucket")
    mock_get_bucket.return_value.blob.assert_any_call("file-key")
    mock_blob.upload_from_string.assert_called_once_with(data=b"file contents", content_type="text/csv")
    mock_blob.generate_signed_url.assert_called_once_with(
        version="v4",
        expiration=timedelta(minutes=10),
        method="GET",
    )


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
