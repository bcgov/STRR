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
Endpoints to manage the user account.
"""

import logging
from http import HTTPStatus

from flasgger import swag_from
from flask import Blueprint, g, jsonify, request
from flask_cors import cross_origin

from strr_api.common.auth import jwt
from strr_api.exceptions import ExternalServiceException, ValidationException, error_response, exception_response
from strr_api.requests import SBCAccountCreationRequest
from strr_api.responses import SBCAccount
from strr_api.schemas.utils import validate
from strr_api.services import AuthService, UserService

logger = logging.getLogger("api")
bp = Blueprint("account", __name__)


@bp.route("/search", methods=["GET"])
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def search_accounts():
    """Find accounts matching the search criteria."""
    try:
        account_name = request.args.get("name", None)
        if not account_name:
            return error_response(
                message="Account Id is missing.",
                http_status=HTTPStatus.BAD_REQUEST,
            )
        return AuthService.search_accounts(account_name=account_name), HTTPStatus.OK
    except ExternalServiceException as service_exception:
        return error_response(service_exception.message, service_exception.status_code)


@bp.route("/", methods=("GET",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def get_user_accounts():
    """
    Get current user's accounts.
    ---
    tags:
      - users
    responses:
      200:
        description:
      401:
        description:
      502:
        description:
    """
    try:
        token = jwt.get_token_auth_header()
        return AuthService.get_user_accounts(bearer_token=token), HTTPStatus.OK
    except ExternalServiceException as service_exception:
        return error_response(service_exception.message, service_exception.status_code)


@bp.route("/", methods=("POST",))
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def create_user_account():
    """
    Create an SBC account for the current user.
    ---
    tags:
      - users
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
        token = jwt.get_token_auth_header()
        json_input = request.get_json()
        [valid, errors] = validate(json_input, "create_sbc_account")
        if not valid:
            raise ValidationException(message=errors)

        sbc_account_creation_request = SBCAccountCreationRequest(**json_input)
        user = UserService.get_or_create_user_by_jwt(g.jwt_oidc_token_info)
        new_account = AuthService.create_user_account(token, sbc_account_creation_request)
        sbc_account_id = new_account.get("id")

        AuthService.add_contact_info(token, sbc_account_id, sbc_account_creation_request)

        return (
            jsonify(SBCAccount(user_id=user.id, sbc_account_id=sbc_account_id).model_dump(mode="json")),
            HTTPStatus.CREATED,
        )
    except ValidationException as auth_exception:
        return exception_response(auth_exception)
    except ExternalServiceException as service_exception:
        return exception_response(service_exception)
