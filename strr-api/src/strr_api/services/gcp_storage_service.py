# Copyright © 2024 Province of British Columbia
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
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS”
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
"""Manages Auth service interactions."""
import base64
import json
import uuid

from flask import current_app
from google.cloud import storage
from google.oauth2 import service_account

from strr_api.exceptions import ExternalServiceException


class GCPStorageService:
    """Service to save and load files from gcp buckets."""

    @classmethod
    def get_bucket(cls, bucket_id):
        """Get gcp bucket for saving or deleting registration documents."""

        scope = current_app.config.get("GCP_CS_SA_SCOPE")

        service_account_info = json.loads(base64.b64decode(current_app.config.get("GCP_AUTH_KEY")).decode("utf-8"))
        credentials = service_account.Credentials.from_service_account_info(service_account_info, scopes=[scope])
        storage_client = storage.Client(credentials=credentials)
        bucket = storage_client.bucket(bucket_id)
        return bucket

    @classmethod
    def registration_documents_bucket(cls):
        """Get gcp bucket for saving or deleting registration documents."""
        bucket_id = current_app.config.get("GCP_CS_BUCKET_ID")
        return GCPStorageService.get_bucket(bucket_id)

    @classmethod
    def upload_registration_document(cls, file_type, file_contents):
        """Save STRR uploaded document to gcp bucket."""

        try:
            registration_documents_bucket = cls.registration_documents_bucket()
            blob_name = str(uuid.uuid4())
            blob = registration_documents_bucket.blob(blob_name)
            blob.upload_from_string(data=file_contents, content_type=file_type)
            return blob_name
        except Exception as e:
            raise ExternalServiceException(message="Error uploading registration document to gcp bucket.") from e

    @classmethod
    def delete_registration_document(cls, blob_name):
        """Delete registration document by uuid."""

        try:
            registration_documents_bucket = cls.registration_documents_bucket()
            blob = registration_documents_bucket.blob(blob_name)
            blob.delete()
        except Exception as e:
            raise ExternalServiceException(message="Error deleting registration document from gcp bucket.") from e

    @classmethod
    def fetch_registration_document(cls, blob_name):
        """Fetch registration document by uuid."""

        try:
            registration_documents_bucket = cls.registration_documents_bucket()
            blob = registration_documents_bucket.blob(blob_name)
            contents = blob.download_as_bytes()
            return contents
        except Exception as e:
            raise ExternalServiceException(message="Error fetching registration document from gcp bucket.") from e

    @classmethod
    def upload_file(cls, file_type, file_contents, bucket_id):
        """Save the document to the specified bucket."""

        try:
            bucket = cls.get_bucket(bucket_id)
            blob_name = str(uuid.uuid4())
            blob = bucket.blob(blob_name)
            blob.upload_from_string(data=file_contents, content_type=file_type)
            return blob_name
        except Exception as e:
            raise ExternalServiceException(message="Error uploading document to cloud storage bucket.") from e
