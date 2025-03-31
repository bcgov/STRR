# Copyright © 2025 Province of British Columbia
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
STRR Permit Validation API.
"""

import logging
from http import HTTPStatus

from flask import Blueprint, g, jsonify, request
from flask_cors import cross_origin

from strr_api.common.auth import jwt
from strr_api.exceptions import exception_response
from strr_api.services.user_service import UserService
from strr_api.services.validation_service import ValidationService

logger = logging.getLogger("api")
bp = Blueprint(
    "validation",
    __name__,
)
bp_with_version = Blueprint(
    "validation_with_version",
    __name__,
)


@bp.route("/<path:action>", methods=("POST",))
@bp_with_version.route("/<path:action>", methods=("POST",))
@cross_origin(origin="*")
@jwt.requires_auth
def validate_action(action):
    """Choose the correct validation function to call."""

    class PermitType:
        """Permit Type."""

        single_permit = ":validatePermit"
        batch_permit = ":batchValidate"

    UserService.get_or_create_user_by_jwt(g.jwt_oidc_token_info)

    valid_actions = (PermitType.single_permit, PermitType.batch_permit)

    if action not in valid_actions:
        return jsonify(errors="Invalid action requested."), HTTPStatus.BAD_REQUEST

    match action:
        case PermitType.single_permit:
            return validate_listing()

        case PermitType.batch_permit:
            return validate_batch()

        case _:
            return jsonify(errors="Action not implemented."), HTTPStatus.BAD_REQUEST


def validate_listing():
    """
    If a permit number it specified, the API matches the street number, postal code and unit number (optional)
    in the request with the corresponding details in the permit.
    ---
    tags:
      - validation
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
    """

    try:
        request_json = request.get_json()
        response, status = ValidationService.validate_permit(request_json)
        return response, status

    except Exception as service_exception:
        logger.error(service_exception)
        return exception_response(service_exception)


def validate_batch():
    """
    Validates the batch of permits.
    ---
    tags:
      - validation
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
    """

    try:
        request_json = request.get_json()
        control_dict = request_json.get("controls")
        errors = []
        if not control_dict or not control_dict.get("permitsSubmitted") or not control_dict.get("callBackUrl"):
            errors.append({"code": "INVALID_REQUEST", "message": "'control' object does not have required attributes."})

        permits_dict = request_json.get("permits")

        if control_dict.get("permitsSubmitted") != len(permits_dict):
            errors.append(
                {
                    "code": "INVALID_REQUEST",
                    "message": "Value of 'permitsSubmitted' does not match the number of permits submitted for verification.",  # noqa: E501
                }
            )

        if not permits_dict:
            errors.append({"code": "INVALID_REQUEST", "message": "'permits' object not present in the request."})

        if errors:
            response = {"errors": errors}
            return response, HTTPStatus.BAD_REQUEST

        ValidationService.save_bulk_validation_request(request_json)
        return jsonify({}), HTTPStatus.ACCEPTED

    except Exception as service_exception:
        logger.error(service_exception)
        return exception_response(service_exception)
