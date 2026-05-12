"""Integration tests for ``/address`` and ``/v1/address`` endpoints."""

from http import HTTPStatus
from unittest.mock import patch

from tests.integration.helpers import assert_status, assert_unauthenticated_returns_401_for_protected_prefix


def test_address_routes_require_auth_without_bearer(client, app):
    assert_unauthenticated_returns_401_for_protected_prefix(client, app, "/address")


def test_v1_address_routes_require_auth_without_bearer(client, app):
    assert_unauthenticated_returns_401_for_protected_prefix(client, app, "/v1/address")


@patch("strr_api.resources.str_address_requirements.ApprovalService.getSTRDataForAddress", return_value={"ok": True})
def test_post_address_requirements_ok(mock_str, client, headers_public_user):
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
    rv = client.post("/address/requirements", json=body, headers=headers_public_user(account_id=None))
    assert rv.status_code == HTTPStatus.OK


@patch("strr_api.resources.str_address_requirements.ApprovalService.getSTRDataForAddress", return_value={"ok": True})
def test_post_v1_address_requirements_ok(mock_str, client, headers_public_user):
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
    rv = client.post("/v1/address/requirements", json=body, headers=headers_public_user(account_id=None))
    assert_status(rv, HTTPStatus.OK)


def test_post_v1_address_requirements_invalid_body_bad_request(client, headers_public_user):
    rv = client.post(
        "/v1/address/requirements",
        json={"address": {}},
        headers=headers_public_user(account_id=None),
    )
    assert_status(rv, HTTPStatus.BAD_REQUEST)
