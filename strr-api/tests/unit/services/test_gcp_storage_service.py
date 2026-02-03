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
"""Tests for GCPStorageService (registration document creation time)."""
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest

from strr_api.services.gcp_storage_service import GCPStorageService


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
