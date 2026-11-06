# pylint: disable=protected-access
"""Tests for RegistrationSerializer null handling.

Two contracts share the same helpers:
- Query API (OAS): optional keys are required + nullable -> helpers always emit the full key set.
- GET /registrations/{id} (round-tripped into renewals, JSON schema): optional keys are non-nullable -> nulls stripped.
"""

from datetime import date
from types import SimpleNamespace

import pytest

from strr_api.responses.RegistrationSerializer import RegistrationSerializer, _drop_nulls

ADDRESS = SimpleNamespace(
    street_number="100",
    street_address="Douglas St",
    street_address_additional=None,
    unit_number=None,
    city="Victoria",
    province="BC",
    postal_code="V8W 1W2",
    country="CA",
    location_description=None,
)
CONTACT = SimpleNamespace(
    firstname="Jane",
    lastname="Doe",
    middlename=None,
    preferredname=None,
    job_title=None,
    email="jane@example.com",
    phone_number="2505550199",
    phone_country_code=None,
    phone_extension=None,
    fax_number=None,
    date_of_birth=date(1990, 1, 1),
    social_insurance_number="123 456 789",
    business_number="987654321",
    address=ADDRESS,
)
PROP_CONTACT = SimpleNamespace(contact_type="INDIVIDUAL", contact=CONTACT, business_legal_name=None)


def test_drop_nulls_is_recursive_and_keeps_falsy_values():
    """None is removed at any depth; False, 0 and "" are real values and kept."""
    value = {"a": None, "b": {"c": None, "d": False}, "e": [{"f": None, "g": 0}], "h": ""}
    assert _drop_nulls(value) == {"b": {"d": False}, "e": [{"g": 0}], "h": ""}


@pytest.mark.parametrize(
    "result, expected_keys",
    [
        (
            RegistrationSerializer._serialize_mailing_address(ADDRESS),
            {"address", "addressLineTwo", "city", "province", "postalCode", "country", "locationDescription"},
        ),
        (
            RegistrationSerializer._serialize_unit_address(SimpleNamespace(nickname=None, address=ADDRESS)),
            {"unitNumber", "streetNumber", "streetName", "addressLineTwo", "city", "province", "postalCode"}
            | {"country", "nickname", "locationDescription"},
        ),
        (
            RegistrationSerializer._serialize_person_contact(CONTACT),
            {"firstName", "middleName", "lastName", "preferredName", "jobTitle", "emailAddress", "phoneNumber"}
            | {"phoneCountryCode", "extension", "faxNumber"},
        ),
    ],
)
def test_query_helpers_emit_full_oas_key_set(result, expected_keys):
    """OAS marks these keys required + nullable, so they must be present even when null."""
    assert set(result) == expected_keys


@pytest.mark.parametrize(
    "include_pii, is_primary, expected",
    [
        (
            True,
            True,
            {"dateOfBirth": "1990-01-01", "socialInsuranceNumber": "123 456 789", "businessNumber": "987654321"},
        ),
        (False, True, {"dateOfBirth": None, "socialInsuranceNumber": None, "businessNumber": "987654321"}),
        (False, False, {}),
    ],
)
def test_host_contact_pii_masking(include_pii, is_primary, expected):
    """Masked PII is null (not omitted) for primary; secondary query contacts carry no PII keys."""
    result = RegistrationSerializer._serialize_query_host_contact(
        PROP_CONTACT, include_pii=include_pii, is_primary=is_primary
    )
    pii_keys = {"dateOfBirth", "socialInsuranceNumber", "businessNumber"}
    assert {k: result[k] for k in pii_keys & set(result)} == expected
    assert ("businessLegalName" in result) is is_primary
