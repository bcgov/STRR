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
import traceback
from datetime import datetime, timedelta
from http import HTTPStatus
from io import BytesIO

from dateutil.relativedelta import relativedelta
from flasgger import swag_from
from flask import Blueprint, g, jsonify, request, send_file
from flask_cors import cross_origin
from werkzeug.utils import secure_filename

from strr_api.common.auth import jwt
from strr_api.enums.enum import ErrorMessage, RegistrationNocStatus, RegistrationStatus, RegistrationType, Role
from strr_api.exceptions import (
    AuthException,
    ExternalServiceException,
    ValidationException,
    error_response,
    exception_response,
)
from strr_api.models import User
from strr_api.responses import Events
from strr_api.schemas.utils import validate
from strr_api.services import DocumentService, EventsService, RegistrationService, UserService
from strr_api.services.registration_service import REGISTRATION_STATES_STAFF_ACTION
from strr_api.validators.DocumentUploadValidator import validate_document_upload

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


@bp.route("/<registration_number>/validate", methods=("GET",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def validate_registration(registration_number):
    """
    Returns whether a registration is valid or not.
    ---
    tags:
      - registration
    parameters:
      - in: path
        name: registration_number
        type: string
        required: true
        description: Registration Number
    responses:
      200:
        description:
      401:
        description:
    """

    try:
        return {"isValid": RegistrationService.is_registration_valid(registration_number)}, HTTPStatus.OK
    except Exception as exception:
        logger.error("Error in validating registration number: %s", repr(exception))
        return error_response(ErrorMessage.PROCESSING_ERROR.value, HTTPStatus.INTERNAL_SERVER_ERROR)


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


@bp.route("/<registration_id>/documents", methods=("POST",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def upload_registration_document(registration_id):
    """
    Upload a document for a registration.
    ---
    tags:
      - registration
    parameters:
      - in: path
        name: registration_id
        type: integer
        required: true
        description: Registration ID
      - name: file
        in: formData
        type: file
        required: true
        description: The file to upload
      - name: documentType
        in: formData
        type: string
        required: false
        description: Type of document being uploaded
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
        user = UserService.get_or_create_user_by_jwt(g.jwt_oidc_token_info)
        if not user:
            raise AuthException()

        account_id = request.headers.get("Account-Id")
        registration = RegistrationService.get_registration(account_id, registration_id)
        if not registration:
            return error_response(http_status=HTTPStatus.NOT_FOUND, message=ErrorMessage.REGISTRATION_NOT_FOUND.value)

        noc_status = registration.noc_status
        if not UserService.is_strr_staff_or_system():
            if noc_status != RegistrationNocStatus.NOC_PENDING:
                return error_response(
                    message=ErrorMessage.REGISTRATION_DOCUMENT_UPLOAD_NOC_STATUS.value,
                    http_status=HTTPStatus.BAD_REQUEST,
                )

        file = validate_document_upload(request.files)
        filename = secure_filename(file.filename)
        document_type = request.form.get("documentType", "OTHERS")

        document_response = DocumentService.upload_document(filename, file.content_type, file.read())

        registration = RegistrationService.upload_document_to_registration(
            registration=registration,
            file_name=filename,
            file_type=file.content_type,
            file_key=document_response["fileKey"],
            document_type=document_type,
            user=user,
        )
        return RegistrationService.serialize(registration), HTTPStatus.CREATED

    except AuthException as auth_exception:
        logger.error("AuthException in upload_registration_document: %s", repr(auth_exception))
        logging.error("Traceback: %s", traceback.format_exc())
        return error_response(message=ErrorMessage.PROCESSING_ERROR.value, http_status=HTTPStatus.INTERNAL_SERVER_ERROR)
    except ValidationException as validation_exception:
        logger.error("ValidationException in upload_registration_document: %s", repr(validation_exception))
        logging.error("Traceback: %s", traceback.format_exc())
        return error_response(message=ErrorMessage.PROCESSING_ERROR.value, http_status=HTTPStatus.INTERNAL_SERVER_ERROR)
    except ExternalServiceException as service_exception:
        logger.error("ExternalServiceException in upload_registration_document: %s", repr(service_exception))
        logging.error("Traceback: %s", traceback.format_exc())
        return error_response(message=ErrorMessage.PROCESSING_ERROR.value, http_status=HTTPStatus.INTERNAL_SERVER_ERROR)


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


@bp.route("/<registration_id>/status", methods=("PUT",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
@jwt.has_one_of_roles([Role.STRR_CANCEL_REGISTRATION.value, Role.STRR_EXAMINER.value, Role.SYSTEM.value])
def update_registration_status(registration_id):
    """
    Update registration status.
    ---
    parameters:
      - in: path
        name: registration_id
        type: integer
        required: true
        description: Registration Id
    responses:
      200:
        description:
      401:
        description:
      404:
        description:
    """

    try:
        reviewer = UserService.get_or_create_user_by_jwt(g.jwt_oidc_token_info)
        json_input = request.get_json()
        status = json_input.get("status")
        email_content = json_input.get("emailContent")
        if not status or status not in REGISTRATION_STATES_STAFF_ACTION:
            return error_response(
                http_status=HTTPStatus.BAD_REQUEST, message=ErrorMessage.REGISTRATION_STATUS_UPDATE_NOT_ALLOWED.value
            )

        registration = RegistrationService.get_registration_by_id(registration_id)
        if not registration:
            return error_response(http_status=HTTPStatus.NOT_FOUND, message=ErrorMessage.REGISTRATION_NOT_FOUND.value)
        registration = RegistrationService.update_registration_status(
            registration=registration, status=status.upper(), reviewer=reviewer, email_content=email_content
        )
        return RegistrationService.serialize(registration), HTTPStatus.OK
    except Exception as exception:
        logger.error(exception)
        return error_response(message=ErrorMessage.PROCESSING_ERROR.value, http_status=HTTPStatus.INTERNAL_SERVER_ERROR)


@bp.route("/<registration_id>/todos", methods=("GET",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def get_todos(registration_id):
    """
    Get todos for a registration.
    ---
    parameters:
      - in: path
        name: registration_id
        type: integer
        required: true
        description: Registration Id
    responses:
      200:
        description: Success
      401:
        description: Unauthorized to retrieve the todos for the registration.
      500:
        description: Unexpected error during processing.
    """
    try:
        account_id = request.headers.get("Account-Id")
        user = User.get_or_create_user_by_jwt(g.jwt_oidc_token_info)
        if not user:
            raise AuthException()
        registration = RegistrationService.get_registration(account_id, registration_id)
        if not registration:
            raise AuthException()

        todos = []

        if registration.noc_status == RegistrationNocStatus.NOC_PENDING:
            todos.append({"task": {"type": "NOC_PENDING"}})

        if registration.status in [RegistrationStatus.ACTIVE, RegistrationStatus.EXPIRED]:
            # Get the current time in UTC
            current_time_utc = datetime.utcnow()
            registration_expiry_datetime = registration.expiry_date

            # Window in which todos should appear
            threshold_datetime_start = registration_expiry_datetime - timedelta(days=30)
            threshold_datetime_end = registration_expiry_datetime + relativedelta(years=3)

            if threshold_datetime_start.date() <= current_time_utc.date() <= threshold_datetime_end.date():
                todos.append({"task": {"type": "REGISTRATION_RENEWAL"}})

        return {"todos": todos}, HTTPStatus.OK
    except Exception as exception:
        logger.error(exception)
        logging.error("Traceback: %s", traceback.format_exc())
        return error_response(message=ErrorMessage.PROCESSING_ERROR.value, http_status=HTTPStatus.INTERNAL_SERVER_ERROR)


@bp.route("/<registration_id>/str-address", methods=("PATCH",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
@jwt.has_one_of_roles([Role.STRR_EXAMINER.value, Role.STRR_INVESTIGATOR.value])
def update_registration_unit_address(registration_id):
    """Update the rental unit address for a host registration."""
    try:
        user = UserService.get_or_create_user_by_jwt(g.jwt_oidc_token_info)
        json_input = request.get_json()

        [valid, errors] = validate(json_input, "host_update_address")
        if not valid:
            return error_response(message="Invalid request", http_status=HTTPStatus.BAD_REQUEST, errors=errors)

        unit_address = json_input.get("unitAddress")
        registration = RegistrationService.get_registration_by_id(registration_id)
        if not registration:
            return error_response(http_status=HTTPStatus.NOT_FOUND, message=ErrorMessage.REGISTRATION_NOT_FOUND.value)
        if (
            registration.registration_type != RegistrationType.HOST.value
            or registration.status != RegistrationStatus.ACTIVE
        ):
            return error_response(
                message="Unit address update is only allowed for active Host type registrations",
                http_status=HTTPStatus.BAD_REQUEST,
            )
        registration = RegistrationService.update_host_unit_address(registration, unit_address, user)
        return jsonify(RegistrationService.serialize(registration)), HTTPStatus.OK
    except Exception as exception:
        logger.error(exception)
        return error_response(message=ErrorMessage.PROCESSING_ERROR.value, http_status=HTTPStatus.INTERNAL_SERVER_ERROR)


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


@bp.route("/permit-validation-registration", methods=("POST",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
@jwt.has_one_of_roles([Role.STRR_EXAMINER.value, Role.SYSTEM.value])
def create_registration_for_permit_validation():
    """
    Create minimum registration for permit validation.
    """
    try:
        json_input = request.get_json()
        registrations = json_input.get("registrations")
        user = UserService.get_or_create_user_by_jwt(g.jwt_oidc_token_info)
        for registration in registrations:
            RegistrationService.create_registration_for_permit_validation(registration, user.id)
        return {}, HTTPStatus.OK
    except Exception as exception:
        logger.error(exception)
        logging.error("Traceback: %s", traceback.format_exc())
        return error_response(message=ErrorMessage.PROCESSING_ERROR.value, http_status=HTTPStatus.INTERNAL_SERVER_ERROR)


@bp.route("/<registration_number>/expiry", methods=("PUT",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
@jwt.has_one_of_roles([Role.STRR_TESTER.value])
def update_expiry_date_for_registration(registration_number):
    """
    Update start date, end date and status of a registration.
    """
    try:
        json_input = request.get_json()
        expiry_date_str = json_input.get("expiryDate")
        UserService.get_or_create_user_by_jwt(g.jwt_oidc_token_info)
        registration = RegistrationService.find_by_registration_number(registration_number)
        if not registration:
            return error_response(http_status=HTTPStatus.NOT_FOUND, message=ErrorMessage.REGISTRATION_NOT_FOUND.value)
        RegistrationService.update_registration_dates(registration=registration, expiry_date=expiry_date_str)
        return jsonify(RegistrationService.serialize(registration)), HTTPStatus.OK
    except Exception as exception:
        logger.error(exception)
        logging.error("Traceback: %s", traceback.format_exc())
        return error_response(message=ErrorMessage.PROCESSING_ERROR.value, http_status=HTTPStatus.INTERNAL_SERVER_ERROR)


@bp.route("/<registration_id>/decision/set-aside", methods=("POST",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
@jwt.has_one_of_roles([Role.STRR_EXAMINER.value, Role.STRR_INVESTIGATOR.value])
def set_aside_decision(registration_id):
    """
    Set aside a registration.
    ---
    tags:
      - examiner
    parameters:
      - in: path
        name: registration_id
        type: integer
        required: true
        description: Registration ID
    responses:
      200:
        description:
      401:
        description:
      403:
        description:
      500:
        description:
    """
    try:
        user = UserService.get_or_create_user_by_jwt(g.jwt_oidc_token_info)
        registration = RegistrationService.get_registration_by_id(registration_id)
        if not registration:
            return error_response(http_status=HTTPStatus.NOT_FOUND, message=ErrorMessage.REGISTRATION_NOT_FOUND.value)
        registration = RegistrationService.set_aside_decision(registration, user)
        return jsonify(RegistrationService.serialize(registration)), HTTPStatus.OK
    except Exception as exception:
        logger.error(exception)
        return error_response(message=ErrorMessage.PROCESSING_ERROR.value, http_status=HTTPStatus.INTERNAL_SERVER_ERROR)


@bp.route("/<registration_id>/notice-of-consideration", methods=("POST",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
@jwt.has_one_of_roles([Role.STRR_EXAMINER.value, Role.STRR_INVESTIGATOR.value])
def send_notice_of_consideration(registration_id):
    """
    Send a Notice of consideration for the specified registration.
    ---
    tags:
      - examiner
    parameters:
      - in: path
        name: registration_id
        type: integer
        required: true
        description: Registration ID
    responses:
      200:
        description:
      401:
        description:
      403:
        description:
      500:
        description:
    """
    try:
        reviewer = UserService.get_or_create_user_by_jwt(g.jwt_oidc_token_info)
        json_input = request.get_json()
        content = json_input.get("content", "").strip()
        if not content:
            return error_response(
                message="NOC content is required",
                http_status=HTTPStatus.BAD_REQUEST,
            )
        registration = RegistrationService.get_registration_by_id(registration_id)
        if not registration:
            return error_response(http_status=HTTPStatus.NOT_FOUND, message=ErrorMessage.REGISTRATION_NOT_FOUND.value)
        if registration.status != RegistrationStatus.ACTIVE:
            return error_response(
                message="Registration should be active to send NOC",
                http_status=HTTPStatus.BAD_REQUEST,
            )
        registration = RegistrationService.send_notice_of_consideration(registration, content, reviewer)
        return jsonify(RegistrationService.serialize(registration)), HTTPStatus.OK
    except Exception as exception:
        logger.error(exception)
        logging.error("Traceback: %s", traceback.format_exc())
        return error_response(message=ErrorMessage.PROCESSING_ERROR.value, http_status=HTTPStatus.INTERNAL_SERVER_ERROR)
