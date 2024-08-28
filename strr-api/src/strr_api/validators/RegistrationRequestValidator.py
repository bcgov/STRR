"""Validator for registration requests."""
import re

from strr_api.enums.enum import RegistrationType
from strr_api.exceptions import ValidationException
from strr_api.requests import RegistrationRequest


def validate_request(registration_request: dict):
    """Validates a registration request."""
    if registration_request.get("registrationType") == RegistrationType.HOST.value:
        registration_request = RegistrationRequest(**registration_request)
        _validate_host_registration_request(registration_request)
    elif registration_request.get("registrationType") == RegistrationType.PLATFORM.value:
        _validate_platform_registration_request(registration_request)


def _validate_platform_registration_request(registration_request: dict) -> None:
    pass


def _validate_host_registration_request(registration_request: RegistrationRequest) -> None:
    """Validate the registration request."""
    # DO POSTAL CODE VALIDATION IF COUNTRY IS CANADA
    registration_request.registration.unitAddress.postalCode = validate_and_format_canadian_postal_code(
        registration_request.registration.unitAddress.country,
        registration_request.registration.unitAddress.province,
        registration_request.registration.unitAddress.postalCode,
    )

    if (
        registration_request.registration.unitAddress.country != "CA"
        or registration_request.registration.unitAddress.province != "BC"
    ):
        raise ValidationException(message="Invalid Rental Unit Address. Location must be in British Columbia.")

    registration_request.registration.primaryContact.mailingAddress.postalCode = (
        validate_and_format_canadian_postal_code(
            registration_request.registration.primaryContact.mailingAddress.country,
            registration_request.registration.primaryContact.mailingAddress.province,
            registration_request.registration.primaryContact.mailingAddress.postalCode,
        )
    )

    if registration_request.registration.secondaryContact:
        registration_request.registration.secondaryContact.mailingAddress.postalCode = (
            validate_and_format_canadian_postal_code(
                registration_request.registration.secondaryContact.mailingAddress.country,
                registration_request.registration.secondaryContact.mailingAddress.province,
                registration_request.registration.secondaryContact.mailingAddress.postalCode,
            )
        )


def validate_and_format_canadian_postal_code(country: str, province: str, postal_code: str):
    """Validate and format a Canadian postal code."""

    if country == "CA":
        if province not in ["BC", "AB", "SK", "MB", "ON", "QC", "NB", "PE", "NS", "NL", "YT", "NT", "NU"]:
            raise ValidationException(
                message="Invalid province. Must be one of 'BC', 'AB', 'SK', 'MB', 'ON', 'QC', "
                + "'NB', 'PE', 'NS', 'NL', 'YT', 'NT', 'NU'"
            )

        regex = r"^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$"
        match = re.match(regex, postal_code)
        if match:
            return postal_code.upper().replace(" ", "")
        else:
            raise ValidationException(message="Invalid postal code. Must be in the format 'A1A 1A1' or 'A1A1A1'")

    return postal_code
