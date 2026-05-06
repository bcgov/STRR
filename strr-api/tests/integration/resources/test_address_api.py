"""Integration tests for ``/address`` and ``/v1/address`` endpoints."""

from http import HTTPStatus
from unittest.mock import patch

from tests.integration.helpers import (
    assert_status,
    protected_routes_with_prefix,
    resolve_path_for_unauth,
    unauthenticated_request,
)


def test_address_routes_require_auth_without_bearer(client, app):
    rows = protected_routes_with_prefix(app, "/address")
    assert rows, "expected at least one protected /address route"
    for method, rule in rows:
        path = resolve_path_for_unauth(rule)
        rv = unauthenticated_request(client, method, path)
        assert rv.status_code == HTTPStatus.UNAUTHORIZED, f"{method} {rule}"


def test_v1_address_routes_require_auth_without_bearer(client, app):
    rows = protected_routes_with_prefix(app, "/v1/address")
    assert rows, "expected at least one protected /v1/address route"
    for method, rule in rows:
        path = resolve_path_for_unauth(rule)
        rv = unauthenticated_request(client, method, path)
        assert rv.status_code == HTTPStatus.UNAUTHORIZED, f"{method} {rule}"


@patch("strr_api.resources.str_address_requirements.ApprovalService.getSTRDataForAddress", return_value={"ok": True})
def test_post_address_requirements_ok(mock_str, client, jwt):
    from tests.unit.utils.auth_helpers import PUBLIC_USER, create_header

    headers = create_header(jwt, [PUBLIC_USER])
    body = {
        "address": {
            "unitNumber": "1",
            "streetNumber": "123",
            "streetName": "Main St",
            "city": "Victoria",
            "province": "BC",
            "postalCode": "V8V1A1",
        }
    }
    rv = client.post("/address/requirements", json=body, headers=headers)
    assert rv.status_code == HTTPStatus.OK


@patch("strr_api.resources.str_address_requirements.ApprovalService.getSTRDataForAddress", return_value={"ok": True})
def test_post_v1_address_requirements_ok(mock_str, client, jwt):
    from tests.unit.utils.auth_helpers import PUBLIC_USER, create_header

    headers = create_header(jwt, [PUBLIC_USER])
    body = {
        "address": {
            "unitNumber": "",
            "streetNumber": "500",
            "streetName": "Permit Rd",
            "city": "Victoria",
            "province": "BC",
            "postalCode": "V8V2B2",
        }
    }
    rv = client.post("/v1/address/requirements", json=body, headers=headers)
    assert_status(rv, HTTPStatus.OK)


def test_post_v1_address_requirements_invalid_body_bad_request(client, jwt):
    from tests.unit.utils.auth_helpers import PUBLIC_USER, create_header

    headers = create_header(jwt, [PUBLIC_USER])
    rv = client.post("/v1/address/requirements", json={"address": {}}, headers=headers)
    assert_status(rv, HTTPStatus.BAD_REQUEST)
