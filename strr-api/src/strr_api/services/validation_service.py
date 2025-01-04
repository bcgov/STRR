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
"""Permit Validation Service."""
import copy
from http import HTTPStatus

from strr_api.enums.enum import ErrorMessage, RegistrationType
from strr_api.models import Registration
from strr_api.services.approval_service import ApprovalService
from strr_api.services.registration_service import RegistrationService
from strr_api.utils.date_util import DateUtil


class ValidationService:
    """The class contains methods to validate the listing details."""

    @classmethod
    def validate_listing(cls, request_json):
        """Validate the request. For a request with identifier, only unit number and postal code are
        mandatory. For a request without identifier, street number, streetname, city are mandatory."""

        response = {}

        errors = ValidationService._validate_request(request_json)
        if errors:
            response["errors"] = errors
            return response, HTTPStatus.BAD_REQUEST

        if registration_number := request_json.get("identifier"):
            registration = RegistrationService.find_by_registration_number(registration_number)
            if not registration:
                response["errors"] = [
                    {"code": ErrorMessage.PERMIT_NOT_FOUND.name, "message": ErrorMessage.PERMIT_NOT_FOUND.value}
                ]
                return response, HTTPStatus.NOT_FOUND

            response = ValidationService._check_permit_details(request_json, registration)
        else:
            response = ValidationService._check_strr_requirements_for_listing(request_json.get("address"))

        return response, HTTPStatus.OK

    @classmethod
    def _validate_request(cls, request_json):
        errors = []
        error_message = "Field {0} is missing in the address object."
        identifier = request_json.get("identifier")
        address_json = request_json.get("address")
        if not address_json.get("number"):
            errors.append({"code": "INVALID_REQUEST", "message": error_message.format("number")})
        if not address_json.get("postalCode"):
            errors.append({"code": "INVALID_REQUEST", "message": error_message.format("postalCode")})

        if not identifier:
            if not address_json.get("street"):
                errors.append({"code": "INVALID_REQUEST", "message": error_message.format("street")})
            if not address_json.get("locality"):
                errors.append({"code": "INVALID_REQUEST", "message": error_message.format("locality")})
        return errors

    @classmethod
    def _check_permit_details(cls, request_json: dict, registration: Registration):
        response = {}
        errors = []
        address_json = request_json.get("address")
        if registration.registration_type == RegistrationType.HOST.value:
            if str(address_json.get("number")) != registration.rental_property.address.street_number:
                errors.append(
                    {
                        "code": ErrorMessage.STREET_NUMBER_MISMATCH.name,
                        "message": ErrorMessage.STREET_NUMBER_MISMATCH.value,
                    }
                )
            if address_json.get("postalCode") != registration.rental_property.address.postal_code:
                errors.append(
                    {"code": ErrorMessage.POSTAL_CODE_MISMATCH.name, "message": ErrorMessage.POSTAL_CODE_MISMATCH.value}
                )
        if errors:
            response["errors"] = errors
        else:
            response = copy.deepcopy(request_json)
            response["status"] = registration.status.name
            response["validUntil"] = DateUtil.as_legislation_timezone(registration.expiry_date).strftime("%Y-%m-%d")
        return response

    @classmethod
    def _check_strr_requirements_for_listing(cls, address_json: dict):
        errors = []
        response = {}
        address_line_1 = ""
        if unit_number := address_json.get("unit"):
            address_line_1 = f"{unit_number}-"
        address_line_1 = f"{address_line_1}{address_json.get('number')} {address_json.get('street')}"
        address_line_2 = address_json.get("streetAdditional", "")
        address = f"{address_line_1} {address_line_2}, {address_json.get('locality')}, BC"
        str_data = ApprovalService.getSTRDataForAddress(address=address)
        if str_data:
            response = {"address": address_json}
            if str_data.get("isStrProhibited"):
                response["strProhibited"] = True
            else:
                if str_data.get("isStraaExempt"):
                    response["strExempt"] = True
                else:
                    response["strExempt"] = False
        else:
            errors.append(
                {"code": ErrorMessage.ADDRESS_LOOK_UP_FAILED.name, "message": ErrorMessage.ADDRESS_LOOK_UP_FAILED.value}
            )
            response["errors"] = errors
        return response
