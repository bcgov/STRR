import json
import os
from datetime import datetime
from http import HTTPStatus
from unittest.mock import patch

import pytest
from flask import g

from strr_api.enums.enum import PaymentStatus
from strr_api.exceptions import ExternalServiceException
from strr_api.models import Application
from tests.unit.utils.auth_helpers import PUBLIC_USER, STRR_EXAMINER, create_header
from tests.unit.utils.mocks import (
    fake_document,
    fake_examiner_from_token,
    fake_get_token_auth_header,
    fake_registration,
    fake_user_from_token,
    no_op,
)

REGISTRATION = "registration_use_sbc_account"
REGISTRATION_MINIMUM_FIELDS = "registration_use_sbc_account_minimum"
MOCK_ACCOUNT_REQUEST = os.path.join(
    os.path.dirname(os.path.realpath(__file__)), f"../../mocks/json/{REGISTRATION}.json"
)
MOCK_ACCOUNT_MINIMUM_FIELDS_REQUEST = os.path.join(
    os.path.dirname(os.path.realpath(__file__)), f"../../mocks/json/{REGISTRATION_MINIMUM_FIELDS}.json"
)
CREATE_HOST_REGISTRATION_REQUEST = os.path.join(
    os.path.dirname(os.path.realpath(__file__)), "../../mocks/json/host_registration.json"
)

ACCOUNT_ID = 1234

MOCK_INVOICE_RESPONSE = {"id": 123, "statusCode": "CREATED", "paymentAccount": {"accountId": ACCOUNT_ID}}
MOCK_PAYMENT_COMPLETED_RESPONSE = {
    "id": 123,
    "statusCode": "COMPLETED",
    "paymentAccount": {"accountId": ACCOUNT_ID},
    "paymentDate": datetime.now().isoformat(),
}


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


@patch("strr_api.models.user.User.find_by_jwt_token", new=fake_user_from_token)
@patch("flask_jwt_oidc.JwtManager.get_token_auth_header", new=fake_get_token_auth_header)
@patch("flask_jwt_oidc.JwtManager._validate_token", new=no_op)
@patch("strr_api.services.registration_service.RegistrationService.get_registration", new=fake_registration)
@patch("strr_api.services.document_service.DocumentService.get_registration_document_by_key")
@patch("strr_api.services.document_service.DocumentService.get_file_by_key")
def test_get_registration_file_by_id_200(mock_get_file, mock_get_document, client):
    mock_document = fake_document()
    mock_document.file_name = "test.pdf"
    mock_document.file_type = "application/pdf"
    mock_get_document.return_value = mock_document
    mock_file_content = b"test file content"
    mock_get_file.return_value = mock_file_content

    rv = client.get("/registrations/1/documents/test-key")
    assert rv.status_code == HTTPStatus.OK
    assert rv.data == mock_file_content
    assert rv.headers["Content-Disposition"] == "attachment; filename=test.pdf"
    assert rv.headers["Content-Type"] == "application/pdf"


def test_get_registration_file_by_id_401(client):
    rv = client.get("/registrations/1/documents/test-key")
    assert rv.status_code == HTTPStatus.UNAUTHORIZED


@patch("strr_api.models.user.User.find_by_jwt_token", new=fake_user_from_token)
@patch("flask_jwt_oidc.JwtManager.get_token_auth_header", new=fake_get_token_auth_header)
@patch("flask_jwt_oidc.JwtManager._validate_token", new=no_op)
@patch("strr_api.services.registration_service.RegistrationService.get_registration", return_value=None)
def test_get_registration_file_by_id_403(mock_get_registration, client):
    rv = client.get("/registrations/1/documents/test-key")
    assert rv.status_code == HTTPStatus.FORBIDDEN


@patch("strr_api.models.user.User.find_by_jwt_token", new=fake_user_from_token)
@patch("flask_jwt_oidc.JwtManager.get_token_auth_header", new=fake_get_token_auth_header)
@patch("flask_jwt_oidc.JwtManager._validate_token", new=no_op)
@patch("strr_api.services.registration_service.RegistrationService.get_registration", new=fake_registration)
@patch("strr_api.services.document_service.DocumentService.get_registration_document_by_key", return_value=None)
def test_get_registration_file_by_id_404(mock_get_document, client):
    rv = client.get("/registrations/1/documents/test-key")
    assert rv.status_code == HTTPStatus.NOT_FOUND


@patch("strr_api.models.user.User.find_by_jwt_token", new=fake_user_from_token)
@patch("flask_jwt_oidc.JwtManager.get_token_auth_header", new=fake_get_token_auth_header)
@patch("flask_jwt_oidc.JwtManager._validate_token", new=no_op)
@patch("strr_api.services.registration_service.RegistrationService.get_registration", new=fake_registration)
@patch("strr_api.services.document_service.DocumentService.get_registration_document_by_key")
@patch(
    "strr_api.services.document_service.DocumentService.get_file_by_key",
    side_effect=ExternalServiceException("External service error"),
)
def test_get_registration_file_by_id_502(mock_get_file, mock_get_document, client):
    mock_document = fake_document()
    mock_get_document.return_value = mock_document
    rv = client.get("/registrations/1/documents/test-key")
    assert rv.status_code == HTTPStatus.BAD_GATEWAY


@patch("strr_api.services.registration_service.RegistrationService.get_registration", new=fake_registration)
@patch("strr_api.models.user.User.find_by_jwt_token", new=fake_user_from_token)
@patch("flask_jwt_oidc.JwtManager.get_token_auth_header", new=fake_get_token_auth_header)
@patch("flask_jwt_oidc.JwtManager._validate_token", new=no_op)
def test_get_registration_history_200(client):
    rv = client.get("/registrations/1/events")
    assert rv.status_code == HTTPStatus.OK


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_issue_certificate_examiner(session, client, jwt):
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_id = response_json.get("header").get("id")

        application = Application.find_by_id(application_id=application_id)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        status_update_request = {"status": "approved"}
        rv = client.put(f"/applications/{application_id}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("header").get("status") == Application.Status.APPROVED
        assert response_json.get("header").get("reviewer").get("username") is not None
        assert response_json.get("header").get("registrationId") is not None
        assert response_json.get("header").get("registrationNumber") is not None
        registration_id = response_json.get("header").get("registrationId")
        rv = client.post(f"/registrations/{registration_id}/certificate", headers=staff_headers)
        assert rv.status_code == HTTPStatus.CREATED


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_issue_certificate_public_user(session, client, jwt):
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_id = response_json.get("header").get("id")

        application = Application.find_by_id(application_id=application_id)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        status_update_request = {"status": "approved"}
        rv = client.put(f"/applications/{application_id}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("header").get("status") == Application.Status.APPROVED
        assert response_json.get("header").get("reviewer").get("username") is not None
        assert response_json.get("header").get("registrationId") is not None
        assert response_json.get("header").get("registrationNumber") is not None
        registration_id = response_json.get("header").get("registrationId")
        rv = client.post(f"/registrations/{registration_id}/certificate", headers=headers)
        assert rv.status_code == HTTPStatus.UNAUTHORIZED


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_get_registration_certificate(session, client, jwt):
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_id = response_json.get("header").get("id")

        application = Application.find_by_id(application_id=application_id)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        status_update_request = {"status": "approved"}
        rv = client.put(f"/applications/{application_id}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("header").get("status") == Application.Status.APPROVED
        assert response_json.get("header").get("reviewer").get("username") is not None
        assert response_json.get("header").get("registrationId") is not None
        assert response_json.get("header").get("registrationNumber") is not None

        registration_id = response_json.get("header").get("registrationId")
        rv = client.post(f"/registrations/{registration_id}/certificate", headers=staff_headers)
        assert rv.status_code == HTTPStatus.CREATED

        rv = client.get(f"/registrations/{registration_id}/certificate", headers=headers)
        assert rv.status_code == HTTPStatus.OK


def test_get_registration_certificate_401(client):
    rv = client.get("/registrations/1/certificate")
    assert rv.status_code == HTTPStatus.UNAUTHORIZED


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_get_registration_by_id(session, client, jwt):
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_id = response_json.get("header").get("id")

        application = Application.find_by_id(application_id=application_id)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        status_update_request = {"status": "approved"}
        rv = client.put(f"/applications/{application_id}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("header").get("status") == Application.Status.APPROVED
        assert response_json.get("header").get("reviewer").get("username") is not None
        assert response_json.get("header").get("registrationId") is not None
        assert response_json.get("header").get("registrationNumber") is not None
        registration_id = response_json.get("header").get("registrationId")
        rv = client.get(f"/registrations/{registration_id}", headers=headers)
        assert rv.status_code == HTTPStatus.OK


def test_get_registration_by_id_unauthorized(client):
    rv = client.get("/registrations/1")
    assert rv.status_code == HTTPStatus.UNAUTHORIZED
