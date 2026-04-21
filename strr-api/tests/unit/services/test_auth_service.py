# Copyright © 2025 Province of British Columbia
#
# Licensed under the BSD 3 Clause License, (the "License");
# you may not use this file except in compliance with the License.
"""Tests for AuthService (HTTP/RestService mocked)."""

from http import HTTPStatus
from unittest.mock import MagicMock, patch

import pytest

from strr_api.exceptions import ExternalServiceException
from strr_api.requests.SBCAccountCreationRequest import SBCAccountCreationRequest
from strr_api.services.auth_service import AuthService


@patch("strr_api.services.auth_service.requests.post")
def test_get_service_client_token_success(mock_post, app_ctx):
    mock_post.return_value.json.return_value = {"access_token": "tok"}
    token = AuthService.get_service_client_token(
        client_id="id", client_secret="sec", token_url="https://token", timeout=5
    )
    assert token == "tok"


@patch("strr_api.services.auth_service.requests.post")
def test_get_service_client_token_json_failure_returns_none(mock_post, app_ctx):
    mock_post.return_value.json.side_effect = ValueError("bad json")
    assert AuthService.get_service_client_token("id", "sec", "https://token") is None


@patch.object(AuthService, "get_service_client_token", return_value="svc-token")
@patch("strr_api.services.auth_service.RestService.get")
def test_search_accounts(mock_get, _mock_token, app_ctx):
    mock_get.return_value.json.return_value = {"orgs": []}
    out = AuthService.search_accounts("  acme  ")
    mock_get.assert_called_once()
    assert "orgs" in out


@patch("strr_api.services.auth_service.RestService.get")
def test_get_user_accounts(mock_get, app_ctx):
    mock_get.return_value.json.return_value = {"a": 1}
    assert AuthService.get_user_accounts("bear") == {"a": 1}


@patch("strr_api.services.auth_service.RestService.post")
def test_create_user_account_with_mailing(mock_post, app_ctx):
    req = SBCAccountCreationRequest(
        "Co",
        "a@b.co",
        "2505551212",
        mailingAddress={
            "street": "1 Main",
            "city": "Vic",
            "region": "BC",
            "postalCode": "V8V1A1",
            "country": "CA",
        },
    )
    mock_post.return_value.json.return_value = {"id": 1}
    out = AuthService.create_user_account("tok", req)
    assert out["id"] == 1
    call = mock_post.call_args
    assert "mailingAddress" in call.kwargs["data"]


@patch("strr_api.services.auth_service.RestService.post")
def test_add_contact_info(mock_post, app_ctx):
    req = SBCAccountCreationRequest("Co", "a@b.co", "2505551212", phoneExtension="123")
    mock_post.return_value.json.return_value = {"ok": True}
    AuthService.add_contact_info("tok", 99, req)
    payload = mock_post.call_args.kwargs["data"]
    assert payload["phoneExtension"] == "123"


@patch("strr_api.services.auth_service.RestService.get")
def test_get_sbc_accounts_mailing_address_builds_model(mock_get, app_ctx):
    mock_get.return_value.json.return_value = {
        "mailingAddress": {
            "street": "1 St",
            "city": "Vic",
            "region": "BC",
            "postalCode": "V8V",
            "country": "CA",
        }
    }
    addr = AuthService.get_sbc_accounts_mailing_address("tok", 1)
    assert addr.street == "1 St"


@patch("strr_api.services.auth_service.RestService.get")
def test_get_sbc_accounts_mailing_address_no_street(mock_get, app_ctx):
    mock_get.return_value.json.return_value = {"mailingAddress": {"city": "Vic"}}
    assert AuthService.get_sbc_accounts_mailing_address("tok", 1) is None


@patch("strr_api.services.auth_service.RestService.get")
def test_get_user_tos_terms_already_accepted(mock_get, authed_g):
    mock_get.return_value.json.return_value = {"userTerms": {"isTermsOfUseAccepted": True}}
    assert AuthService.get_user_tos()["isTermsOfUseAccepted"] is True


@patch("strr_api.services.auth_service.RestService.get")
def test_get_user_tos_fetches_document_when_not_accepted(mock_get, authed_g):
    mock_get.side_effect = [
        MagicMock(json=MagicMock(return_value={"userTerms": {"isTermsOfUseAccepted": False}})),
        MagicMock(json=MagicMock(return_value={"versionId": "v2", "content": "legal"})),
    ]
    out = AuthService.get_user_tos()
    assert out["termsOfUseCurrentVersion"] == "v2"
    assert out["termsOfUse"] == "legal"


@patch("strr_api.services.auth_service.RestService.patch")
def test_update_user_tos(mock_patch, authed_g):
    mock_patch.return_value.json.return_value = {"userTerms": {"isTermsOfUseAccepted": True}}
    out = AuthService.update_user_tos({"accepted": True})
    assert out["isTermsOfUseAccepted"] is True


@patch("strr_api.services.auth_service.RestService.post")
def test_update_user_profile_success(mock_post, authed_g):
    mock_post.return_value.json.return_value = {"id": "u1"}
    assert AuthService.update_user_profile() == {"id": "u1"}


@patch("strr_api.services.auth_service.RestService.post")
def test_update_user_profile_rest_service_error_propagates(mock_post, authed_g):
    mock_post.side_effect = ExternalServiceException(error="upstream", status_code=HTTPStatus.BAD_GATEWAY)
    with pytest.raises(ExternalServiceException) as exc:
        AuthService.update_user_profile()
    assert exc.value.status_code == HTTPStatus.BAD_GATEWAY
