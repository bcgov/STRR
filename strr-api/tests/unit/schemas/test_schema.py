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
