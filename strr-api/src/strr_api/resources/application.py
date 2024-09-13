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
STRR Application Resource.
"""

import logging
from http import HTTPStatus
from io import BytesIO

from flasgger import swag_from
from flask import Blueprint, g, jsonify, request, send_file
from flask_cors import cross_origin
from werkzeug.utils import secure_filename

from strr_api.common.auth import jwt
from strr_api.enums.enum import ApplicationRole, ErrorMessage, Role
from strr_api.exceptions import (
    AuthException,
    ExternalServiceException,
    ValidationException,
    error_response,
    exception_response,
)
from strr_api.models.dataclass import ApplicationSearch
from strr_api.responses import AutoApprovalRecord, Events, LTSARecord
from strr_api.schemas.utils import validate
from strr_api.services import (
    AccountService,
    ApplicationService,
    ApprovalService,
    DocumentService,
    EventsService,
    LtsaService,
    UserService,
    strr_pay,
)
from strr_api.services.application_service import (
    APPLICATION_STATES_STAFF_ACTION,
    APPLICATION_TERMINAL_STATES,
    APPLICATION_UNPAID_STATES,
)
from strr_api.validators.DocumentUploadValidator import validate_document_upload
from strr_api.validators.RegistrationRequestValidator import validate_request

logger = logging.getLogger("api")
bp = Blueprint("applications", __name__)


@bp.route("", methods=("POST",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def create_application():
    """
    Create a STRR application.
    ---
    tags:
      - application
    parameters:
      - in: body
        name: body
        schema:
          type: object
    responses:
      201:
        description:
      400:
        description:
      401:
        description:
      502:
        description:
    """

    try:
        account_id = request.headers.get("Account-Id", None)
        json_input = request.get_json()
        [valid, errors] = validate(json_input, "registration")
        if not valid:
            return error_response(message="Invalid request", http_status=HTTPStatus.BAD_REQUEST, errors=errors)
        validate_request(json_input)
        roles = AccountService.list_account_roles(account_id=account_id)
        if not roles:
            AccountService.create_account_roles(account_id, [ApplicationRole.HOST.value])
        application = ApplicationService.save_application(account_id, json_input)
        invoice_details = strr_pay.create_invoice(jwt, account_id, application=application)
        application = ApplicationService.update_application_payment_details_and_status(application, invoice_details)
        return jsonify(ApplicationService.serialize(application)), HTTPStatus.CREATED
    except ValidationException as validation_exception:
        return exception_response(validation_exception)
    except ExternalServiceException as service_exception:
        return exception_response(service_exception)


@bp.route("", methods=("GET",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def get_applications():
    """
    Gets All applications matching the search criteria.
    ---
    tags:
      - application
    parameters:
      - in: header
        name: Account-Id
        required: true
        type: string
    responses:
      200:
        description:
      401:
        description:
      502:
        description:
    """

    try:
        account_id = request.headers.get("Account-Id", None)
        status = request.args.get("status", None)
        page = request.args.get("page", 1)
        limit = request.args.get("limit", 50)
        filter_criteria = ApplicationSearch(status=status, page=int(page), limit=int(limit))
        application_list = ApplicationService.list_applications(account_id, filter_criteria=filter_criteria)
        return jsonify(application_list), HTTPStatus.OK

    except ExternalServiceException as service_exception:
        return exception_response(service_exception)


@bp.route("/<application_id>", methods=("GET",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def get_application_details(application_id):
    """
    Get application details
    ---
    tags:
      - application
    parameters:
      - in: path
        name: application_id
        type: integer
        required: true
        description: Application Id
    responses:
      200:
        description:
      401:
        description:
      403:
        description:
    """

    try:
        application = ApplicationService.get_application(application_id)
        if not application:
            return error_response(HTTPStatus.NOT_FOUND, ErrorMessage.APPLICATION_NOT_FOUND.value)
        return jsonify(ApplicationService.serialize(application)), HTTPStatus.OK
    except AuthException as auth_exception:
        return exception_response(auth_exception)


@bp.route("/<application_id>/payment-details", methods=("PUT",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def update_application_payment_details(application_id):
    """
    Updates the invoice status of a STRR Application.
    ---
    tags:
      - application
    parameters:
      - in: path
        name: application_id
        type: integer
        required: true
        description: ID of the application
      - in: path
        name: invoice_id
        type: integer
        required: true
        description: ID of the invoice
    responses:
      200:
        description:
      401:
        description:
      403:
        description:
      404:
        description:
    """

    try:
        account_id = request.headers.get("Account-Id", None)
        if not account_id:
            return error_response(
                "Account Id is missing.",
                HTTPStatus.BAD_REQUEST,
            )
        application = ApplicationService.get_application(application_id, account_id)
        if not application:
            raise AuthException()
        invoice_details = strr_pay.get_payment_details_by_invoice_id(
            jwt, application.payment_account, application.invoice_id
        )
        application = ApplicationService.update_application_payment_details_and_status(application, invoice_details)
        return jsonify(ApplicationService.serialize(application)), HTTPStatus.OK
    except ExternalServiceException as service_exception:
        return exception_response(service_exception)
    except AuthException as auth_exception:
        return exception_response(auth_exception)


@bp.route("/<application_id>/ltsa", methods=("GET",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
@jwt.has_one_of_roles([Role.STRR_EXAMINER.value, Role.STRR_INVESTIGATOR.value])
def get_application_ltsa(application_id):
    """
    Get application LTSA records
    ---
    tags:
      - examiner
    parameters:
      - in: path
        name: application_id
        type: integer
        required: true
        description: Application Id
    responses:
      200:
        description:
      401:
        description:
      403:
        description:
    """

    try:
        application = ApplicationService.get_application(application_id)
        if not application:
            return error_response(http_status=HTTPStatus.NOT_FOUND, message=ErrorMessage.APPLICATION_NOT_FOUND.value)

        records = LtsaService.get_application_ltsa_records(application_id=application_id)
        return (
            jsonify([LTSARecord.from_db(record).model_dump(mode="json") for record in records]),
            HTTPStatus.OK,
        )
    except Exception as exception:
        return exception_response(exception)


@bp.route("/<application_id>/auto-approval-records", methods=("GET",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
@jwt.has_one_of_roles([Role.STRR_EXAMINER.value, Role.STRR_INVESTIGATOR.value])
def get_application_auto_approval_records(application_id):
    """
    Get application auto approval records
    ---
    tags:
      - examiner
    parameters:
      - in: path
        name: application_id
        type: integer
        required: true
        description: Application Id
    responses:
      200:
        description:
      401:
        description:
      403:
        description:
    """

    try:
        application = ApplicationService.get_application(application_id)
        if not application:
            return error_response(HTTPStatus.NOT_FOUND, ErrorMessage.APPLICATION_NOT_FOUND.value)

        records = ApprovalService.get_approval_records_for_application(application_id)
        return (
            jsonify([AutoApprovalRecord.from_db(record).model_dump(mode="json") for record in records]),
            HTTPStatus.OK,
        )
    except Exception as exception:
        return exception_response(exception)


@bp.route("/<application_id>/events", methods=("GET",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def get_application_events(application_id):
    """
    Get application events.
    ---
    tags:
      - application
    parameters:
      - in: path
        name: application_id
        type: integer
        required: true
        description: Application Id
    responses:
      200:
        description:
      401:
        description:
      403:
        description:
    """

    try:
        account_id = request.headers.get("Account-Id", None)
        applicant_visible_events_only = True
        user = UserService.get_or_create_user_by_jwt(g.jwt_oidc_token_info)
        if user.is_examiner:
            account_id = None
            applicant_visible_events_only = False
        application = ApplicationService.get_application(application_id, account_id)
        if not application:
            return error_response(HTTPStatus.NOT_FOUND, ErrorMessage.APPLICATION_NOT_FOUND.value)

        records = EventsService.fetch_application_events(application_id, applicant_visible_events_only)
        return (
            jsonify([Events.from_db(record).model_dump(mode="json") for record in records]),
            HTTPStatus.OK,
        )
    except Exception as exception:
        logger.error(exception)
        return error_response("ErrorMessage.PROCESSING_ERROR.value", HTTPStatus.INTERNAL_SERVER_ERROR)


@bp.route("/<application_id>/status", methods=("PUT",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
@jwt.has_one_of_roles([Role.STRR_EXAMINER.value])
def update_application_status(application_id):
    """
    Update application status.
    ---
    tags:
      - examiner
    parameters:
      - in: path
        name: application_id
        type: integer
        required: true
        description: Application ID
    responses:
      200:
        description:
      401:
        description:
      403:
        description:
      404:
        description:
    """

    try:
        user = UserService.get_or_create_user_by_jwt(g.jwt_oidc_token_info)
        json_input = request.get_json()
        status = json_input.get("status")
        if not status or status.upper() not in APPLICATION_STATES_STAFF_ACTION:
            return error_response(
                message=ErrorMessage.INVALID_APPLICATION_STATUS.value,
                http_status=HTTPStatus.BAD_REQUEST,
            )
        application = ApplicationService.get_application(application_id)
        if not application:
            return error_response(http_status=HTTPStatus.NOT_FOUND, message=ErrorMessage.APPLICATION_NOT_FOUND.value)
        if application.status in APPLICATION_TERMINAL_STATES:
            return error_response(
                message=ErrorMessage.APPLICATION_TERMINAL_STATE.value,
                http_status=HTTPStatus.BAD_REQUEST,
            )
        application = ApplicationService.update_application_status(application, status.upper(), user)
        return jsonify(ApplicationService.serialize(application)), HTTPStatus.OK
    except Exception as exception:
        logger.error(exception)
        return error_response(ErrorMessage.PROCESSING_ERROR.value, HTTPStatus.INTERNAL_SERVER_ERROR)


@bp.route("/<application_id>/documents", methods=("POST",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def upload_registration_supporting_document(application_id):
    """
    Upload a supporting document for a STRR application.
    ---
    tags:
      - application
    parameters:
      - in: path
        name: application_id
        type: integer
        required: true
        description: Application ID
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
        account_id = request.headers.get("Account-Id", None)
        file = validate_document_upload(request.files)

        # only allow upload for registrations that belong to the user
        application = ApplicationService.get_application(application_id=application_id, account_id=account_id)
        if not application:
            raise AuthException()

        filename = secure_filename(file.filename)

        document = DocumentService.upload_document(filename, file.content_type, file.read())
        return document, HTTPStatus.CREATED
    except AuthException as auth_exception:
        return exception_response(auth_exception)
    except ValidationException as auth_exception:
        return exception_response(auth_exception)
    except ExternalServiceException as service_exception:
        return exception_response(service_exception)


@bp.route("/<application_id>/documents/<file_key>", methods=("GET",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def get_document(application_id, file_key):
    """
    Get document.
    ---
    tags:
      - application
    parameters:
      - in: path
        name: application_id
        type: integer
        required: true
        description: Application Id
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
        # only allow fetch for applications that belong to the user
        application = ApplicationService.get_application(application_id=application_id)
        if not application:
            raise AuthException()
        application_documents = [
            doc
            for doc in application.application_json.get("registration").get("documents", [])
            if doc.get("fileKey") == file_key
        ]
        if not application_documents:
            return error_response(ErrorMessage.DOCUMENT_NOT_FOUND.value, HTTPStatus.BAD_REQUEST)
        document = application_documents[0]
        file_content = DocumentService.get_file_by_key(file_key)
        return send_file(
            BytesIO(file_content),
            as_attachment=True,
            download_name=document.get("fileName"),
            mimetype=document.get("fileType"),
        )
    except AuthException as auth_exception:
        return exception_response(auth_exception)
    except ExternalServiceException as external_exception:
        return exception_response(external_exception)


@bp.route("/<application_id>/documents/<file_key>", methods=("DELETE",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def delete_document(application_id, file_key):
    """
    Delete document.
    ---
    tags:
      - application
    parameters:
      - in: path
        name: application_id
        type: integer
        required: true
        description: Application Id
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
        # only allow upload for registrations that belong to the user
        application = ApplicationService.get_application(application_id=application_id)
        if not application:
            raise AuthException()

        DocumentService.delete_document(file_key)
        return "", HTTPStatus.NO_CONTENT
    except AuthException as auth_exception:
        return exception_response(auth_exception)
    except ExternalServiceException as external_exception:
        return exception_response(external_exception)


@bp.route("/<application_id>/payment/receipt", methods=("GET",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def get_payment_receipt(application_id):
    """
    Get application payment receipt.
    ---
    tags:
      - application
    parameters:
      - in: path
        name: application_id
        type: integer
        required: true
        description: Application Id
    responses:
      200:
        description:
      401:
        description:
    """

    try:
        application = ApplicationService.get_application(application_id=application_id)
        if not application:
            raise AuthException()

        if application.status in APPLICATION_UNPAID_STATES:
            return error_response(ErrorMessage.APPLICATION_NOT_PAID.value, HTTPStatus.BAD_REQUEST)
        return strr_pay.get_payment_receipt(jwt, application)
    except AuthException as auth_exception:
        return exception_response(auth_exception)
    except ExternalServiceException as external_exception:
        return exception_response(external_exception)


@bp.route("/search", methods=("GET",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
@jwt.has_one_of_roles([Role.STRR_EXAMINER.value, Role.STRR_INVESTIGATOR.value])
def search_applications():
    """
    Search Applications.
    ---
    tags:
      - examiner
    parameters:
      - in: query
        name: status
        enum: [PAYMENT_DUE, PAID, AUTO_APPROVED, PROVISIONALLY_APPROVED, FULL_REVIEW_APPROVED, PROVISIONAL_REVIEW, DECLINED]  # noqa: E501
        description: Application Status Filter.
      - in: query
        name: text
        type: string
        minLength: 3
        description: Search text.
      - in: query
        name: page
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

    try:
        UserService.get_or_create_user_by_jwt(g.jwt_oidc_token_info)
        search_text = request.args.get("text", None)
        status = request.args.get("status", None)
        page = request.args.get("page", 1)
        limit = request.args.get("limit", 50)

        if search_text and len(search_text) < 3:
            return error_response(HTTPStatus.BAD_REQUEST, "Search term must be at least 3 characters long.")

        filter_criteria = ApplicationSearch(status=status, page=int(page), limit=int(limit), search_text=search_text)

        application_list = ApplicationService.search_applications(filter_criteria=filter_criteria)
        return jsonify(application_list), HTTPStatus.OK
    except ExternalServiceException as external_exception:
        return exception_response(external_exception)
