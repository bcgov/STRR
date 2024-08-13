import os
from http import HTTPStatus
from unittest.mock import patch

import pytest
from flask import g

from tests.unit.utils.mocks import (
    fake_document,
    fake_examiner_from_token,
    fake_get_token_auth_header,
    fake_registration,
    fake_registration_pending,
    fake_user_from_token,
    no_op,
    throw_external_service_exception,
)

REGISTRATION = "registration_use_sbc_account"
REGISTRATION_MINIMUM_FIELDS = "registration_use_sbc_account_minimum"
MOCK_ACCOUNT_REQUEST = os.path.join(
    os.path.dirname(os.path.realpath(__file__)), f"../../mocks/json/{REGISTRATION}.json"
)
MOCK_ACCOUNT_MINIMUM_FIELDS_REQUEST = os.path.join(
    os.path.dirname(os.path.realpath(__file__)), f"../../mocks/json/{REGISTRATION_MINIMUM_FIELDS}.json"
)


@patch("strr_api.models.user.User.find_by_jwt_token", new=fake_user_from_token)
@patch("flask_jwt_oidc.JwtManager.get_token_auth_header", new=fake_get_token_auth_header)
@patch("flask_jwt_oidc.JwtManager._validate_token", new=no_op)
def test_get_registrations_200(client):
    g.jwt_oidc_token_info = None
    rv = client.get("/registrations")
    assert rv.status_code == HTTPStatus.OK


def test_get_registrations_401(client):
    rv = client.get("/registrations")
    assert rv.status_code == HTTPStatus.UNAUTHORIZED


@patch("strr_api.services.registration_service.RegistrationService.get_registration", new=fake_registration)
@patch("strr_api.models.user.User.find_by_jwt_token", new=fake_user_from_token)
@patch("flask_jwt_oidc.JwtManager.get_token_auth_header", new=fake_get_token_auth_header)
@patch("flask_jwt_oidc.JwtManager._validate_token", new=no_op)
def test_get_registration_documents_200(client):
    rv = client.get("/registrations/1/documents")
    assert rv.status_code == HTTPStatus.OK


def test_get_registration_documents_401(client):
    rv = client.get("/registrations/1/documents")
    assert rv.status_code == HTTPStatus.UNAUTHORIZED


@patch("strr_api.services.DocumentService.get_registration_document", new=fake_document)
@patch("strr_api.services.registration_service.RegistrationService.get_registration", new=fake_registration)
@patch("strr_api.models.user.User.find_by_jwt_token", new=fake_user_from_token)
@patch("flask_jwt_oidc.JwtManager.get_token_auth_header", new=fake_get_token_auth_header)
@patch("flask_jwt_oidc.JwtManager._validate_token", new=no_op)
def test_get_registration_document_200(client):
    rv = client.get("/registrations/1/documents/1")
    assert rv.status_code == HTTPStatus.OK


def test_get_registration_document_401(client):
    rv = client.get("/registrations/1/documents/1")
    assert rv.status_code == HTTPStatus.UNAUTHORIZED


@patch("strr_api.models.user.User.find_by_jwt_token", new=fake_user_from_token)
@patch("flask_jwt_oidc.JwtManager.get_token_auth_header", new=fake_get_token_auth_header)
@patch("flask_jwt_oidc.JwtManager._validate_token", new=no_op)
def test_get_registration_document_403(client):
    rv = client.get("/registrations/1/documents/1")
    assert rv.status_code == HTTPStatus.FORBIDDEN


@patch("strr_api.services.registration_service.RegistrationService.get_registration", new=fake_registration)
@patch("strr_api.models.user.User.find_by_jwt_token", new=fake_user_from_token)
@patch("flask_jwt_oidc.JwtManager.get_token_auth_header", new=fake_get_token_auth_header)
@patch("flask_jwt_oidc.JwtManager._validate_token", new=no_op)
def test_get_registration_history_200(client):
    rv = client.get("/registrations/1/events")
    assert rv.status_code == HTTPStatus.OK


@pytest.mark.skip(reason="Skipping until issue is rewritten")
@patch("strr_api.services.registration_service.RegistrationService.get_registration", new=fake_registration)
@patch("strr_api.models.rental.Registration.save", new=no_op)
@patch("strr_api.models.user.User.find_by_jwt_token", new=fake_examiner_from_token)
@patch("flask_jwt_oidc.JwtManager.get_token_auth_header", new=fake_get_token_auth_header)
@patch("flask_jwt_oidc.JwtManager._validate_token", new=no_op)
def test_post_registration_issue_200(client):
    rv = client.post("/registrations/1/issue")
    assert rv.status_code == HTTPStatus.OK


@pytest.mark.skip(reason="Skipping until issue is rewritten")
def test_post_registration_issue_401(client):
    rv = client.post("/registrations/1/issue")
    assert rv.status_code == HTTPStatus.UNAUTHORIZED


@pytest.mark.skip(reason="Skipping until issue is rewritten")
@patch("strr_api.models.user.User.find_by_jwt_token", new=fake_user_from_token)
@patch("flask_jwt_oidc.JwtManager.get_token_auth_header", new=fake_get_token_auth_header)
@patch("flask_jwt_oidc.JwtManager._validate_token", new=no_op)
def test_post_registration_issue_403(client):
    rv = client.post("/registrations/1/issue")
    assert rv.status_code == HTTPStatus.FORBIDDEN


@patch("strr_api.services.registration_service.RegistrationService.get_registration", new=fake_registration)
@patch("strr_api.models.user.User.find_by_jwt_token", new=fake_examiner_from_token)
@patch("flask_jwt_oidc.JwtManager.get_token_auth_header", new=fake_get_token_auth_header)
@patch("flask_jwt_oidc.JwtManager._validate_token", new=no_op)
def test_get_registration_by_id_200(client):
    rv = client.get("/registrations/1")
    assert rv.status_code == HTTPStatus.OK


def test_get_registration_by_id_401(client):
    rv = client.get("/registrations/1")
    assert rv.status_code == HTTPStatus.UNAUTHORIZED


@pytest.mark.skip(reason="Skipping till issue certificate is rewritten")
@patch("strr_api.services.registration_service.RegistrationService.get_registration", new=fake_registration)
@patch("strr_api.models.user.User.find_by_jwt_token", new=fake_user_from_token)
@patch("flask_jwt_oidc.JwtManager.get_token_auth_header", new=fake_get_token_auth_header)
@patch("flask_jwt_oidc.JwtManager._validate_token", new=no_op)
def test_get_registration_certificate_200(client):
    rv = client.get("/registrations/1/certificate")
    assert rv.status_code == HTTPStatus.OK


def test_get_registration_certificate_401(client):
    rv = client.get("/registrations/1/certificate")
    assert rv.status_code == HTTPStatus.UNAUTHORIZED


@patch("strr_api.models.user.User.find_by_jwt_token", new=fake_user_from_token)
@patch("flask_jwt_oidc.JwtManager.get_token_auth_header", new=fake_get_token_auth_header)
@patch("flask_jwt_oidc.JwtManager._validate_token", new=no_op)
def test_get_registration_certificate_403(client):
    rv = client.get("/registrations/1/certificate")
    assert rv.status_code == HTTPStatus.FORBIDDEN
