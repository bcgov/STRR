"""Integration tests for ``/users`` endpoints."""

from http import HTTPStatus
from unittest.mock import patch

from strr_api.exceptions import ExternalServiceException
from tests.integration.helpers import (
    assert_status,
    protected_routes_with_prefix,
    resolve_path_for_unauth,
    unauthenticated_request,
)


def test_users_routes_require_auth_without_bearer(client, app):
    rows = protected_routes_with_prefix(app, "/users")
    assert rows, "expected at least one protected /users route"
    for method, rule in rows:
        path = resolve_path_for_unauth(rule)
        rv = unauthenticated_request(client, method, path)
        assert rv.status_code == HTTPStatus.UNAUTHORIZED, f"{method} {rule}"


@patch("strr_api.resources.users.AuthService.get_user_tos", return_value={"isTermsOfUseAccepted": True})
def test_get_user_tos_ok(mock_tos, client, jwt):
    from tests.unit.utils.auth_helpers import PUBLIC_USER, create_header

    headers = create_header(jwt, [PUBLIC_USER])
    rv = client.get("/users/tos", headers=headers)
    assert rv.status_code == HTTPStatus.OK


@patch("strr_api.resources.users.AuthService.update_user_profile", return_value={"profileUpdated": True})
def test_post_users_profile_ok_patched(mock_post, client, jwt):
    from tests.unit.utils.auth_helpers import PUBLIC_USER, create_header

    headers = create_header(jwt, [PUBLIC_USER])
    rv = client.post("/users/", headers=headers)
    assert_status(rv, HTTPStatus.OK)
    assert rv.get_json().get("profileUpdated") is True


@patch("strr_api.resources.users.AuthService.update_user_tos", return_value={"isTermsOfUseAccepted": True})
def test_patch_user_tos_ok_patched(mock_patch, client, jwt):
    from tests.unit.utils.auth_helpers import PUBLIC_USER, create_header

    headers = create_header(jwt, [PUBLIC_USER])
    rv = client.patch(
        "/users/tos",
        headers=headers,
        json={"termsversion": "v1", "istermsaccepted": True},
    )
    assert_status(rv, HTTPStatus.OK)


@patch(
    "strr_api.resources.users.validate_schema",
    return_value=(False, [{"path": "/istermsaccepted", "message": "required"}]),
)
def test_patch_user_tos_invalid_schema_bad_request(mock_schema, client, jwt):
    from tests.unit.utils.auth_helpers import PUBLIC_USER, create_header

    headers = create_header(jwt, [PUBLIC_USER])
    rv = client.patch("/users/tos", headers=headers, json={"termsversion": "v1"})
    assert_status(rv, HTTPStatus.BAD_REQUEST)
    err = rv.get_json()
    assert "errors" in err or "message" in err


@patch("strr_api.resources.users.AuthService.get_user_tos")
def test_get_user_tos_returns_status_when_auth_service_raises(mock_tos, client, jwt):
    mock_tos.side_effect = ExternalServiceException(
        error="sbc",
        message="SBC ToS service unavailable",
        status_code=HTTPStatus.SERVICE_UNAVAILABLE,
    )
    from tests.unit.utils.auth_helpers import PUBLIC_USER, create_header

    headers = create_header(jwt, [PUBLIC_USER])
    rv = client.get("/users/tos", headers=headers)
    assert_status(rv, HTTPStatus.SERVICE_UNAVAILABLE)
    err = rv.get_json()
    assert err is not None
    assert "unavailable" in (err.get("message") or "").lower()


@patch("strr_api.resources.users.AuthService.update_user_profile")
def test_post_users_profile_returns_status_when_auth_service_raises(mock_prof, client, jwt):
    mock_prof.side_effect = ExternalServiceException(
        error="sbc",
        message="SBC profile service unavailable",
        status_code=HTTPStatus.SERVICE_UNAVAILABLE,
    )
    from tests.unit.utils.auth_helpers import PUBLIC_USER, create_header

    headers = create_header(jwt, [PUBLIC_USER])
    rv = client.post("/users/", headers=headers)
    assert_status(rv, HTTPStatus.SERVICE_UNAVAILABLE)
    err = rv.get_json()
    assert err is not None
    assert "unavailable" in (err.get("message") or "").lower()


@patch("strr_api.resources.users.AuthService.update_user_tos")
def test_patch_user_tos_returns_status_when_auth_service_raises(mock_upd, client, jwt):
    mock_upd.side_effect = ExternalServiceException(
        error="sbc",
        message="SBC ToS update unavailable",
        status_code=HTTPStatus.SERVICE_UNAVAILABLE,
    )
    from tests.unit.utils.auth_helpers import PUBLIC_USER, create_header

    headers = create_header(jwt, [PUBLIC_USER])
    rv = client.patch(
        "/users/tos",
        headers=headers,
        json={"termsversion": "v1", "istermsaccepted": True},
    )
    assert_status(rv, HTTPStatus.SERVICE_UNAVAILABLE)
    err = rv.get_json()
    assert err is not None
    assert "unavailable" in (err.get("message") or "").lower()
