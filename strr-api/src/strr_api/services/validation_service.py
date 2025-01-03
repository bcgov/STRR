import copy
from http import HTTPStatus

from strr_api.enums.enum import RegistrationType
from strr_api.models import Registration
from strr_api.services.registration_service import RegistrationService
from strr_api.utils.date_util import DateUtil


class ValidationService:
    @classmethod
    def validate_listing(cls, request_json):
        # Validate the request. For a request with identifier, only unit number and postal code are
        # mandatory. For a request without identifier, street number, streetname, city are mandatory.

        response = {}

        errors = ValidationService._validate_request(request_json)
        if errors:
            response["errors"] = errors
            return response, HTTPStatus.BAD_REQUEST

        if registration_number := request_json.get("identifier"):
            registration = RegistrationService.find_by_registration_number(registration_number)
            if not registration:
                response["errors"] = [
                    {"code": "PERMIT_NOT_FOUND", "message": f"Permit {registration_number} does not exist"}
                ]
                return response, HTTPStatus.NOT_FOUND

            response = ValidationService._check_permit_details(request_json, registration)
        else:
            response = ValidationService._check_strr_requirements_for_listing(request_json.get("address"))

        return response, HTTPStatus.OK

    @classmethod
    def _validate_request(cls, request_json):
        errors = []
        identifier = request_json.get("identifier")
        address_json = request_json.get("address")
        if identifier:
            if not address_json.get("number"):
                errors.append({"code": "INVALID_REQUEST", "message": "Number is missing."})
            if not address_json.get("postalCode"):
                errors.append({"code": "INVALID_REQUEST", "message": "Postal code is missing."})
        return errors

    @classmethod
    def _check_permit_details(cls, request_json: dict, registration: Registration):
        response = {}
        errors = []
        address_json = request_json.get("address")
        if registration.registration_type == RegistrationType.HOST.value:
            if str(address_json.get("number")) != registration.rental_property.address.street_number:
                errors.append({"code": "NUMBER_MISMATCH", "message": "Number mismatch."})
            if address_json.get("postalCode") != registration.rental_property.address.postal_code:
                errors.append({"code": "POSTAL_CODE_MISMATCH", "message": "Postal code mismatch."})
        if errors:
            response["errors"] = errors
        else:
            response = copy.deepcopy(request_json)
            response["status"] = registration.status.name
            response["validUntil"] = DateUtil.as_legislation_timezone(registration.expiry_date).strftime("%Y-%m-%d")
        return response

    @classmethod
    def _check_strr_requirements_for_listing(cls, address_json: dict):
        pass
