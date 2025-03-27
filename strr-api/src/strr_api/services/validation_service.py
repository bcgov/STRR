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
import json
import re
from datetime import datetime
from http import HTTPStatus

from flask import current_app

from strr_api.enums.enum import ErrorMessage, RegistrationStatus, RegistrationType
from strr_api.models import BulkValidation, RealTimeValidation, Registration
from strr_api.schemas.utils import validate
from strr_api.services.gcp_storage_service import GCPStorageService
from strr_api.services.registration_service import RegistrationService
from strr_api.utils.date_util import DateUtil


class ValidationService:
    """The class contains methods to validate the permit details."""

    @classmethod
    def validate_permit(cls, request_json):
        """Validate the details in the request against the data in the permit.
        Street number and postal code are mandatory fields. If the optional unit number
        is present in the request, it will validated against the permit unit number."""

        response = {}
        status_code = HTTPStatus.OK

        [valid, errors] = validate(request_json, "real_time_validation")

        if not valid:
            response["errors"] = errors
            status_code = HTTPStatus.BAD_REQUEST

        else:
            registration = RegistrationService.find_by_registration_number(request_json.get("identifier"))
            if registration:
                response = ValidationService.check_permit_details(request_json, registration)
            else:
                response["errors"] = [
                    {"code": ErrorMessage.PERMIT_NOT_FOUND.name, "message": ErrorMessage.PERMIT_NOT_FOUND.value}
                ]
                status_code = HTTPStatus.NOT_FOUND

        ValidationService.create_real_time_validation_audit_record(request_json, response, status_code)

        return response, status_code

    @classmethod
    def check_permit_details(cls, request_json: dict, registration: Registration):  # pylint: disable=R0912
        """Checks the data in the request against the permit details."""
        response = copy.deepcopy(request_json)
        if registration.status != RegistrationStatus.ACTIVE:
            response["status"] = registration.status.name
            return response
        errors = []
        address_json = request_json.get("address")
        if registration.registration_type == RegistrationType.HOST.value:
            if (
                registration.rental_property.address.street_number
                and str(address_json.get("streetNumber")) != registration.rental_property.address.street_number
            ):
                errors.append(
                    {
                        "code": ErrorMessage.STREET_NUMBER_MISMATCH.name,
                        "message": ErrorMessage.STREET_NUMBER_MISMATCH.value,
                    }
                )
            if address_json.get("postalCode", "").replace(
                " ", ""
            ) != registration.rental_property.address.postal_code.replace(" ", ""):
                errors.append(
                    {"code": ErrorMessage.POSTAL_CODE_MISMATCH.name, "message": ErrorMessage.POSTAL_CODE_MISMATCH.value}
                )

            if unit_number := address_json.get("unitNumber", None):
                if unit_number != registration.rental_property.address.unit_number:
                    errors.append(
                        {
                            "code": ErrorMessage.UNIT_NUMBER_MISMATCH.name,
                            "message": ErrorMessage.UNIT_NUMBER_MISMATCH.value,
                        }
                    )

        if registration.registration_type == RegistrationType.STRATA_HOTEL.value:
            match_found = False
            strata_hotel = registration.strata_hotel_registration.strata_hotel
            location = strata_hotel.location

            if str(address_json.get("streetNumber")) == str(
                cls._extract_street_number(cls._get_text_after_hyphen(location.street_address))
            ) and address_json.get("postalCode", "").replace(" ", "") == location.postal_code.replace(" ", ""):
                match_found = True

            if not match_found:
                for building in strata_hotel.buildings:
                    if str(address_json.get("streetNumber")) == str(
                        cls._extract_street_number(cls._get_text_after_hyphen(building.address.street_address))
                    ) and address_json.get("postalCode", "").replace(" ", "") == building.address.postal_code.replace(
                        " ", ""
                    ):
                        match_found = True
                        break

            if not match_found:
                errors.append(
                    {
                        "code": ErrorMessage.ADDRESS_MISMATCH.name,
                        "message": ErrorMessage.ADDRESS_MISMATCH.value,
                    }
                )

        if errors:
            response["errors"] = errors
        else:
            response["status"] = registration.status.name
            response["validUntil"] = DateUtil.as_legislation_timezone(registration.expiry_date).strftime("%Y-%m-%d")
        return response

    @classmethod
    def _get_text_after_hyphen(cls, address_line):
        if "-" in address_line:
            return address_line.split("-", 1)[1].strip()
        return address_line

    @classmethod
    def _extract_street_number(cls, address):
        street_number = ""
        match = re.match(r"(\d+)", address)
        if match:
            street_number = match.group(1)
        return street_number

    @classmethod
    def save_bulk_validation_request(cls, request_json):
        """Uploads the request to cloud storage and creates an entry in the db."""

        bucket_id = current_app.config.get("BULK_VALIDATION_REQUESTS_BUCKET")
        file_key = GCPStorageService.upload_file(
            file_type="application/json", file_contents=json.dumps(request_json), bucket_id=bucket_id
        )
        bulk_validation = BulkValidation()
        bulk_validation.request_file_id = file_key
        bulk_validation.request_timestamp = datetime.utcnow()
        bulk_validation.save()

    @classmethod
    def create_real_time_validation_audit_record(cls, request, response, status):
        """Creates the real time validation audit record."""

        real_time_validation = RealTimeValidation()
        real_time_validation.request_json = request
        real_time_validation.response_json = response
        real_time_validation.status_code = status
        real_time_validation.save()
