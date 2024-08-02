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

from flasgger import swag_from
from flask import Blueprint, g, jsonify, request
from flask_cors import cross_origin

from strr_api.common.auth import jwt
from strr_api.enums.enum import ErrorMessage, Role
from strr_api.exceptions import (
    AuthException,
    ExternalServiceException,
    ValidationException,
    error_response,
    exception_response,
)
from strr_api.models.dataclass import ApplicationSearch
from strr_api.requests import RegistrationRequest
from strr_api.responses import AutoApprovalRecord, Events, LTSARecord
from strr_api.schemas.utils import validate
from strr_api.services import ApplicationService, ApprovalService, EventsService, LtsaService, UserService, strr_pay
from strr_api.services.application_service import APPLICATION_STATES_STAFF_ACTION, APPLICATION_TERMINAL_STATES
from strr_api.validators.RegistrationRequestValidator import validate_registration_request

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
        json_input["selectedAccount"] = {}
        json_input["selectedAccount"]["sbc_account_id"] = account_id
        [valid, errors] = validate(json_input, "registration")
        if not valid:
            return error_response(message="Invalid request", http_status=HTTPStatus.BAD_REQUEST, errors=errors)

        registration_request = RegistrationRequest(**json_input)

        validate_registration_request(registration_request)

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
            jwt, application.paymentAccount, application.invoice_id
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
@jwt.has_one_of_roles([Role.STAFF.value])
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
@jwt.has_one_of_roles([Role.STAFF.value])
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
@jwt.has_one_of_roles([Role.STAFF.value])
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
