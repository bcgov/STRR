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

# pylint: disable=C0302
"""
STRR Application Resource.
"""

import logging
import traceback
from http import HTTPStatus
from io import BytesIO
from typing import Optional

from flasgger import swag_from
from flask import Blueprint, g, jsonify, request, send_file
from flask_cors import cross_origin
from werkzeug.utils import secure_filename

from strr_api.common.auth import jwt
from strr_api.enums.enum import ErrorMessage, Role
from strr_api.exceptions import (
    AuthException,
    ExternalServiceException,
    ValidationException,
    error_response,
    exception_response,
)
from strr_api.models import Application as ApplicationModel
from strr_api.models import Registration
from strr_api.models.dataclass import ApplicationSearch
from strr_api.responses import AutoApprovalRecord, Events, LTSARecord
from strr_api.schemas.utils import validate
from strr_api.services import (
    ApplicationService,
    ApprovalService,
    DocumentService,
    EventsService,
    LtsaService,
    UserService,
    strr_pay,
)
from strr_api.services.application_service import (
    APPLICATION_ASSIGN_STATES,
    APPLICATION_STATES_STAFF_ACTION,
    APPLICATION_TERMINAL_STATES,
    APPLICATION_UNPAID_STATES,
)
from strr_api.validators.DocumentUploadValidator import validate_document_upload
from strr_api.validators.RegistrationRequestValidator import validate_request

logger = logging.getLogger("api")
bp = Blueprint("applications", __name__)

VALID_SORT_FIELDS = ["application_date", "id", "application_number", "decision_date"]


@bp.route("", methods=("POST",))
@bp.route("/<string:application_number>", methods=["POST", "PUT"])
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def create_application(application_number: Optional[str] = None):
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
      200:
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
        is_draft = request.headers.get("isDraft", False)

        json_input = request.get_json()

        application = None
        if application_number:
            application = ApplicationService.get_application(
                application_number=application_number, account_id=account_id
            )
            if not application:
                return error_response(HTTPStatus.NOT_FOUND, ErrorMessage.APPLICATION_NOT_FOUND.value)
            if application.status != ApplicationModel.Status.DRAFT:
                return error_response(
                    message=ErrorMessage.APPLICATION_NOT_MODIFIABLE.value,
                    http_status=HTTPStatus.BAD_REQUEST,
                )

        # Validate only the final submissions
        if not is_draft:
            [valid, errors] = validate(json_input, "registration")
            if not valid:
                return error_response(message="Invalid request", http_status=HTTPStatus.BAD_REQUEST, errors=errors)
            validate_request(json_input)

        application = ApplicationService.save_application(account_id, json_input, application)

        if not is_draft:
            invoice_details = strr_pay.create_invoice(jwt, account_id, application=application)
            if not invoice_details:
                return error_response(
                    message=ErrorMessage.INVOICE_CREATION_ERROR.value,
                    http_status=HTTPStatus.PAYMENT_REQUIRED,
                )
            application = ApplicationService.update_application_payment_details_and_status(application, invoice_details)

        return jsonify(ApplicationService.serialize(application)), HTTPStatus.OK
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
      - in: query
        name: sortBy
        type: string
        default: id
        description: Field to sort by (e.g., application_date, id, status)
      - in: query
        name: sortOrder
        type: string
        enum: [asc, desc]
        default: desc
        description: Sort order (ascending or descending)
      - in: query
        name: assignee
        type: string
        description: Assignee Filter
      - in: query
        name: requirement
        type: array
        items:
          type: string
        description: Requirement filter
      - in: query
        name: recordNumber
        type: string
        description: Application or Registration Number filter
      - in: query
        name: registrationType
        type: array
        items:
          type: string
          enum: [HOST, PLATFORM, STRATA_HOTEL]
        description: Registration type filter
      - in: query
        name: registrationStatus
        type: array
        items:
          type: string
          enum: [ACTIVE, EXPIRED, SUSPENDED, CANCELLED]
        description: Registration status filter
      - in: query
        name: status
        type: array
        items:
          type: string
        description: Application status filter
      - in: query
        name: page
        type: integer
        default: 1
        description: Page number for pagination
      - in: query
        name: limit
        type: integer
        default: 50
        description: Number of results per page
      - in: query
        name: includeDraft
        type: boolean
        default: true
        description: Include draft applications
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
        status_values = request.args.getlist("status")
        page = request.args.get("page", 1)
        limit = request.args.get("limit", 50)
        registration_types = request.args.getlist("registrationType")
        registration_statuses = request.args.getlist("registrationStatus")
        record_number = request.args.get("recordNumber", None)
        sort_by = request.args.get("sortBy", "id")
        sort_order = request.args.get("sortOrder", "desc")
        assignee = request.args.get("assignee", None)
        requirements = request.args.getlist("requirement", None)
        include_draft = request.args.get("includeDraft", "true").lower() == "true"
        if sort_by not in VALID_SORT_FIELDS:
            sort_by = "id"
        if sort_order not in ["asc", "desc"]:
            sort_order = "desc"
        filter_criteria = ApplicationSearch(
            statuses=status_values,
            page=int(page),
            limit=int(limit),
            registration_types=registration_types,
            registration_statuses=registration_statuses,
            record_number=record_number,
            sort_by=sort_by,
            sort_order=sort_order,
            assignee=assignee,
            requirements=requirements,
            include_draft=include_draft,
        )
        application_list = ApplicationService.list_applications(account_id, filter_criteria=filter_criteria)
        return jsonify(application_list), HTTPStatus.OK

    except ExternalServiceException as service_exception:
        return exception_response(service_exception)


@bp.route("/<application_number>", methods=("GET",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def get_application_details(application_number):
    """
    Get application details
    ---
    tags:
      - application
    parameters:
      - in: path
        name: application_number
        type: string
        required: true
        description: Application Number
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
        application = ApplicationService.get_application(application_number=application_number, account_id=account_id)
        if not application:
            return error_response(http_status=HTTPStatus.NOT_FOUND, message=ErrorMessage.APPLICATION_NOT_FOUND.value)
        return jsonify(ApplicationService.serialize(application)), HTTPStatus.OK
    except AuthException as auth_exception:
        return exception_response(auth_exception)


@bp.route("/<application_number>", methods=("DELETE",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def delete_application(application_number):
    """
    Deletes an application if it is in DRAFT state
    ---
    tags:
      - application
    parameters:
      - in: path
        name: application_number
        type: string
        required: true
        description: Application Number
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
        application = ApplicationService.get_application(application_number=application_number, account_id=account_id)
        if not application:
            return error_response(http_status=HTTPStatus.NOT_FOUND, message=ErrorMessage.APPLICATION_NOT_FOUND.value)
        if application.status != ApplicationModel.Status.DRAFT:
            return error_response(
                message=ErrorMessage.APPLICATION_CANNOT_BE_DELETED.value,
                http_status=HTTPStatus.BAD_REQUEST,
            )
        application.delete()
        return jsonify({}), HTTPStatus.NO_CONTENT
    except AuthException as auth_exception:
        return exception_response(auth_exception)


@bp.route("/<application_number>/payment-details", methods=("PUT",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def update_application_payment_details(application_number):
    """
    Updates the invoice status of a STRR Application.
    ---
    tags:
      - application
    parameters:
      - in: path
        name: application_number
        type: string
        required: true
        description: Application Number
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
                message="Account Id is missing.",
                http_status=HTTPStatus.BAD_REQUEST,
            )
        application = ApplicationService.get_application(application_number, account_id)
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


@bp.route("/<application_number>/ltsa", methods=("GET",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
@jwt.has_one_of_roles([Role.STRR_EXAMINER.value, Role.STRR_INVESTIGATOR.value])
def get_application_ltsa(application_number):
    """
    Get application LTSA records
    ---
    tags:
      - examiner
    parameters:
      - in: path
        name: application_number
        type: string
        required: true
        description: Application Number
    responses:
      200:
        description:
      401:
        description:
      403:
        description:
    """

    try:
        application = ApplicationService.get_application(application_number)
        if not application:
            return error_response(http_status=HTTPStatus.NOT_FOUND, message=ErrorMessage.APPLICATION_NOT_FOUND.value)
        application_id = application.id
        records = LtsaService.get_application_ltsa_records(application_id=application_id)
        return (
            jsonify([LTSARecord.from_db(record).model_dump(mode="json") for record in records]),
            HTTPStatus.OK,
        )
    except Exception as exception:
        return exception_response(exception)


@bp.route("/<application_number>/auto-approval-records", methods=("GET",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
@jwt.has_one_of_roles([Role.STRR_EXAMINER.value, Role.STRR_INVESTIGATOR.value])
def get_application_auto_approval_records(application_number):
    """
    Get application auto approval records
    ---
    tags:
      - examiner
    parameters:
      - in: path
        name: application_number
        type: string
        required: true
        description: Application Number
    responses:
      200:
        description:
      401:
        description:
      403:
        description:
    """

    try:
        application = ApplicationService.get_application(application_number)
        if not application:
            return error_response(HTTPStatus.NOT_FOUND, ErrorMessage.APPLICATION_NOT_FOUND.value)
        application_id = application.id
        records = ApprovalService.get_approval_records_for_application(application_id)
        return (
            jsonify([AutoApprovalRecord.from_db(record).model_dump(mode="json") for record in records]),
            HTTPStatus.OK,
        )
    except Exception as exception:
        return exception_response(exception)


@bp.route("/<application_number>/events", methods=("GET",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def get_application_events(application_number):
    """
    Get application events.
    ---
    tags:
      - application
    parameters:
      - in: path
        name: application_number
        type: string
        required: true
        description: Application Number
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
        UserService.get_or_create_user_by_jwt(g.jwt_oidc_token_info)
        if UserService.is_strr_staff_or_system():
            account_id = None
            applicant_visible_events_only = False
        application = ApplicationService.get_application(application_number=application_number, account_id=account_id)
        application_id = application.id
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


@bp.route("/<application_number>/status", methods=("PUT",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
@jwt.has_one_of_roles([Role.STRR_EXAMINER.value])
def update_application_status(application_number):
    """
    Update application status.
    ---
    tags:
      - examiner
    parameters:
      - in: path
        name: application_number
        type: string
        required: true
        description: Application Number
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
        application = ApplicationService.get_application(application_number)
        if not application:
            return error_response(http_status=HTTPStatus.NOT_FOUND, message=ErrorMessage.APPLICATION_NOT_FOUND.value)
        if application.status in APPLICATION_TERMINAL_STATES and not application.is_set_aside:
            return error_response(
                message=ErrorMessage.APPLICATION_TERMINAL_STATE.value,
                http_status=HTTPStatus.BAD_REQUEST,
            )
        application = ApplicationService.update_application_status(application, status.upper(), user)
        return jsonify(ApplicationService.serialize(application)), HTTPStatus.OK
    except Exception as exception:
        logger.error(exception)
        logger.error(traceback.format_exc())
        return error_response(message=ErrorMessage.PROCESSING_ERROR.value, http_status=HTTPStatus.INTERNAL_SERVER_ERROR)


@bp.route("/<application_number>/str-address", methods=("PATCH",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
@jwt.has_one_of_roles([Role.STRR_EXAMINER.value, Role.STRR_INVESTIGATOR.value])
def update_unit_address(application_number):
    """
    Update the rental unit address for a host application.
    ---
    tags:
      - examiner
    parameters:
      - in: path
        name: application_number
        type: string
        required: true
        description: Application Number
      - in: body
        name: body
        schema:
          type: object
          properties:
            unitAddress:
              type: object
              description: Updated unit address details
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
        json_input = request.get_json()

        [valid, errors] = validate(json_input, "host_update_address")
        if not valid:
            return error_response(message="Invalid request", http_status=HTTPStatus.BAD_REQUEST, errors=errors)

        unit_address = json_input.get("unitAddress")
        application = ApplicationService.get_application(application_number)
        if not application:
            return error_response(http_status=HTTPStatus.NOT_FOUND, message=ErrorMessage.APPLICATION_NOT_FOUND.value)
        if application.registration_type != Registration.RegistrationType.HOST:
            return error_response(
                message="Unit address update is only allowed for Host registration type",
                http_status=HTTPStatus.BAD_REQUEST,
            )
        application = ApplicationService.update_host_unit_address(application, unit_address, user)
        return jsonify(ApplicationService.serialize(application)), HTTPStatus.OK
    except Exception as exception:
        logger.error(exception)
        return error_response(message=ErrorMessage.PROCESSING_ERROR.value, http_status=HTTPStatus.INTERNAL_SERVER_ERROR)


@bp.route("/<application_number>/documents", methods=("POST",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def upload_registration_supporting_document(application_number):
    """
    Upload a supporting document for a STRR application.
    ---
    tags:
      - application
    parameters:
      - in: path
        name: application_number
        type: string
        required: true
        description: Application Number
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
        application = ApplicationService.get_application(application_number=application_number, account_id=account_id)
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


@bp.route("/<application_number>/documents", methods=("PUT",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def update_registration_supporting_document(application_number):
    """
    Upload a supporting document for a STRR application.
    ---
    tags:
      - application
    parameters:
      - in: path
        name: application_number
        type: string
        required: true
        description: Application Number
      - name: file
        in: formData
        type: file
        required: true
        description: The file to upload
    consumes:
      - multipart/form-data
    responses:
      200:
        description:
      400:
        description:
      401:
        description:
    """

    try:
        account_id = request.headers.get("Account-Id", None)
        file = validate_document_upload(request.files)
        document_type = request.form.get("documentType", "")
        upload_step = request.form.get("uploadStep", "")
        upload_date = request.form.get("uploadDate", "")

        # only allow upload for registrations that belong to the user
        application = ApplicationService.get_application(application_number=application_number, account_id=account_id)
        if not application:
            raise AuthException()

        filename = secure_filename(file.filename)

        document = DocumentService.upload_document(filename, file.content_type, file.read())
        document["documentType"] = document_type
        document["uploadStep"] = upload_step
        document["uploadDate"] = upload_date

        application = ApplicationService.update_document_list(application=application, document=document)

        return jsonify(ApplicationService.serialize(application)), HTTPStatus.OK
    except AuthException as auth_exception:
        return exception_response(auth_exception)
    except ValidationException as auth_exception:
        return exception_response(auth_exception)
    except ExternalServiceException as service_exception:
        return exception_response(service_exception)


@bp.route("/<application_number>/documents/<file_key>", methods=("GET",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def get_document(application_number, file_key):
    """
    Get document.
    ---
    tags:
      - application
    parameters:
      - in: path
        name: application_number
        type: string
        required: true
        description: Application Number
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
        account_id = request.headers.get("Account-Id", None)
        application = ApplicationService.get_application(application_number=application_number, account_id=account_id)
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


@bp.route("/<application_number>/documents/<file_key>", methods=("DELETE",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def delete_document(application_number, file_key):
    """
    Delete document.
    ---
    tags:
      - application
    parameters:
      - in: path
        name: application_number
        type: string
        required: true
        description: Application Number
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
        account_id = request.headers.get("Account-Id", None)
        application = ApplicationService.get_application(application_number=application_number, account_id=account_id)
        if not application:
            raise AuthException()

        DocumentService.delete_document(file_key)
        return "", HTTPStatus.NO_CONTENT
    except AuthException as auth_exception:
        return exception_response(auth_exception)
    except ExternalServiceException as external_exception:
        return exception_response(external_exception)


@bp.route("/<application_number>/payment/receipt", methods=("GET",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def get_payment_receipt(application_number):
    """
    Get application payment receipt.
    ---
    tags:
      - application
    parameters:
      - in: path
        name: application_number
        type: string
        required: true
        description: Application Number
    responses:
      200:
        description:
      401:
        description:
    """

    try:
        account_id = request.headers.get("Account-Id", None)
        application = ApplicationService.get_application(application_number=application_number, account_id=account_id)
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
        type: array
        items:
          type: string
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
      - in: query
        name: recordNumber
        type: string
        description: Application or Registration Number filter
      - in: query
        name: registrationStatus
        type: array
        items:
          type: string
          enum: [ACTIVE, EXPIRED, SUSPENDED, CANCELLED]
        description: Registration status filter
      - in: query
        name: registrationType
        type: array
        items:
          type: string
          enum: [HOST, PLATFORM, STRATA_HOTEL]
        description: Registration type filter
      - in: query
        name: sortBy
        type: string
        default: id
        description: Field to sort by (e.g., application_date, id, status)
      - in: query
        name: sortOrder
        type: string
        enum: [asc, desc]
        default: desc
        description: Sort order (ascending or descending)
      - in: query
        name: assignee
        type: string
        description: Assignee Filter
      - in: query
        name: requirement
        type: array
        items:
          type: string
        description: Requirement filter
    responses:
      200:
        description:
      401:
        description:
    """

    try:
        UserService.get_or_create_user_by_jwt(g.jwt_oidc_token_info)
        search_text = request.args.get("text", None)
        status_values = request.args.getlist("status")
        page = request.args.get("page", 1)
        limit = request.args.get("limit", 50)
        record_number = request.args.get("recordNumber", None)
        registration_statuses = request.args.getlist("registrationStatus")
        registration_types = request.args.getlist("registrationType")
        sort_by = request.args.get("sortBy", "id")
        sort_order = request.args.get("sortOrder", "desc")
        assignee = request.args.get("assignee", None)
        requirements = request.args.getlist("requirement", None)
        if sort_by not in VALID_SORT_FIELDS:
            sort_by = "id"
        if sort_order not in ["asc", "desc"]:
            sort_order = "desc"
        if search_text and len(search_text) < 3:
            return error_response(HTTPStatus.BAD_REQUEST, "Search term must be at least 3 characters long.")

        filter_criteria = ApplicationSearch(
            statuses=status_values,
            page=int(page),
            limit=int(limit),
            search_text=search_text,
            record_number=record_number,
            registration_statuses=registration_statuses,
            registration_types=registration_types,
            sort_by=sort_by,
            sort_order=sort_order,
            assignee=assignee,
            requirements=requirements,
        )

        application_list = ApplicationService.search_applications(filter_criteria=filter_criteria)
        return jsonify(application_list), HTTPStatus.OK
    except ExternalServiceException as external_exception:
        return exception_response(external_exception)


@bp.route("/<application_number>/host/related-registrations", methods=("GET",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
@jwt.has_one_of_roles([Role.STRR_EXAMINER.value, Role.STRR_INVESTIGATOR.value])
def get_related_registrations(application_number: str):
    """
    Get existing host registrations for the application number.
    ---
    tags:
      - application, registration
    parameters:
      - in: path
        name: application_number
        type: string
        required: true
        description: Application Number
    responses:
      200:
        description:
      401:
        description:
    """

    try:
        account_id = request.headers.get("Account-Id", None)
        application = ApplicationService.get_application(application_number=application_number, account_id=account_id)
        if not application:
            raise AuthException()

        if application.registration_type != Registration.RegistrationType.HOST:
            raise ValidationException(message="This application is an invalid registration type for this endpoint.")

        existing_host_registrations = ApplicationService.get_existing_host_registrations(application)
        return jsonify(existing_host_registrations), HTTPStatus.OK
    except AuthException as auth_exception:
        return exception_response(auth_exception)
    except ValidationException as validation_exception:
        return exception_response(validation_exception)
    except ExternalServiceException as external_exception:
        return exception_response(external_exception)


@bp.route("/<application_number>/notice-of-consideration", methods=("POST",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
@jwt.has_one_of_roles([Role.STRR_EXAMINER.value, Role.STRR_INVESTIGATOR.value])
def send_notice_of_consideration(application_number: str):
    """
    Send a Notice of consideration for the specified application.
    ---
    tags:
      - application
    parameters:
      - in: path
        name: application_number
        type: string
        required: true
        description: Application Number
    responses:
      200:
        description:
      401:
        description:
    """
    try:
        reviewer = UserService.get_or_create_user_by_jwt(g.jwt_oidc_token_info)
        json_input = request.get_json()
        content = json_input.get("content", "").strip()
        if not content:
            return error_response(
                message=ErrorMessage.INVALID_NOC_CONTENT.value,
                http_status=HTTPStatus.BAD_REQUEST,
            )
        application = ApplicationService.get_application(application_number)
        if not application:
            return error_response(http_status=HTTPStatus.NOT_FOUND, message=ErrorMessage.APPLICATION_NOT_FOUND.value)
        application = ApplicationService.send_notice_of_consideration(application, content, reviewer)
        return jsonify(ApplicationService.serialize(application)), HTTPStatus.OK
    except Exception:
        logger.error("Error in sending NoC: ", exc_info=True)
        return error_response(message=ErrorMessage.PROCESSING_ERROR.value, http_status=HTTPStatus.INTERNAL_SERVER_ERROR)


@bp.route("/<application_number>/assign", methods=("PUT",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
@jwt.has_one_of_roles([Role.STRR_EXAMINER.value, Role.STRR_INVESTIGATOR.value])
def assign_application(application_number: str):
    """
    Update the reviewer of an application.
    ---
    tags:
      - examiner
    parameters:
      - in: path
        name: application_number
        type: string
        required: true
        description: Application Number
    responses:
      200:
        description:
      401:
        description:
    """
    try:
        user = UserService.get_or_create_user_by_jwt(g.jwt_oidc_token_info)
        if not user:
            raise AuthException()

        application = ApplicationService.get_application(application_number)
        if not application:
            return error_response(http_status=HTTPStatus.NOT_FOUND, message=ErrorMessage.APPLICATION_NOT_FOUND.value)
        if not application.status or application.status.upper() not in APPLICATION_ASSIGN_STATES:
            return error_response(
                message=ErrorMessage.APPLICATION_ASSIGN_STATUS.value,
                http_status=HTTPStatus.BAD_REQUEST,
            )

        application = ApplicationService.assign_application(application, user.id)
        return jsonify(ApplicationService.serialize(application)), HTTPStatus.OK
    except Exception:
        logger.error("Error assigning application reviewer: ", exc_info=True)
        return error_response(message=ErrorMessage.PROCESSING_ERROR.value, http_status=HTTPStatus.INTERNAL_SERVER_ERROR)


@bp.route("/<application_number>/unassign", methods=("PUT",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
@jwt.has_one_of_roles([Role.STRR_EXAMINER.value, Role.STRR_INVESTIGATOR.value])
def unassign_application(application_number: str):
    """
    Unassign the reviewer from an application.
    ---
    tags:
      - examiner
    parameters:
      - in: path
        name: application_number
        type: string
        required: true
        description: Application Number
    responses:
      200:
        description:
      401:
        description:
    """
    try:
        user = UserService.get_or_create_user_by_jwt(g.jwt_oidc_token_info)
        if not user:
            raise AuthException()

        application = ApplicationService.get_application(application_number)
        if not application:
            return error_response(http_status=HTTPStatus.NOT_FOUND, message=ErrorMessage.APPLICATION_NOT_FOUND.value)
        if not application.status or application.status.upper() not in APPLICATION_ASSIGN_STATES:
            return error_response(
                message=ErrorMessage.APPLICATION_ASSIGN_STATUS.value,
                http_status=HTTPStatus.BAD_REQUEST,
            )
        if not application.reviewer_id:
            return error_response(
                message="Application is not assigned to any reviewer",
                http_status=HTTPStatus.BAD_REQUEST,
            )

        application = ApplicationService.unassign_application(application, user.id)
        return jsonify(ApplicationService.serialize(application)), HTTPStatus.OK
    except Exception:
        logger.error("Error unassigning application reviewer: ", exc_info=True)
        return error_response(message=ErrorMessage.PROCESSING_ERROR.value, http_status=HTTPStatus.INTERNAL_SERVER_ERROR)


@bp.route("/<application_number>/is-assignee", methods=["GET"])
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
@jwt.has_one_of_roles([Role.STRR_EXAMINER.value, Role.STRR_INVESTIGATOR.value])
def is_current_user_assignee(application_number: str):
    """
    Check if the current user is the assignee for the provided application number.
    ---
    tags:
      - examiner
    parameters:
      - in: path
        name: application_number
        type: string
        required: true
        description: Application Number
    responses:
      200:
        description:
      401:
        description:
    """
    try:
        user = UserService.get_or_create_user_by_jwt(g.jwt_oidc_token_info)
        if not user:
            raise AuthException()

        application = ApplicationService.get_application(application_number)
        if not application:
            return error_response(http_status=HTTPStatus.NOT_FOUND, message=ErrorMessage.APPLICATION_NOT_FOUND.value)
        is_assignee = application.reviewer_id == user.id
        return jsonify({"is_assignee": is_assignee}), HTTPStatus.OK
    except Exception:
        logger.error("Error checking if user is assignee: ", exc_info=True)
        return error_response(message=ErrorMessage.PROCESSING_ERROR.value, http_status=HTTPStatus.INTERNAL_SERVER_ERROR)


@bp.route("/<application_number>/decision/set-aside", methods=("POST",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
@jwt.has_one_of_roles([Role.STRR_EXAMINER.value, Role.STRR_INVESTIGATOR.value])
def set_aside_decision(application_number):
    """
    Set aside the decision for an application.
    ---
    tags:
      - examiner
    parameters:
      - in: path
        name: application_number
        type: string
        required: true
        description: Application Number
      - in: body
        name: body
        schema:
          type: object
          properties:
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
        request_json = request.get_json()
        content = request_json.get("content", "").strip()
        if not content:
            return error_response(
                message=ErrorMessage.INVALID_SET_ASIDE_EMAIL_CONTENT.value,
                http_status=HTTPStatus.BAD_REQUEST,
            )
        application = ApplicationService.get_application(application_number)
        if not application:
            return error_response(http_status=HTTPStatus.NOT_FOUND, message=ErrorMessage.APPLICATION_NOT_FOUND.value)
        application = ApplicationService.set_aside_decision(application, request_json, user)
        return jsonify(ApplicationService.serialize(application)), HTTPStatus.OK
    except Exception as exception:
        logger.error(exception)
        return error_response(message=ErrorMessage.PROCESSING_ERROR.value, http_status=HTTPStatus.INTERNAL_SERVER_ERROR)
