# Copyright © 2023 Province of British Columbia
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
from flask import Blueprint, current_app, g, jsonify, request, send_file
from flask_cors import cross_origin
from werkzeug.utils import secure_filename

from strr_api.common.auth import jwt
from strr_api.enums.enum import PaymentStatus, RegistrationSortBy, RegistrationStatus
from strr_api.exceptions import (
    AuthException,
    ExternalServiceException,
    ValidationException,
    error_response,
    exception_response,
)
from strr_api.models import User
from strr_api.requests import RegistrationRequest
from strr_api.responses import AutoApprovalRecord, Document, EventRecord, Invoice, LTSARecord, Pagination, Registration
from strr_api.schemas.utils import validate
from strr_api.services import (
    ApprovalService,
    EventRecordsService,
    GCPStorageService,
    LtsaService,
    RegistrationService,
    strr_pay,
)
from strr_api.validators.DocumentUploadValidator import validate_document_upload
from strr_api.validators.RegistrationRequestValidator import validate_registration_request

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
        description: Optionally filters results based on SBC Account ID.
      - in: query
        name: filter_by_status
        enum: [PENDING,APPROVED,ISSUED,UNDER_REVIEW,MORE_INFO_NEEDED,PROVISIONAL,DENIED]
        description: Filters affect pagination count returned.
      - in: query
        name: search
        type: string
        minLength: 3
        description: >
          Search for wildcard term: %<search-text>% in Registration#, Location, Address, and Applicant Name.
          Affects pagination count returned. Minimum length of 3 characters.
      - in: query
        name: sort_by
        enum: [REGISTRATION_NUMBER,LOCATION,ADDRESS,NAME,STATUS,SUBMISSION_DATE]
        description: Filters affect pagination count returned.
      - in: query
        name: sort_desc
        type: boolean
        description: false or omitted for ascending, true for descending order.
      - in: query
        name: offset
        type: integer
        default: 0
      - in: query
        name: limit
        type: integer
        default: 100
    responses:
      201:
        description:
      401:
        description:
    """
    account_id = request.headers.get("Account-Id")
    filter_by_status: RegistrationStatus = None
    status_value = request.args.get("filter_by_status", None)
    search = request.args.get("search", None)

    if search and len(search) < 3:
        return error_response(HTTPStatus.BAD_REQUEST, "Search term must be at least 3 characters long.")

    try:
        if status_value is not None:
            filter_by_status = RegistrationStatus[status_value.upper()]
    except ValueError as e:
        current_app.logger.error(f"filter_by_status: {str(e)}")

    sort_by_column: RegistrationSortBy = RegistrationSortBy.ID
    sort_by = request.args.get("sort_by", None)
    try:
        if sort_by is not None:
            sort_by_column = RegistrationSortBy[sort_by.upper()]
    except ValueError as e:
        current_app.logger.error(f"sort_by: {str(e)}")

    sort_desc: bool = request.args.get("sort_desc", "false").lower() == "true"
    offset: int = request.args.get("offset", 0)
    limit: int = request.args.get("limit", 100)

    registrations, count = RegistrationService.list_registrations(
        g.jwt_oidc_token_info, account_id, search, filter_by_status, sort_by_column, sort_desc, offset, limit
    )

    pagination = Pagination(count=count, results=[Registration.from_db(registration) for registration in registrations])
    return (
        jsonify(pagination.model_dump(mode="json")),
        HTTPStatus.OK,
    )


@bp.route("/counts_by_status", methods=("GET",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def get_registration_counts_by_status():
    """
    Get registrations counts by status.
    ---
    tags:
      - examiner
    responses:
      200:
        description:
      401:
        description:
      403:
        description:
    """
    try:
        user = User.get_or_create_user_by_jwt(g.jwt_oidc_token_info)
        if not user or not user.is_examiner():
            raise AuthException()

        counts = RegistrationService.get_registration_counts_by_status()
        results = {}
        for row in counts:
            results[row.status.name] = row.count

        for status in RegistrationStatus:
            if results.get(status.name) is None:
                results[status.name] = 0

        return jsonify(results), HTTPStatus.OK
    except AuthException as auth_exception:
        return exception_response(auth_exception)


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
      403:
        description:
      404:
        description:
    """

    try:
        user = User.get_or_create_user_by_jwt(g.jwt_oidc_token_info)
        if not user:
            raise AuthException()

        registration = RegistrationService.get_registration(g.jwt_oidc_token_info, registration_id)
        if not registration:
            return error_response(HTTPStatus.NOT_FOUND, "Registration not found")

        return jsonify(Registration.from_db(registration).model_dump(mode="json")), HTTPStatus.OK

    except AuthException as auth_exception:
        return exception_response(auth_exception)


@bp.route("", methods=("POST",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def create_registration():
    """
    Create a STRR registration.
    ---
    tags:
      - registration
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
        json_input = request.get_json()
        [valid, errors] = validate(json_input, "registration")
        if not valid:
            raise ValidationException(message=errors)

        registration_request = RegistrationRequest(**json_input)
        selected_account = registration_request.selectedAccount

        # SBC Account lookup
        sbc_account_id = selected_account.sbc_account_id
        validate_registration_request(registration_request)

        registration = RegistrationService.save_registration(
            g.jwt_oidc_token_info, sbc_account_id, registration_request.registration
        )

        strr_pay.create_invoice(jwt, sbc_account_id, registration)
        return jsonify(Registration.from_db(registration).model_dump(mode="json")), HTTPStatus.CREATED
    except ValidationException as auth_exception:
        return exception_response(auth_exception)
    except ExternalServiceException as service_exception:
        return exception_response(service_exception)


@bp.route("/<registration_id>/documents", methods=("POST",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def upload_registration_supporting_document(registration_id):
    """
    Upload a supporting document for a STRR registration.
    ---
    tags:
      - registration
    parameters:
      - in: path
        name: registration_id
        type: integer
        required: true
        description: ID of the registration
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

        # only allow upload for registrations that belong to the user
        registration = RegistrationService.get_registration(g.jwt_oidc_token_info, registration_id)
        if not registration:
            raise AuthException()

        filename = secure_filename(file.filename)

        document = RegistrationService.save_registration_document(
            registration.eligibility.id, filename, file.content_type, file.read()
        )
        return jsonify(Document.from_db(document).model_dump(mode="json")), HTTPStatus.CREATED
    except AuthException as auth_exception:
        return exception_response(auth_exception)
    except ValidationException as auth_exception:
        return exception_response(auth_exception)
    except ExternalServiceException as service_exception:
        return exception_response(service_exception)


@bp.route("/<registration_id>/documents", methods=("GET",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def get_registration_supporting_documents(registration_id):
    """
    Get registration supporting documents for given registration id.
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
        # only allow upload for registrations that belong to the user
        registration = RegistrationService.get_registration(g.jwt_oidc_token_info, registration_id)
        if not registration:
            raise AuthException()

        documents = RegistrationService.get_registration_documents(registration_id)
        return (
            jsonify([Document.from_db(document).model_dump(mode="json") for document in documents]),
            HTTPStatus.OK,
        )
    except AuthException as auth_exception:
        return exception_response(auth_exception)


@bp.route("/<registration_id>/documents/<document_id>", methods=("GET",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def get_registration_supporting_document_by_id(registration_id, document_id):
    """
    Get registration supporting document metadata for given registration id and document id.
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
        name: document_id
        type: integer
        required: true
        description: ID of the document
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
        # only allow upload for registrations that belong to the user
        registration = RegistrationService.get_registration(g.jwt_oidc_token_info, registration_id)
        if not registration:
            raise AuthException()

        document = RegistrationService.get_registration_document(registration_id, document_id)
        if not document:
            return error_response(HTTPStatus.NOT_FOUND, "Document not found")

        return jsonify(Document.from_db(document).model_dump(mode="json")), HTTPStatus.OK
    except AuthException as auth_exception:
        return exception_response(auth_exception)


@bp.route("/<registration_id>/documents/<document_id>/file", methods=("GET",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def get_registration_file_by_id(registration_id, document_id):
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
        name: document_id
        type: integer
        required: true
        description: ID of the document
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

        document = RegistrationService.get_registration_document(registration_id, document_id)
        if not document:
            return error_response(HTTPStatus.NOT_FOUND, "Document not found")

        file_bytes = GCPStorageService.fetch_registration_document(document.path)
        return send_file(
            BytesIO(file_bytes), as_attachment=True, download_name=document.file_name, mimetype=document.file_type
        )
    except AuthException as auth_exception:
        return exception_response(auth_exception)
    except ExternalServiceException as external_exception:
        return exception_response(external_exception)


@bp.route("/<registration_id>/documents/<document_id>", methods=("DELETE",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def delete_registration_supporting_document_by_id(registration_id, document_id):
    """
    Delete registration supporting document for given registration id and document id.
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
        name: document_id
        type: integer
        required: true
        description: ID of the document
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
        registration = RegistrationService.get_registration(g.jwt_oidc_token_info, registration_id)
        if not registration:
            raise AuthException()

        RegistrationService.delete_registration_document(registration_id, document_id)
        return "", HTTPStatus.NO_CONTENT
    except AuthException as auth_exception:
        return exception_response(auth_exception)
    except ExternalServiceException as external_exception:
        return exception_response(external_exception)


@bp.route("/<registration_id>/invoice/<invoice_id>/paid", methods=("POST",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def mark_registration_invoice_paid(registration_id, invoice_id):
    """
    Mark an invoice as paid for a STRR registration.
    ---
    tags:
      - pay
    parameters:
      - in: path
        name: registration_id
        type: integer
        required: true
        description: ID of the registration
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
        token = jwt.get_token_auth_header()
        registration = RegistrationService.get_registration(g.jwt_oidc_token_info, registration_id)
        if not registration:
            raise AuthException()

        invoice = strr_pay.get_invoice_by_id(registration.id, invoice_id)
        if not invoice:
            return error_response(HTTPStatus.NOT_FOUND, "Invoice not found")

        invoice = strr_pay.update_invoice_payment_status(jwt, registration, invoice)
        if invoice.payment_status_code == PaymentStatus.COMPLETED:
            approval = ApprovalService.process_auto_approval(token, registration)
            ApprovalService.save_approval_record(registration.id, approval)

        return jsonify(Invoice.from_db(invoice).model_dump(mode="json")), HTTPStatus.OK
    except ValidationException as auth_exception:
        return exception_response(auth_exception)
    except AuthException as auth_exception:
        return exception_response(auth_exception)


@bp.route("/<registration_id>/invoice/<invoice_id>", methods=("GET",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def get_registration_invoice_status(registration_id, invoice_id):
    """
    Get invoice status for a STRR registration.
    ---
    tags:
      - pay
    parameters:
      - in: path
        name: registration_id
        type: integer
        required: true
        description: ID of the registration
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
        registration = RegistrationService.get_registration(g.jwt_oidc_token_info, registration_id)
        if not registration:
            raise AuthException()

        invoice = strr_pay.get_invoice_by_id(registration.id, invoice_id)
        if not invoice:
            return error_response(HTTPStatus.NOT_FOUND, "Invoice not found")

        return jsonify(Invoice.from_db(invoice).model_dump(mode="json")), HTTPStatus.OK
    except ValidationException as auth_exception:
        return exception_response(auth_exception)
    except AuthException as auth_exception:
        return exception_response(auth_exception)


@bp.route("/<registration_id>/history", methods=("GET",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def get_registration_history(registration_id):
    """
    Get registration supporting documents for given registration id.
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
        user = User.get_or_create_user_by_jwt(g.jwt_oidc_token_info)
        if not user:
            raise AuthException()

        only_show_visible_to_user = not user.is_examiner()
        registration = RegistrationService.get_registration(g.jwt_oidc_token_info, registration_id)
        if not registration:
            raise AuthException()

        records = EventRecordsService.fetch_event_records_for_registration(registration_id, only_show_visible_to_user)
        return (
            jsonify([EventRecord.from_db(record).model_dump(mode="json") for record in records]),
            HTTPStatus.OK,
        )
    except AuthException as auth_exception:
        return exception_response(auth_exception)


@bp.route("/<registration_id>/ltsa", methods=("GET",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def get_registration_ltsa(registration_id):
    """
    Get registration ltsa records
    ---
    tags:
      - examiner
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
        user = User.get_or_create_user_by_jwt(g.jwt_oidc_token_info)
        if not user or not user.is_examiner():
            raise AuthException()

        registration = RegistrationService.get_registration(g.jwt_oidc_token_info, registration_id)
        if not registration:
            return error_response(HTTPStatus.NOT_FOUND, "Registration not found")

        records = LtsaService.get_registration_ltsa_records(registration_id)
        return (
            jsonify([LTSARecord.from_db(record).model_dump(mode="json") for record in records]),
            HTTPStatus.OK,
        )
    except AuthException as auth_exception:
        return exception_response(auth_exception)


@bp.route("/<registration_id>/auto_approval", methods=("GET",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def get_registration_auto_approval(registration_id):
    """
    Get registration auto approval records
    ---
    tags:
      - examiner
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
        user = User.get_or_create_user_by_jwt(g.jwt_oidc_token_info)
        if not user or not user.is_examiner():
            raise AuthException()

        registration = RegistrationService.get_registration(g.jwt_oidc_token_info, registration_id)
        if not registration:
            return error_response(HTTPStatus.NOT_FOUND, "Registration not found")

        records = ApprovalService.get_approval_records_for_registration(registration_id)
        return (
            jsonify([AutoApprovalRecord.from_db(record).model_dump(mode="json") for record in records]),
            HTTPStatus.OK,
        )
    except AuthException as auth_exception:
        return exception_response(auth_exception)


@bp.route("/<registration_id>/approve", methods=("POST",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def approve_registration(registration_id):
    """
    Manually approve a STRR registration.
    ---
    tags:
      - examiner
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
      404:
        description:
    """

    try:
        user = User.get_or_create_user_by_jwt(g.jwt_oidc_token_info)
        if not user or not user.is_examiner():
            raise AuthException()

        registration = RegistrationService.get_registration(g.jwt_oidc_token_info, registration_id)
        if not registration:
            return error_response(HTTPStatus.NOT_FOUND, "Registration not found")

        if registration.status == RegistrationStatus.APPROVED:
            return error_response(HTTPStatus.BAD_REQUEST, "Registration has already been approved.")

        if registration.status == RegistrationStatus.ISSUED:
            return error_response(HTTPStatus.BAD_REQUEST, "Registration has already been issued a certificate.")

        ApprovalService.process_manual_approval(registration)
        return jsonify(Registration.from_db(registration).model_dump(mode="json")), HTTPStatus.OK
    except AuthException as auth_exception:
        return exception_response(auth_exception)


@bp.route("/<registration_id>/issue", methods=("POST",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def issue_registration_certificate(registration_id):
    """
    Manually generate and issue a STRR registration certificate.
    ---
    tags:
      - examiner
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
      404:
        description:
    """

    try:
        user = User.get_or_create_user_by_jwt(g.jwt_oidc_token_info)
        if not user or not user.is_examiner():
            raise AuthException()

        registration = RegistrationService.get_registration(g.jwt_oidc_token_info, registration_id)
        if not registration:
            return error_response(HTTPStatus.NOT_FOUND, "Registration not found")

        if registration.status == RegistrationStatus.ISSUED:
            return error_response(HTTPStatus.BAD_REQUEST, "Registration has already been issued a certificate.")

        if registration.status != RegistrationStatus.APPROVED:
            return error_response(HTTPStatus.BAD_REQUEST, "Registration must be approved before issuing a certificate.")

        ApprovalService.generate_registration_certificate(registration)
        return jsonify(Registration.from_db(registration).model_dump(mode="json")), HTTPStatus.OK
    except AuthException as auth_exception:
        return exception_response(auth_exception)


@bp.route("/<registration_id>/deny", methods=("POST",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def deny_registration(registration_id):
    """
    Manually deny a STRR registration.
    ---
    tags:
      - examiner
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
      404:
        description:
    """

    try:
        user = User.get_or_create_user_by_jwt(g.jwt_oidc_token_info)
        if not user or not user.is_examiner():
            raise AuthException()

        registration = RegistrationService.get_registration(g.jwt_oidc_token_info, registration_id)
        if not registration:
            return error_response(HTTPStatus.NOT_FOUND, "Registration not found")

        ApprovalService.process_manual_denial(registration)
        return jsonify(Registration.from_db(registration).model_dump(mode="json")), HTTPStatus.OK
    except AuthException as auth_exception:
        return exception_response(auth_exception)


@bp.route("/<registration_id>/certificate", methods=("GET",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def get_registration_certificate(registration_id):
    """
    Get latested certificate PDF for a given registration.
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
      404:
        description:
    """

    try:
        # only allow upload for registrations that belong to the user
        registration = RegistrationService.get_registration(g.jwt_oidc_token_info, registration_id)
        if not registration:
            raise AuthException()

        certificate = ApprovalService.get_latest_certificate(registration)
        if not certificate:
            return error_response(HTTPStatus.NOT_FOUND, "Certificate not found")

        return send_file(
            BytesIO(certificate.certificate),
            as_attachment=True,
            download_name="Host Registration Certificate.pdf",
            mimetype="application/pdf",
        )
    except AuthException as auth_exception:
        return exception_response(auth_exception)
