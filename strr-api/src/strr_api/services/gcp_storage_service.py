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
import logging
import traceback
import uuid
from datetime import timedelta

from flask import current_app, has_app_context
from google.auth.transport.requests import Request
from google.cloud import storage
from google.oauth2 import service_account

from strr_api.exceptions import ExternalServiceException

logger = logging.getLogger("api")


class GCPStorageService:
    """Service to save and load files from gcp buckets."""

    @staticmethod
    def _config_value(key, default=None):
        """Return Flask config when available, otherwise a safe default for isolated tests."""
        return current_app.config.get(key, default) if has_app_context() else default

    @classmethod
    def _create_storage_client(cls):
        """Build and return an authenticated GCS storage client."""
        project_id = current_app.config.get("GCP_CS_PROJECT_ID")
        credentials = None
        if auth_key := current_app.config.get("GCP_AUTH_KEY"):
            scope = current_app.config.get("GCP_CS_SA_SCOPE")
            service_account_info = json.loads(base64.b64decode(auth_key).decode("utf-8"))
            credentials = service_account.Credentials.from_service_account_info(service_account_info, scopes=[scope])
        return storage.Client(project=project_id, credentials=credentials)

    @classmethod
    def get_bucket(cls, bucket_id):
        """Get gcp bucket for saving or deleting registration documents."""
        return cls._create_storage_client().bucket(bucket_id)

    @classmethod
    def registration_documents_bucket(cls):
        """Get gcp bucket for saving or deleting registration documents."""
        bucket_id = current_app.config.get("GCP_CS_BUCKET_ID")
        return GCPStorageService.get_bucket(bucket_id)

    @classmethod
    def upload_registration_document(cls, file_type, file_contents, metadata=None):
        """Save STRR uploaded document to gcp bucket."""

        upload_metadata = cls._upload_metadata(file_type, file_contents, metadata)
        try:
            registration_documents_bucket = cls.registration_documents_bucket()
            blob_name = str(uuid.uuid4())
            blob = registration_documents_bucket.blob(blob_name)
            blob.metadata = upload_metadata
            blob.upload_from_string(data=file_contents, content_type=file_type)
            cls._log_document_upload("strr.document_upload.succeeded", blob_name, upload_metadata)
            return blob_name
        except Exception as e:
            cls._log_document_upload("strr.document_upload.failed", None, upload_metadata, e)
            logger.error(traceback.format_exc())
            raise ExternalServiceException(message="Error uploading registration document to gcp bucket.") from e

    @classmethod
    def delete_registration_document(cls, blob_name):
        """Delete registration document by uuid."""

        try:
            registration_documents_bucket = cls.registration_documents_bucket()
            blob = registration_documents_bucket.blob(blob_name)
            blob.delete()
        except Exception as e:
            logger.error(traceback.format_exc())
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
            logger.error(traceback.format_exc())
            raise ExternalServiceException(message="Error fetching registration document from gcp bucket.") from e

    @classmethod
    def get_registration_document_creation_time(cls, blob_name):
        """
        Return the blob creation time (when uploaded to GCP) as ISO string, or None if not found/error.
        Used to expose addedOn for application-stage documents that have no date in application_json.
        """
        try:
            registration_documents_bucket = cls.registration_documents_bucket()
            blob = registration_documents_bucket.blob(blob_name)
            blob.reload()
            if blob.time_created:
                return blob.time_created.isoformat()
            return None
        except Exception as e:
            logger.debug("Could not get creation time for blob %s: %s", blob_name, e)
            return None

    @classmethod
    def get_batch_registration_document_creation_times(cls, blob_names: list) -> dict:
        """
        Batch get creation timestamps for multiple documents in a single GCP request.
        """
        if not blob_names:
            return {}
        try:
            storage_client = cls._create_storage_client()
            bucket_id = current_app.config.get("GCP_CS_BUCKET_ID")
            bucket = storage_client.bucket(bucket_id)
            blobs = {name: bucket.blob(name) for name in blob_names}
            # send all requests as one HTTP batch when the block exits
            with storage_client.batch():
                for blob in blobs.values():
                    blob.reload()  # fetch metadata without downloading file content
            result = {}
            for name, blob in blobs.items():
                if blob.time_created:
                    result[name] = blob.time_created.isoformat()
                else:
                    logger.warning("No time_created for blob %s — addedOn will not be updated", name)
            return result
        except Exception as e:
            logger.debug("Could not batch get creation times for blobs: %s", e)
            return {}

    @classmethod
    def upload_file(cls, file_type, file_contents, bucket_id, metadata=None):
        """Save the document to the specified bucket."""

        upload_metadata = cls._upload_metadata(file_type, file_contents, metadata)
        try:
            bucket = cls.get_bucket(bucket_id)
            blob_name = str(uuid.uuid4())
            blob = bucket.blob(blob_name)
            blob.metadata = upload_metadata
            blob.upload_from_string(data=file_contents, content_type=file_type)
            cls._log_document_upload(
                "strr.cloud_storage_upload.succeeded", blob_name, upload_metadata, bucket_id=bucket_id
            )
            return blob_name
        except Exception as e:
            cls._log_document_upload(
                "strr.cloud_storage_upload.failed", None, upload_metadata, error=e, bucket_id=bucket_id
            )
            logger.error(traceback.format_exc())
            raise ExternalServiceException(message="Error uploading document to cloud storage bucket.") from e

    @classmethod
    def get_presigned_url(cls, bucket_id, blob_name, expiration_minutes):
        """Gets the presigned url for a file."""
        storage_client = cls._create_storage_client()
        bucket = storage_client.bucket(bucket_id)
        blob = bucket.blob(blob_name)
        signed_url_kwargs = {}

        credentials = storage_client._credentials  # pylint: disable=protected-access
        if credentials and not isinstance(credentials, service_account.Credentials):
            credentials.refresh(Request())
            if service_account_email := getattr(credentials, "service_account_email", None):
                signed_url_kwargs = {
                    "service_account_email": service_account_email,
                    "access_token": credentials.token,
                }

        # Generate the signed URL
        url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(minutes=expiration_minutes),
            method="GET",
            **signed_url_kwargs,
        )

        return url

    @classmethod
    def _upload_metadata(cls, file_type, file_contents, metadata=None):
        """Build GCS object metadata for uploaded documents."""
        file_size = len(file_contents) if file_contents is not None else 0
        if isinstance(file_contents, str):
            file_size = len(file_contents.encode("utf-8"))
        upload_metadata = {
            "content_type": file_type,
            "size": str(file_size),
            "environment": cls._config_value("POD_NAMESPACE", "unknown"),
        }
        upload_metadata.update(metadata or {})
        return {
            str(key): str(value)[:1024] for key, value in upload_metadata.items() if value is not None and value != ""
        }

    @classmethod
    def _log_document_upload(cls, event_name, blob_name, metadata, error=None, bucket_id=None):
        """Emit alertable document upload logs with consistent fields."""
        payload = {
            "event": event_name,
            "blob_name": blob_name,
            "bucket_id": bucket_id or cls._config_value("GCP_CS_BUCKET_ID"),
            **metadata,
        }
        if error:
            payload["error"] = str(error)
            logger.error("%s %s", event_name, json.dumps(payload, sort_keys=True))
        else:
            logger.info("%s %s", event_name, json.dumps(payload, sort_keys=True))
