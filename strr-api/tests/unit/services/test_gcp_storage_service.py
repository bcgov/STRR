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
# CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
# SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
# INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
# CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
# ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
# POSSIBILITY OF SUCH DAMAGE.
"""Tests for GCPStorageService (registration document creation time)."""
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest

from strr_api.exceptions import ExternalServiceException
from strr_api.services.gcp_storage_service import GCPStorageService

_PATCH_REG_BUCKET = "strr_api.services.gcp_storage_service.GCPStorageService.registration_documents_bucket"
_PATCH_GET_BUCKET = "strr_api.services.gcp_storage_service.GCPStorageService.get_bucket"


@pytest.fixture
def mock_reg_bucket():
    """Patch registration_documents_bucket and pre-wire a MagicMock blob."""
    with patch(_PATCH_REG_BUCKET) as mock_bucket:
        mock_blob = MagicMock()
        mock_bucket.return_value.blob.return_value = mock_blob
        yield mock_bucket, mock_blob


@pytest.fixture
def mock_get_bucket_fixture():
    """Patch get_bucket and pre-wire a MagicMock blob."""
    with patch(_PATCH_GET_BUCKET) as mock_bucket:
        mock_blob = MagicMock()
        mock_bucket.return_value.blob.return_value = mock_blob
        yield mock_bucket, mock_blob


# get_registration_document_creation_time — parametrized


def _blob_exists(blob):
    blob.time_created = datetime(2025, 1, 15, 10, 30, 0, tzinfo=timezone.utc)


def _blob_reload_raises(blob):
    blob.reload.side_effect = Exception("Blob not found")


def _blob_no_time(blob):
    blob.time_created = None


@pytest.mark.parametrize(
    "configure_blob, expected",
    [
        (_blob_exists, "2025-01-15T10:30:00+00:00"),
        (_blob_reload_raises, None),
        (_blob_no_time, None),
    ],
    ids=["returns_iso_when_blob_exists", "returns_none_when_blob_missing", "returns_none_when_time_created_is_none"],
)
def test_get_registration_document_creation_time(mock_reg_bucket, configure_blob, expected):
    _, mock_blob = mock_reg_bucket
    configure_blob(mock_blob)
    result = GCPStorageService.get_registration_document_creation_time("some-blob-key")
    assert result == expected


# upload_registration_document


def test_upload_registration_document_returns_blob_name(mock_reg_bucket):
    _, mock_blob = mock_reg_bucket
    name = GCPStorageService.upload_registration_document("application/pdf", b"data")
    assert mock_blob.upload_from_string.called
    assert len(name) == 36  # uuid string


def test_upload_registration_document_raises_external_service_exception(mock_reg_bucket):
    _, mock_blob = mock_reg_bucket
    mock_blob.upload_from_string.side_effect = RuntimeError("up")
    with pytest.raises(ExternalServiceException):
        GCPStorageService.upload_registration_document("application/pdf", b"x")


# delete_registration_document / fetch_registration_document


def test_delete_registration_document_calls_blob_delete(mock_reg_bucket):
    _, mock_blob = mock_reg_bucket
    GCPStorageService.delete_registration_document("blob-id")
    mock_blob.delete.assert_called_once()


def test_fetch_registration_document_returns_bytes(mock_reg_bucket):
    _, mock_blob = mock_reg_bucket
    mock_blob.download_as_bytes.return_value = b"content"
    assert GCPStorageService.fetch_registration_document("id") == b"content"


# upload_file / get_presigned_url — use get_bucket seam


def test_upload_file_uses_named_bucket(mock_get_bucket_fixture):
    mock_bucket, mock_blob = mock_get_bucket_fixture
    GCPStorageService.upload_file("text/plain", b"hello", "my-bucket")
    mock_bucket.assert_called_once_with("my-bucket")
    mock_blob.upload_from_string.assert_called_once()


def test_get_presigned_url(mock_get_bucket_fixture):
    _, mock_blob = mock_get_bucket_fixture
    mock_blob.generate_signed_url.return_value = "https://signed"
    url = GCPStorageService.get_presigned_url("b", "key", 5)
    assert url == "https://signed"
    mock_blob.generate_signed_url.assert_called_once()
