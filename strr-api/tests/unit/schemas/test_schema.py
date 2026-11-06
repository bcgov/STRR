import json
import os

from strr_api.schemas import utils

REGISTRATION_SCHEMA = "registration"

HOST_REGISTRATION_REQUEST = os.path.join(
    os.path.dirname(os.path.realpath(__file__)), "../../mocks/json/host_registration.json"
)
PLATFORM_REGISTRATION_REQUEST = os.path.join(
    os.path.dirname(os.path.realpath(__file__)), "../../mocks/json/platform_registration.json"
)


def test_get_host_registration_schema():
    schema_store = utils.get_schema(f"{REGISTRATION_SCHEMA}.json")
    assert schema_store is not None


def test_validate_host_registration_schema_valid():
    with open(HOST_REGISTRATION_REQUEST) as f:
        data = json.load(f)
        valid, error = utils.validate_schema(data, f"{REGISTRATION_SCHEMA}")
        assert valid
        assert not error


def test_validate_host_schema_error_missing_unit_details():
    with open(HOST_REGISTRATION_REQUEST) as f:
        data = json.load(f)
        del data["registration"]["unitDetails"]
        valid, error = utils.validate_schema(data, f"{REGISTRATION_SCHEMA}")
        assert not valid
        assert error


def test_validate_host_schema_error_missing_primary_contact():
    with open(HOST_REGISTRATION_REQUEST) as f:
        data = json.load(f)
        del data["registration"]["primaryContact"]
        valid, error = utils.validate_schema(data, f"{REGISTRATION_SCHEMA}")
        assert not valid
        assert error


def test_validate_host_schema_error_missing_unit_address():
    with open(HOST_REGISTRATION_REQUEST) as f:
        data = json.load(f)
        del data["registration"]["unitAddress"]
        valid, error = utils.validate_schema(data, f"{REGISTRATION_SCHEMA}")
        assert not valid
        assert error


def test_validate_platform_registration_schema_valid():
    with open(PLATFORM_REGISTRATION_REQUEST) as f:
        data = json.load(f)
        valid, error = utils.validate_schema(data, f"{REGISTRATION_SCHEMA}")
        assert valid
        assert not error


def test_validate_platform_registration_schema_error_no_representatives():
    with open(PLATFORM_REGISTRATION_REQUEST) as f:
        data = json.load(f)
        del data["registration"]["platformRepresentatives"]
        valid, error = utils.validate_schema(data, f"{REGISTRATION_SCHEMA}")
        assert not valid
        assert error


def test_validate_platform_registration_schema_error_no_business_details():
    with open(PLATFORM_REGISTRATION_REQUEST) as f:
        data = json.load(f)
        del data["registration"]["businessDetails"]
        valid, error = utils.validate_schema(data, f"{REGISTRATION_SCHEMA}")
        assert not valid
        assert error


def test_validate_platform_registration_schema_error_no_platform_details():
    with open(PLATFORM_REGISTRATION_REQUEST) as f:
        data = json.load(f)
        del data["registration"]["platformDetails"]
        valid, error = utils.validate_schema(data, f"{REGISTRATION_SCHEMA}")
        assert not valid
        assert error


def test_validate_host_schema_omitted_location_description_accepted():
    """Host registration schema must accept omitted locationDescription on mailingAddress and unitAddress."""
    with open(HOST_REGISTRATION_REQUEST) as f:
        data = json.load(f)
        data["registration"]["primaryContact"]["mailingAddress"].pop("locationDescription", None)
        data["registration"]["unitAddress"].pop("locationDescription", None)
        valid, error = utils.validate_schema(data, f"{REGISTRATION_SCHEMA}")
        assert valid
        assert not error


def test_validate_host_schema_null_location_description_rejected():
    """Strict host registration schema must reject null locationDescription."""
    with open(HOST_REGISTRATION_REQUEST) as f:
        data = json.load(f)
        data["registration"]["primaryContact"]["mailingAddress"]["locationDescription"] = None
        valid, error = utils.validate_schema(data, f"{REGISTRATION_SCHEMA}")
        assert not valid
        assert error


def test_validate_host_schema_string_location_description_accepted():
    """Host registration schema must accept string locationDescription on mailingAddress and unitAddress."""
    with open(HOST_REGISTRATION_REQUEST) as f:
        data = json.load(f)
        data["registration"]["primaryContact"]["mailingAddress"]["locationDescription"] = "Suite 100"
        data["registration"]["unitAddress"]["locationDescription"] = "Corner of Main & 1st"
        valid, error = utils.validate_schema(data, f"{REGISTRATION_SCHEMA}")
        assert valid
        assert not error


def test_validate_host_update_address_omitted_and_null_location_description():
    """host_update_address schema accepts omitted locationDescription and rejects null."""
    payload_omitted = {
        "unitAddress": {
            "streetNumber": "123",
            "streetName": "Main St",
            "city": "Vancouver",
            "postalCode": "V6B 1A1",
            "province": "BC",
        }
    }
    valid, error = utils.validate_schema(payload_omitted, "host_update_address")
    assert valid
    assert not error

    payload_null = {
        "unitAddress": {
            "streetNumber": "123",
            "streetName": "Main St",
            "city": "Vancouver",
            "postalCode": "V6B 1A1",
            "province": "BC",
            "locationDescription": None,
        }
    }
    valid, error = utils.validate_schema(payload_null, "host_update_address")
    assert not valid
    assert error


def test_validate_rental_unit_address_omitted_and_null_location_description():
    """rental_unit_address schema accepts omitted locationDescription and rejects null."""
    payload_omitted = {
        "address": {
            "streetNumber": "123",
            "streetName": "Main St",
            "city": "Vancouver",
            "postalCode": "V6B 1A1",
            "province": "BC",
            "country": "CA",
        }
    }
    valid, error = utils.validate_schema(payload_omitted, "rental_unit_address")
    assert valid
    assert not error

    payload_null = {
        "address": {
            "streetNumber": "123",
            "streetName": "Main St",
            "city": "Vancouver",
            "postalCode": "V6B 1A1",
            "province": "BC",
            "country": "CA",
            "locationDescription": None,
        }
    }
    valid, error = utils.validate_schema(payload_null, "rental_unit_address")
    assert not valid
    assert error
