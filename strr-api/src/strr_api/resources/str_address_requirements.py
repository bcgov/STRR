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
Endpoints to get the STR data for addresses.
"""

import logging
from http import HTTPStatus

from flasgger import swag_from
from flask import Blueprint, request
from flask_cors import cross_origin

from strr_api.common.auth import jwt
from strr_api.enums.enum import ErrorMessage
from strr_api.exceptions import ExternalServiceException, error_response
from strr_api.schemas.utils import validate
from strr_api.services.approval_service import ApprovalService

logger = logging.getLogger("api")
bp = Blueprint("str-requirements", __name__)


@bp.route("/requirements", methods=["POST"])
@swag_from({"security": [{"Bearer": []}]})
@cross_origin(origin="*")
@jwt.requires_auth
def get_str_requirements():
    """
    Returns the Short Term Rental requirements for this address.
    ---
    tags:
      - address
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
    """
    try:
        address_json = request.get_json()
        [valid, errors] = validate(address_json, "rental_unit_address")
        if not valid:
            return error_response(message="Invalid request", http_status=HTTPStatus.BAD_REQUEST, errors=errors)
        unit_address = address_json.get("address")
        address_line_1 = ""
        if unit_number := unit_address.get("unitNumber"):
            address_line_1 = f"{unit_number}-"
        address_line_1 = f"{address_line_1}{unit_address.get('streetNumber')} {unit_address.get('streetName')}"
        address_line_2 = unit_address.get("addressLineTwo", "")
        address = f"{address_line_1} {address_line_2}, {unit_address.get('city'), unit_address.get('province')}"
        str_data = ApprovalService.getSTRDataForAddress(address=address)
        if not str_data:
            return error_response(
                message=ErrorMessage.PROCESSING_ERROR.value, http_status=HTTPStatus.SERVICE_UNAVAILABLE
            )
        return ApprovalService.getSTRDataForAddress(address=address), HTTPStatus.OK
    except ExternalServiceException as service_exception:
        logger.error("Error while getting STR requirements", exc_info=service_exception)
        return error_response(service_exception.message, service_exception.status_code)
