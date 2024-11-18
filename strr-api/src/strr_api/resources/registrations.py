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

"""
This module provides a simple flask blueprint with a single 'home' route that returns a JSON response.
"""

import logging
from http import HTTPStatus
from io import BytesIO

from flasgger import swag_from
from flask import Blueprint, g, jsonify, request, send_file
from flask_cors import cross_origin

from strr_api.common.auth import jwt
from strr_api.exceptions import AuthException, ExternalServiceException, error_response, exception_response
from strr_api.models import User
from strr_api.responses import Events
from strr_api.services import DocumentService, EventsService, RegistrationService, UserService

logger = logging.getLogger("api")
bp = Blueprint("registrations", __name__)


@bp.route("", methods=("GET",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def get_registrations():
    """
    Get registrations for current user.
    ---
    tags:
      - registration
    parameters:
      - in: header
        name: Account-Id
        type: integer
        description: SBC Account Id.
      - in: query
        name: status
        enum: [ACTIVE, EXPIRED, SUSPENDED]
      - in: query
        name: sort_by
        enum: [ID, STATUS]
      - in: query
        name: sort_desc
        type: boolean
        description: false or omitted for ascending, true for descending order.
      - in: query
        name: offset
        type: integer
        default: 1
      - in: query
        name: limit
        type: integer
        default: 50
    responses:
      200:
        description:
      401:
        description:
    """
    account_id = request.headers.get("Account-Id")
    status = request.args.get("status", None)
    sort_by = request.args.get("sort_by", None)
    sort_desc: bool = request.args.get("sort_desc", "false").lower() == "true"
    offset: int = request.args.get("offset", 1)
    limit: int = request.args.get("limit", 50)

    return RegistrationService.list_registrations(account_id, status, sort_by, sort_desc, offset, limit), HTTPStatus.OK


@bp.route("/<registration_id>", methods=("GET",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def get_registration(registration_id):
    """
    Get registration by id
    ---
    tags:
      - registration
    parameters:
      - in: path
        name: registration_id
        type: integer
        required: true
        description: ID of the registration
    responses:
      200:
        description:
      401:
        description:
      404:
        description:
    """

    try:
        account_id = request.headers.get("Account-Id")
        registration = RegistrationService.get_registration(account_id, registration_id)
        if not registration:
            return error_response(HTTPStatus.NOT_FOUND, "Registration not found")

        return RegistrationService.serialize(registration), HTTPStatus.OK

    except AuthException as auth_exception:
        return exception_response(auth_exception)


@bp.route("/<registration_id>/documents/<file_key>", methods=("GET",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def get_registration_file_by_id(registration_id, file_key):
    """
    Get registration file contents for given registration id and document id.
    ---
    tags:
      - registration
    parameters:
      - in: path
        name: registration_id
        type: integer
        required: true
        description: ID of the registration
      - in: path
        name: file_key
        type: string
        required: true
        description: File key from the upload document response
    responses:
      200:
        description:
      401:
        description:
      403:
        description:
      404:
        description:
      502:
        description:
    """

    try:
        # only allow upload for registrations that belong to the user
        registration = RegistrationService.get_registration(g.jwt_oidc_token_info, registration_id)
        if not registration:
            raise AuthException()

        document = DocumentService.get_registration_document_by_key(registration_id, file_key)
        if not document:
            return error_response(HTTPStatus.NOT_FOUND, "Document not found")
        file_content = DocumentService.get_file_by_key(file_key)
        return send_file(
            BytesIO(file_content), as_attachment=True, download_name=document.file_name, mimetype=document.file_type
        )
    except AuthException as auth_exception:
        return exception_response(auth_exception)
    except ExternalServiceException as external_exception:
        return exception_response(external_exception)


@bp.route("/<registration_id>/events", methods=("GET",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def get_registration_events(registration_id):
    """
    Get events for given registration id.
    ---
    tags:
      - registration
    parameters:
      - in: path
        name: registration_id
        type: integer
        required: true
        description: ID of the registration
    responses:
      200:
        description:
      401:
        description:
      403:
        description:
    """

    try:
        account_id = request.headers.get("Account-Id")
        user = User.get_or_create_user_by_jwt(g.jwt_oidc_token_info)
        if not user:
            raise AuthException()

        only_show_visible_to_user = not UserService.is_strr_staff_or_system()
        registration = RegistrationService.get_registration(account_id, registration_id)
        if not registration:
            raise AuthException()

        records = EventsService.fetch_registration_events(registration_id, only_show_visible_to_user)
        return (
            jsonify([Events.from_db(record).model_dump(mode="json") for record in records]),
            HTTPStatus.OK,
        )
    except AuthException as auth_exception:
        return exception_response(auth_exception)


# TODO: Certificates are not supported for the MVP release. This functionality will be supported in a future release.
# @bp.route("/<registration_id>/certificate", methods=("POST",))
# @swag_from({"security": [{"Bearer": []}]})
# @cross_origin(origin="*")
# @jwt.requires_auth
# @jwt.has_one_of_roles([Role.STRR_EXAMINER.value, Role.SYSTEM.value])
# def issue_registration_certificate(registration_id):
#     try:
#         registration = RegistrationService.get_registration(g.jwt_oidc_token_info, registration_id)
#         if not registration:
#             return error_response(HTTPStatus.NOT_FOUND, ErrorMessage.REGISTRATION_NOT_FOUND.value)
#         if registration.registration_type == RegistrationType.PLATFORM.value:
#             return error_response(
#                 message=ErrorMessage.PLATFORM_ISSUE_CERTIFICATE_ERROR.value,
#                 http_status=HTTPStatus.BAD_REQUEST,
#             )
#
#         RegistrationService.generate_registration_certificate(registration)
#         return RegistrationService.serialize(registration), HTTPStatus.CREATED
#     except AuthException as auth_exception:
#         return exception_response(auth_exception)
#
#
# @bp.route("/<registration_id>/certificate", methods=("GET",))
# @swag_from({"security": [{"Bearer": []}]})
# @cross_origin(origin="*")
# @jwt.requires_auth
# def get_registration_certificate(registration_id):
#     try:
#         account_id = request.headers.get("Account-Id")
#         registration = RegistrationService.get_registration(account_id, registration_id)
#         if not registration:
#             raise AuthException()
#
#         certificate = RegistrationService.get_latest_certificate(registration)
#         if not certificate:
#             return error_response(HTTPStatus.NOT_FOUND, "Certificate not found")
#
#         return send_file(
#             BytesIO(certificate.certificate),
#             as_attachment=True,
#             download_name="Host Registration Certificate.pdf",
#             mimetype="application/pdf",
#         )
#     except AuthException as auth_exception:
#         return exception_response(auth_exception)
