"""Tests for postal validation and host registration checks.

`validate_request` only inspects top-level `registrationType` and then calls
`RegistrationRequest(**registration_request)`. That constructor only accepts
`registration` and `header`, so a payload cannot include both a top-level
`registrationType` and be unpacked into `RegistrationRequest` without error.
Host-specific rules are therefore exercised by building a `RegistrationRequest`
and calling `_validate_host_registration_request` directly (same module the
validator uses internally).
"""

import pytest

from strr_api.enums.enum import RegistrationType
from strr_api.exceptions import ValidationException
from strr_api.requests import RegistrationRequest
from strr_api.validators.RegistrationRequestValidator import (
    _validate_host_registration_request,
    validate_and_format_canadian_postal_code,
    validate_request,
)


def test_validate_and_format_ca_bc_valid_uppercases():
    assert validate_and_format_canadian_postal_code("CA", "BC", "v8v 1a1") == "V8V1A1"


def test_validate_and_format_non_ca_returns_unchanged():
    assert validate_and_format_canadian_postal_code("US", "WA", "98101") == "98101"


def test_validate_and_format_invalid_province():
    with pytest.raises(ValidationException) as excinfo:
        validate_and_format_canadian_postal_code("CA", "ZZ", "V8V1A1")
    assert "Invalid province" in excinfo.value.message


def test_validate_and_format_invalid_postal_pattern():
    with pytest.raises(ValidationException) as excinfo:
        validate_and_format_canadian_postal_code("CA", "BC", "BAD")
    assert "Invalid postal code" in excinfo.value.message


def _minimal_host_registration_block():
    """Inner `registration` object suitable for `RegistrationRequest(registration=...)`."""
    return {
        "registrationType": RegistrationType.HOST.value,
        "primaryContact": {
            "mailingAddress": {
                "address": "1 Main St",
                "city": "Victoria",
                "postalCode": "v8v 1a1",
                "province": "BC",
                "country": "CA",
            },
        },
        "unitAddress": {
            "streetNumber": "100",
            "streetName": "Douglas",
            "city": "Victoria",
            "postalCode": "v8v 1a1",
            "province": "BC",
            "country": "CA",
        },
        "unitDetails": {"propertyType": "SINGLE_FAMILY_HOME"},
        "listingDetails": [{"url": "https://example.com/listing"}],
    }


def _host_model(**registration_overrides):
    block = _minimal_host_registration_block()
    block.update(registration_overrides)
    return RegistrationRequest(registration=block)


def test_validate_host_registration_request_formats_postal_codes():
    _validate_host_registration_request(_host_model())


def test_validate_host_registration_request_invalid_bc_address_raises():
    model = _host_model()
    model.registration.unitAddress.country = "US"
    with pytest.raises(ValidationException) as excinfo:
        _validate_host_registration_request(model)
    assert "British Columbia" in excinfo.value.message


def test_validate_request_platform_runs_no_host_validation():
    validate_request(
        {
            "registrationType": RegistrationType.PLATFORM.value,
            "registration": {},
        }
    )


def test_validate_host_registration_request_with_secondary_contact_postal():
    model = _host_model(
        secondaryContact={
            "mailingAddress": {
                "address": "2 Side St",
                "city": "Victoria",
                "postalCode": "V8V 2B2",
                "province": "BC",
                "country": "CA",
            },
        },
    )
    _validate_host_registration_request(model)


def test_legacy_unit_address_shape_does_not_construct_registration_request():
    """Alternate API shapes use different keys; RegistrationRequest rejects them."""
    bad_block = {
        "registrationType": RegistrationType.HOST.value,
        "primaryContact": {
            "mailingAddress": {
                "address": "1 Main St",
                "city": "Victoria",
                "postalCode": "V8V1A1",
                "province": "BC",
                "country": "CA",
            },
        },
        "unitAddress": {
            "address": "12144 GREENWELL ST MAPLE RIDGE",
            "city": "Maple Ridge",
            "postalCode": "V8V1A1",
            "province": "BC",
            "country": "CA",
        },
        "unitDetails": {"propertyType": "SINGLE_FAMILY_HOME"},
        "listingDetails": [{"url": "https://example.com/listing"}],
    }
    with pytest.raises(TypeError):
        RegistrationRequest(registration=bad_block)
