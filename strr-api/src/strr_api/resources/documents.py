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

"""
STRR Documents Resource.
"""

import logging
from http import HTTPStatus

from flasgger import swag_from
from flask import Blueprint, request
from flask_cors import cross_origin
from werkzeug.utils import secure_filename

from strr_api.common.auth import jwt
from strr_api.exceptions import AuthException, ExternalServiceException, ValidationException, exception_response
from strr_api.services import DocumentService
from strr_api.validators.DocumentUploadValidator import validate_document_upload

logger = logging.getLogger("api")
bp = Blueprint("documents", __name__)


@bp.route("", methods=("POST",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def upload_supporting_document():
    """
    Upload a supporting STRR document.
    ---
    tags:
      - document
    parameters:
      - name: file
        in: formData
        type: file
        required: true
        description: The file to upload
    consumes:
      - multipart/form-data
    responses:
      201:
        description:
      400:
        description:
      401:
        description:
      403:
        description:
      502:
        description:
    """

    try:
        file = validate_document_upload(request.files)
        filename = secure_filename(file.filename)
        document = DocumentService.upload_document(filename, file.content_type, file.read())
        return document, HTTPStatus.CREATED
    except AuthException as auth_exception:
        return exception_response(auth_exception)
    except ValidationException as auth_exception:
        return exception_response(auth_exception)
    except ExternalServiceException as service_exception:
        return exception_response(service_exception)


@bp.route("/<file_key>", methods=("DELETE",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def delete_document(file_key):
    """
    Delete document.
    ---
    tags:
      - document
    parameters:
      - in: path
        name: file_key
        type: string
        required: true
        description: File key from the upload document response
    responses:
      204:
        description:
      401:
        description:
      403:
        description:
      502:
        description:
    """

    try:
        DocumentService.delete_document(file_key)
        return "", HTTPStatus.NO_CONTENT
    except AuthException as auth_exception:
        return exception_response(auth_exception)
    except ExternalServiceException as external_exception:
        return exception_response(external_exception)
