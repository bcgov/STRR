"""Integration tests for ``/permits`` and ``/v1/permits`` validation endpoints."""

from http import HTTPStatus
from unittest.mock import patch

import pytest

from tests.integration.helpers import assert_status, assert_unauthenticated_returns_401_for_protected_prefix


def test_permits_routes_require_auth_without_bearer(client, app):
    assert_unauthenticated_returns_401_for_protected_prefix(client, app, "/permits")


def test_v1_permits_routes_require_auth_without_bearer(client, app):
    assert_unauthenticated_returns_401_for_protected_prefix(client, app, "/v1/permits")


@patch("strr_api.resources.validation.ValidationService.validate_permit", return_value=({}, HTTPStatus.OK))
def test_validate_permit_legacy_ok(mock_val, client, headers_public_user):
    rv = client.post(
        "/permits/:validatePermit",
        json={"registrationNumber": "X"},
        headers=headers_public_user(account_id=None),
    )
    assert rv.status_code == HTTPStatus.OK


@patch("strr_api.resources.validation.ValidationService.validate_permit", return_value=({}, HTTPStatus.OK))
def test_validate_permit_v1_ok(mock_val, client, headers_public_user):
    rv = client.post(
        "/v1/permits/:validatePermit",
        json={"registrationNumber": "X"},
        headers=headers_public_user(account_id=None),
    )
    assert rv.status_code == HTTPStatus.OK


def test_validate_permit_legacy_real_service_ok(client, headers_public_user, serializable_host_registration):
    reg_number = serializable_host_registration["registration_number"]
    body = {
        "identifier": reg_number,
        "address": {"streetNumber": "100", "postalCode": "V8V1A1", "unitNumber": ""},
    }
    rv = client.post("/permits/:validatePermit", json=body, headers=headers_public_user())
    assert_status(rv, HTTPStatus.OK)
    data = rv.get_json()
    assert data.get("status") == "ACTIVE"


def test_validate_permit_v1_real_service_ok(client, headers_public_user, serializable_host_registration):
    reg_number = serializable_host_registration["registration_number"]
    body = {
        "identifier": reg_number,
        "address": {"streetNumber": "100", "postalCode": "V8V1A1", "unitNumber": ""},
    }
    rv = client.post("/v1/permits/:validatePermit", json=body, headers=headers_public_user())
    assert_status(rv, HTTPStatus.OK)
    assert rv.get_json().get("status") == "ACTIVE"


@patch(
    "strr_api.resources.validation.ValidationService.validate_permit",
    return_value=({"errors": [{"code": "PERMIT_NOT_FOUND"}]}, HTTPStatus.NOT_FOUND),
)
def test_validate_permit_legacy_not_found_shape(mock_val, client, headers_public_user):
    rv = client.post(
        "/permits/:validatePermit",
        json={"identifier": "NO-SUCH-REG", "address": {"streetNumber": "1", "postalCode": "V8V1A1"}},
        headers=headers_public_user(account_id=None),
    )
    assert_status(rv, HTTPStatus.NOT_FOUND)


@patch(
    "strr_api.resources.validation.ValidationService.validate_permit",
    return_value=({"errors": [{"code": "PERMIT_NOT_FOUND"}]}, HTTPStatus.NOT_FOUND),
)
def test_validate_permit_v1_not_found_shape(mock_val, client, headers_public_user):
    rv = client.post(
        "/v1/permits/:validatePermit",
        json={"identifier": "NO-SUCH-REG", "address": {"streetNumber": "1", "postalCode": "V8V1A1"}},
        headers=headers_public_user(account_id=None),
    )
    assert_status(rv, HTTPStatus.NOT_FOUND)


@pytest.mark.parametrize("path", ["/permits/:validatePermit", "/v1/permits/:validatePermit"])
@pytest.mark.parametrize("status", [HTTPStatus.OK, HTTPStatus.BAD_REQUEST, HTTPStatus.NOT_FOUND])
@pytest.mark.parametrize("result_type", ["object", "string"])
@patch("strr_api.resources.validation.ValidationService.validate_permit")
def test_validate_permit_returns_json_for_html_content(
    mock_val, client, headers_public_user, path, status, result_type
):
    identifier = 'Café <script>alert(1)</script> & "quoted"'
    body = {"identifier": identifier, "address": {"streetNumber": "123", "postalCode": "V8V1A1"}}
    result = body if result_type == "object" else identifier
    mock_val.return_value = (result, status)
    headers = headers_public_user(account_id=None)
    headers["Accept"] = "text/html"

    rv = client.post(path, json=body, headers=headers)

    assert_status(rv, status)
    assert rv.mimetype == "application/json"
    assert rv.get_json() == result
    mock_val.assert_called_once_with(body)
