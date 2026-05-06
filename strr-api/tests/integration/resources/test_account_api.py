"""Integration tests for ``/accounts`` endpoints."""

from http import HTTPStatus
from unittest.mock import patch

import pytest

from strr_api.exceptions import ExternalServiceException
from tests.integration.helpers import (
    assert_json_keys,
    assert_status,
    protected_routes_with_prefix,
    resolve_path_for_unauth,
    unauthenticated_request,
)


def test_accounts_routes_require_auth_without_bearer(client, app):
    rows = protected_routes_with_prefix(app, "/accounts")
    assert rows, "expected at least one protected /accounts route"
    for method, rule in rows:
        path = resolve_path_for_unauth(rule)
        rv = unauthenticated_request(client, method, path)
        assert rv.status_code == HTTPStatus.UNAUTHORIZED, f"{method} {rule}"


@patch(
    "strr_api.resources.account.AuthService.get_user_accounts",
    return_value={"orgs": [{"id": 1, "name": "Integration Org", "orgStatus": "ACTIVE"}]},
)
def test_get_user_accounts_ok_shape(mock_get, client, jwt, integration_account_id):
    from tests.unit.utils.auth_helpers import PUBLIC_USER, create_header

    headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
    headers["Account-Id"] = str(integration_account_id)
    rv = client.get("/accounts/", headers=headers)
    assert_status(rv, HTTPStatus.OK)
    data = assert_json_keys(rv, "orgs")
    assert isinstance(data["orgs"], list)
    assert data["orgs"][0]["id"] == 1
    assert "name" in data["orgs"][0]


@patch(
    "strr_api.resources.account.AuthService.search_accounts",
    return_value={"orgs": [{"id": 99, "name": "SearchCo", "orgStatus": "ACTIVE"}]},
)
def test_search_accounts_ok_shape_and_name_param(mock_search, client, jwt):
    from tests.unit.utils.auth_helpers import STRR_EXAMINER, create_header

    headers = create_header(jwt, [STRR_EXAMINER])
    rv = client.get("/accounts/search?name=SearchCo", headers=headers)
    assert_status(rv, HTTPStatus.OK)
    data = assert_json_keys(rv, "orgs")
    mock_search.assert_called_once_with(account_name="SearchCo")
    assert data["orgs"][0]["name"] == "SearchCo"


def test_search_accounts_missing_name_bad_request(client, jwt):
    from tests.unit.utils.auth_helpers import STRR_EXAMINER, create_header

    headers = create_header(jwt, [STRR_EXAMINER])
    rv = client.get("/accounts/search", headers=headers)
    assert_status(rv, HTTPStatus.BAD_REQUEST)


@patch("strr_api.resources.account.AuthService.search_accounts")
def test_search_accounts_returns_status_when_auth_service_raises(mock_search, client, jwt):
    mock_search.side_effect = ExternalServiceException(
        error="sbc",
        message="SBC account search unavailable",
        status_code=HTTPStatus.SERVICE_UNAVAILABLE,
    )
    from tests.unit.utils.auth_helpers import STRR_EXAMINER, create_header

    headers = create_header(jwt, [STRR_EXAMINER])
    rv = client.get("/accounts/search?name=AnyCo", headers=headers)
    assert_status(rv, HTTPStatus.SERVICE_UNAVAILABLE)
    err = rv.get_json()
    assert err is not None
    assert "unavailable" in (err.get("message") or "").lower()


@patch("strr_api.resources.account.AuthService.get_user_accounts")
def test_get_user_accounts_returns_status_when_auth_service_raises(mock_get, client, jwt, integration_account_id):
    """Deterministic substitute for optional live SBC calls (set STRR_INTEGRATION_REAL_AUTH=1 locally if needed)."""
    mock_get.side_effect = ExternalServiceException(
        error="sbc",
        message="SBC account service unavailable",
        status_code=HTTPStatus.SERVICE_UNAVAILABLE,
    )
    from tests.unit.utils.auth_helpers import PUBLIC_USER, create_header

    headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
    headers["Account-Id"] = str(integration_account_id)
    rv = client.get("/accounts/", headers=headers)
    assert_status(rv, HTTPStatus.SERVICE_UNAVAILABLE)
    err = rv.get_json()
    assert err is not None
    assert "unavailable" in (err.get("message") or "").lower()


@patch("strr_api.resources.account.AuthService.add_contact_info")
@patch("strr_api.resources.account.AuthService.create_user_account")
def test_post_create_user_account_created_with_patched_sbc(
    mock_create, mock_add_contact, client, jwt, integration_account_id
):
    mock_create.return_value = {"id": 4242}
    from tests.unit.utils.auth_helpers import PUBLIC_USER, create_header

    headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
    headers["Account-Id"] = str(integration_account_id)
    payload = {
        "name": "Integration New Co",
        "phone": "250-555-0199",
        "email": "newco@example.test",
        "mailingAddress": {
            "street": "1 Integration Rd",
            "city": "Victoria",
            "region": "BC",
            "postalCode": "V8V1A1",
            "country": "CA",
        },
    }
    rv = client.post("/accounts/", json=payload, headers=headers)
    assert_status(rv, HTTPStatus.CREATED)
    body = rv.get_json()
    assert body["sbc_account_id"] == 4242
    assert isinstance(body.get("user_id"), int)
    mock_create.assert_called_once()
    mock_add_contact.assert_called_once()
