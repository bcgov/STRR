"""Integration tests for ``/permits`` and ``/v1/permits`` validation endpoints."""

from http import HTTPStatus
from unittest.mock import patch

from tests.integration.helpers import (
    assert_status,
    protected_routes_with_prefix,
    resolve_path_for_unauth,
    unauthenticated_request,
)


def test_permits_routes_require_auth_without_bearer(client, app):
    rows = protected_routes_with_prefix(app, "/permits")
    assert rows, "expected at least one protected /permits route"
    for method, rule in rows:
        path = resolve_path_for_unauth(rule)
        rv = unauthenticated_request(client, method, path)
        assert rv.status_code == HTTPStatus.UNAUTHORIZED, f"{method} {rule}"


def test_v1_permits_routes_require_auth_without_bearer(client, app):
    rows = protected_routes_with_prefix(app, "/v1/permits")
    assert rows, "expected at least one protected /v1/permits route"
    for method, rule in rows:
        path = resolve_path_for_unauth(rule)
        rv = unauthenticated_request(client, method, path)
        assert rv.status_code == HTTPStatus.UNAUTHORIZED, f"{method} {rule}"


@patch("strr_api.resources.validation.ValidationService.validate_permit", return_value=({}, HTTPStatus.OK))
def test_validate_permit_legacy_ok(mock_val, client, jwt):
    from tests.unit.utils.auth_helpers import PUBLIC_USER, create_header

    headers = create_header(jwt, [PUBLIC_USER])
    rv = client.post("/permits/:validatePermit", json={"registrationNumber": "X"}, headers=headers)
    assert rv.status_code == HTTPStatus.OK


@patch("strr_api.resources.validation.ValidationService.validate_permit", return_value=({}, HTTPStatus.OK))
def test_validate_permit_v1_ok(mock_val, client, jwt):
    from tests.unit.utils.auth_helpers import PUBLIC_USER, create_header

    headers = create_header(jwt, [PUBLIC_USER])
    rv = client.post("/v1/permits/:validatePermit", json={"registrationNumber": "X"}, headers=headers)
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
    assert "validUntil" in data


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
def test_validate_permit_legacy_not_found_shape(mock_val, client, jwt):
    from tests.unit.utils.auth_helpers import PUBLIC_USER, create_header

    headers = create_header(jwt, [PUBLIC_USER])
    rv = client.post(
        "/permits/:validatePermit",
        json={"identifier": "NO-SUCH-REG", "address": {"streetNumber": "1", "postalCode": "V8V1A1"}},
        headers=headers,
    )
    assert_status(rv, HTTPStatus.NOT_FOUND)


@patch(
    "strr_api.resources.validation.ValidationService.validate_permit",
    return_value=({"errors": [{"code": "PERMIT_NOT_FOUND"}]}, HTTPStatus.NOT_FOUND),
)
def test_validate_permit_v1_not_found_shape(mock_val, client, jwt):
    from tests.unit.utils.auth_helpers import PUBLIC_USER, create_header

    headers = create_header(jwt, [PUBLIC_USER])
    rv = client.post(
        "/v1/permits/:validatePermit",
        json={"identifier": "NO-SUCH-REG", "address": {"streetNumber": "1", "postalCode": "V8V1A1"}},
        headers=headers,
    )
    assert_status(rv, HTTPStatus.NOT_FOUND)
