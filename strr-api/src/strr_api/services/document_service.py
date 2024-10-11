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
# pylint: disable=R0913
# pylint: disable=E1102
"""Manages document model interactions."""
from strr_api.models import Document
from strr_api.services.gcp_storage_service import GCPStorageService


class DocumentService:
    """Service to manage documents."""

    @classmethod
    def upload_document(cls, file_name, file_type, file_contents):
        """Uploads the document to GCP."""

        blob_name = GCPStorageService.upload_registration_document(file_type, file_contents)
        file_key = blob_name
        response = {
            "fileName": file_name,
            "fileType": file_type,
            "fileKey": file_key,
        }
        return response

    @classmethod
    def delete_document(cls, document_path):
        """Delete document using document path."""
        GCPStorageService.delete_registration_document(document_path)
        return True

    @classmethod
    def get_registration_documents(cls, registration_id):
        """Get registration documents by registration id."""
        return Document.query.filter(Document.registration_id == registration_id).all()

    @classmethod
    def get_registration_document(cls, registration_id, document_id):
        """Get registration document by id."""
        return (
            Document.query.filter(Document.registration_id == registration_id)
            .filter(Document.id == document_id)
            .one_or_none()
        )

    @classmethod
    def get_registration_document_by_key(cls, registration_id, file_key):
        """Get registration document by key."""
        return (
            Document.query.filter(Document.registration_id == registration_id)
            .filter(Document.path == file_key)
            .one_or_none()
        )

    @classmethod
    def get_file_by_key(cls, file_key: str):
        """Get registration supporting document by file_key."""
        return GCPStorageService.fetch_registration_document(blob_name=file_key)
