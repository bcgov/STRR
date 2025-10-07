import json
import os
import random
from datetime import datetime, timedelta
from http import HTTPStatus
from unittest.mock import patch

import pytest
from dateutil.relativedelta import relativedelta

from strr_api.enums.enum import ApplicationType, PaymentStatus, RegistrationNocStatus, RegistrationStatus
from strr_api.exceptions import ExternalServiceException
from strr_api.models import Application, Events, Registration, User
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
CREATE_PLATFORM_REGISTRATION_REQUEST = os.path.join(
    os.path.dirname(os.path.realpath(__file__)), "../../mocks/json/platform_registration.json"
)

ACCOUNT_ID = 1234

MOCK_INVOICE_RESPONSE = {"id": 123, "statusCode": "CREATED", "paymentAccount": {"accountId": ACCOUNT_ID}}
MOCK_PAYMENT_COMPLETED_RESPONSE = {
    "id": 123,
    "statusCode": "COMPLETED",
    "paymentAccount": {"accountId": ACCOUNT_ID},
    "paymentDate": datetime.now().isoformat(),
}
MOCK_DOCUMENT_UPLOAD = os.path.join(os.path.dirname(os.path.realpath(__file__)), "../../mocks/file/document_upload.txt")


def test_get_registrations_200(session, client, jwt):
    headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
    headers["Account-Id"] = ACCOUNT_ID
    rv = client.get("/registrations", headers=headers)
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


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_get_registration_events(session, client, jwt):
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        application = Application.find_by_application_number(application_number=application_number)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.status = Application.Status.FULL_REVIEW
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        rv = client.put(f"/applications/{application_number}/assign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("header").get("status") == Application.Status.FULL_REVIEW_APPROVED
        assert response_json.get("header").get("assignee").get("username") is not None
        assert response_json.get("header").get("registrationId") is not None
        assert response_json.get("header").get("registrationNumber") is not None
        registration_id = response_json.get("header").get("registrationId")
        rv = client.get(f"/registrations/{registration_id}/events", headers=headers)
        assert rv.status_code == HTTPStatus.OK
        events = rv.json
        assert len(events) == 1
        assert events[0].get("eventName") == Events.EventName.REGISTRATION_CREATED
        assert events[0].get("eventType") == Events.EventType.REGISTRATION


@pytest.mark.skip(reason="Skipping the test until certificate generation is supported")
@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_examiner_issue_certificate_for_host_registration(session, client, jwt):
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        application = Application.find_by_application_number(application_number=application_number)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.status = Application.Status.FULL_REVIEW
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        rv = client.put(f"/applications/{application_number}/assign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("header").get("status") == Application.Status.FULL_REVIEW_APPROVED
        assert response_json.get("header").get("assignee").get("username") is not None
        assert response_json.get("header").get("registrationId") is not None
        assert response_json.get("header").get("registrationNumber") is not None
        registration_id = response_json.get("header").get("registrationId")
        rv = client.post(f"/registrations/{registration_id}/certificate", headers=staff_headers)
        assert rv.status_code == HTTPStatus.CREATED
        rv = client.get(f"/applications/{application_number}", headers=headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("header").get("examinerActions") == []
        assert response_json.get("header").get("hostActions") == []
        rv = client.get(f"/registrations/{registration_id}", headers=headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("header").get("examinerActions") == ["APPROVE", "SUSPEND", "CANCEL"]
        assert response_json.get("header").get("hostActions") == []


@pytest.mark.skip(reason="Skipping the test until certificate generation is supported")
@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_examiner_issue_certificate_for_platform_registration(session, client, jwt):
    with open(CREATE_PLATFORM_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        application = Application.find_by_application_number(application_number=application_number)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.status = Application.Status.FULL_REVIEW
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        rv = client.put(f"/applications/{application_number}/assign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("header").get("status") == Application.Status.FULL_REVIEW_APPROVED
        assert response_json.get("header").get("assignee").get("username") is not None
        assert response_json.get("header").get("registrationId") is not None
        assert response_json.get("header").get("registrationNumber") is not None
        registration_id = response_json.get("header").get("registrationId")
        rv = client.post(f"/registrations/{registration_id}/certificate", headers=staff_headers)
        assert rv.status_code == HTTPStatus.BAD_REQUEST


@pytest.mark.skip(reason="Skipping the test until certificate generation is supported")
@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_issue_certificate_public_user(session, client, jwt):
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        application = Application.find_by_application_number(application_number=application_number)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.status = Application.Status.FULL_REVIEW
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        rv = client.put(f"/applications/{application_number}/assign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("header").get("status") == Application.Status.FULL_REVIEW_APPROVED
        assert response_json.get("header").get("assignee").get("username") is not None
        assert response_json.get("header").get("registrationId") is not None
        assert response_json.get("header").get("registrationNumber") is not None
        registration_id = response_json.get("header").get("registrationId")
        rv = client.post(f"/registrations/{registration_id}/certificate", headers=headers)
        assert rv.status_code == HTTPStatus.UNAUTHORIZED


@pytest.mark.skip(reason="Skipping the test until certificate generation is supported")
@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_get_registration_certificate(session, client, jwt):
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        application = Application.find_by_application_number(application_number=application_number)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.status = Application.Status.FULL_REVIEW
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        rv = client.put(f"/applications/{application_number}/assign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("header").get("status") == Application.Status.FULL_REVIEW_APPROVED
        assert response_json.get("header").get("assignee").get("username") is not None
        assert response_json.get("header").get("registrationId") is not None
        assert response_json.get("header").get("registrationNumber") is not None

        registration_id = response_json.get("header").get("registrationId")
        rv = client.post(f"/registrations/{registration_id}/certificate", headers=staff_headers)
        assert rv.status_code == HTTPStatus.CREATED

        rv = client.get(f"/registrations/{registration_id}/certificate", headers=headers)
        assert rv.status_code == HTTPStatus.OK


@pytest.mark.skip(reason="Skipping the test until certificate generation is supported")
def test_get_registration_certificate_401(client):
    rv = client.get("/registrations/1/certificate")
    assert rv.status_code == HTTPStatus.UNAUTHORIZED


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_get_host_registration_by_id(session, client, jwt):
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        application = Application.find_by_application_number(application_number=application_number)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.status = Application.Status.FULL_REVIEW
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        rv = client.put(f"/applications/{application_number}/assign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("header").get("status") == Application.Status.FULL_REVIEW_APPROVED
        assert response_json.get("header").get("assignee").get("username") is not None
        assert response_json.get("header").get("registrationId") is not None
        assert response_json.get("header").get("registrationNumber") is not None
        assert response_json.get("header").get("registrationNumber").startswith("H")
        registration_id = response_json.get("header").get("registrationId")
        rv = client.get(f"/registrations/{registration_id}", headers=headers)
        assert rv.status_code == HTTPStatus.OK


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_get_platform_registration_by_id(session, client, jwt):
    with open(CREATE_PLATFORM_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        application = Application.find_by_application_number(application_number=application_number)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.status = Application.Status.FULL_REVIEW
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        rv = client.put(f"/applications/{application_number}/assign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("header").get("status") == Application.Status.FULL_REVIEW_APPROVED
        assert response_json.get("header").get("assignee").get("username") is not None
        assert response_json.get("header").get("registrationId") is not None
        assert response_json.get("header").get("registrationNumber") is not None
        assert response_json.get("header").get("registrationNumber").startswith("PL")
        registration_id = response_json.get("header").get("registrationId")
        rv = client.get(f"/registrations/{registration_id}", headers=headers)
        assert rv.status_code == HTTPStatus.OK


def test_get_registration_by_id_unauthorized(client):
    rv = client.get("/registrations/1")
    assert rv.status_code == HTTPStatus.UNAUTHORIZED


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_cancel_registration(session, client, jwt):
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        application = Application.find_by_application_number(application_number=application_number)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.status = Application.Status.FULL_REVIEW
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        rv = client.put(f"/applications/{application_number}/assign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("header").get("status") == Application.Status.FULL_REVIEW_APPROVED
        assert response_json.get("header").get("assignee").get("username") is not None
        assert response_json.get("header").get("registrationId") is not None
        assert response_json.get("header").get("registrationNumber") is not None
        registration_id = response_json.get("header").get("registrationId")
        rv = client.put(f"/registrations/{registration_id}/assign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        status_update_request = {"status": RegistrationStatus.CANCELLED.value}
        rv = client.put(f"/registrations/{registration_id}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("status") == RegistrationStatus.CANCELLED.value
        assert response_json.get("cancelledDate") is not None


def test_get_expired_registration_todos_in_renewal_window(session, client, jwt):
    headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
    headers["Account-Id"] = ACCOUNT_ID

    current_utc = datetime.utcnow()
    registration_end_date = current_utc - relativedelta(years=1)
    user = User(
        username="testUser",
        firstname="Test",
        lastname="User",
        iss="test",
        sub=f"sub{random.randint(0, 99999)}",
        idp_userid="testUserID",
        login_source="testLogin",
    )
    user.save()

    registration = Registration(
        start_date=registration_end_date - relativedelta(years=1),
        expiry_date=registration_end_date,
        status=RegistrationStatus.ACTIVE,
        registration_type="HOST",
        sbc_account_id=ACCOUNT_ID,
        registration_number="H1234567",
        user_id=user.id,
    )
    registration.save()
    rv = client.get(f"/registrations/{registration.id}/todos", headers=headers)
    response_json = rv.json
    assert response_json.get("todos")[0].get("task") is not None


def test_get_expired_registration_todos_outside_renewal_window(session, client, jwt):
    headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
    headers["Account-Id"] = ACCOUNT_ID

    current_utc = datetime.utcnow()
    registration_end_date = current_utc + relativedelta(years=4)
    user = User(
        username="testUser",
        firstname="Test",
        lastname="User",
        iss="test",
        sub=f"sub{random.randint(0, 99999)}",
        idp_userid="testUserID",
        login_source="testLogin",
    )
    user.save()

    registration = Registration(
        start_date=registration_end_date - relativedelta(years=5),
        expiry_date=registration_end_date,
        status=RegistrationStatus.ACTIVE,
        registration_type="HOST",
        sbc_account_id=ACCOUNT_ID,
        registration_number="H1234567",
        user_id=user.id,
    )
    registration.save()
    rv = client.get(f"/registrations/{registration.id}/todos", headers=headers)
    response_json = rv.json
    assert response_json.get("todos") == []


def test_get_active_registration_todos_in_renewal_window(session, client, jwt):
    headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
    headers["Account-Id"] = ACCOUNT_ID

    current_utc = datetime.utcnow()
    registration_end_date = current_utc + timedelta(days=24)
    user = User(
        username="testUser",
        firstname="Test",
        lastname="User",
        iss="test",
        sub=f"sub{random.randint(0, 99999)}",
        idp_userid="testUserID",
        login_source="testLogin",
    )
    user.save()

    registration = Registration(
        start_date=registration_end_date - timedelta(days=340),
        expiry_date=registration_end_date,
        status=RegistrationStatus.ACTIVE,
        registration_type="HOST",
        sbc_account_id=ACCOUNT_ID,
        registration_number="H1234567",
        user_id=user.id,
    )
    registration.save()
    rv = client.get(f"/registrations/{registration.id}/todos", headers=headers)
    response_json = rv.json
    assert response_json.get("todos")[0].get("task") is not None


def test_get_active_registration_todos_outside_renewal_window(session, client, jwt):
    headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
    headers["Account-Id"] = ACCOUNT_ID

    current_utc = datetime.utcnow()
    registration_end_date = current_utc + timedelta(days=65)
    user = User(
        username="testUser",
        firstname="Test",
        lastname="User",
        iss="test",
        sub=f"sub{random.randint(0, 99999)}",
        idp_userid="testUserID",
        login_source="testLogin",
    )
    user.save()

    registration = Registration(
        start_date=registration_end_date - timedelta(days=300),
        expiry_date=registration_end_date,
        status=RegistrationStatus.ACTIVE,
        registration_type="HOST",
        sbc_account_id=ACCOUNT_ID,
        registration_number="H1234567",
        user_id=user.id,
    )
    registration.save()
    rv = client.get(f"/registrations/{registration.id}/todos", headers=headers)
    response_json = rv.json
    assert response_json.get("todos") == []


def test_get_todos_with_renewal_draft(session, client, jwt):
    """Test renewal draft todos."""
    headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
    headers["Account-Id"] = ACCOUNT_ID

    current_utc = datetime.utcnow()
    registration_end_date = current_utc + timedelta(days=24)
    user = User(
        username="testUser",
        firstname="Test",
        lastname="User",
        iss="test",
        sub=f"sub{random.randint(0, 99999)}",
        idp_userid="testUserID",
        login_source="testLogin",
    )
    user.save()

    registration = Registration(
        start_date=registration_end_date - timedelta(days=340),
        expiry_date=registration_end_date,
        status=RegistrationStatus.ACTIVE,
        registration_type="HOST",
        sbc_account_id=ACCOUNT_ID,
        registration_number="H1234567",
        user_id=user.id,
    )
    registration.save()

    # Create a draft renewal application with payment_account
    draft_application = Application(
        type=ApplicationType.RENEWAL.value,
        status=Application.Status.DRAFT,
        payment_account=str(ACCOUNT_ID),
        registration_id=registration.id,
        application_json={},
        application_number=Application.generate_unique_application_number(),
    )
    draft_application.save()

    rv = client.get(f"/registrations/{registration.id}/todos", headers=headers)
    response_json = rv.json
    todos = response_json.get("todos")
    assert len(todos) == 1
    assert todos[0].get("task").get("type") == "REGISTRATION_RENEWAL_DRAFT"
    assert todos[0].get("task").get("detail") == draft_application.application_number

    draft_application.delete()

    # Create a draft renewal application without payment_account
    draft_application = Application(
        type=ApplicationType.RENEWAL.value,
        status=Application.Status.DRAFT,
        payment_account=None,
        registration_id=registration.id,
        application_json={},
        application_number=Application.generate_unique_application_number(),
    )
    draft_application.save()

    rv = client.get(f"/registrations/{registration.id}/todos", headers=headers)
    response_json = rv.json
    todos = response_json.get("todos")
    assert len(todos) == 1
    assert todos[0].get("task").get("type") == "REGISTRATION_RENEWAL_DRAFT"
    assert todos[0].get("task").get("detail") == draft_application.application_number


def test_get_todos_with_payment_due(session, client, jwt):
    """Test Payment Due application Todos."""
    headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
    headers["Account-Id"] = ACCOUNT_ID

    user = User(
        username="testUser",
        firstname="Test",
        lastname="User",
        iss="test",
        sub=f"sub{random.randint(0, 99999)}",
        idp_userid="testUserID",
        login_source="testLogin",
    )
    user.save()

    registration_end_date = datetime.now() + timedelta(days=30)
    registration = Registration(
        start_date=registration_end_date - timedelta(days=340),
        expiry_date=registration_end_date,
        status=RegistrationStatus.ACTIVE,
        registration_type="HOST",
        sbc_account_id=ACCOUNT_ID,
        registration_number="H1234567",
        user_id=user.id,
    )
    registration.save()

    # Payment due renewal application
    payment_due_application = Application(
        type=ApplicationType.RENEWAL.value,
        status=Application.Status.PAYMENT_DUE,
        payment_account=str(ACCOUNT_ID),
        registration_id=registration.id,
        application_json={},
        application_number=Application.generate_unique_application_number(),
    )
    payment_due_application.save()

    rv = client.get(f"/registrations/{registration.id}/todos", headers=headers)
    response_json = rv.json
    todos = response_json.get("todos")

    # Should only have renewal payment pending todo
    assert len(todos) == 1
    assert todos[0].get("task").get("type") == "RENEWAL_APPLICATION_PAYMENT_DUE"
    assert todos[0].get("task").get("detail") == payment_due_application.application_number

    payment_due_application.delete()

    registration_end_date = datetime.now() + timedelta(days=300)
    registration.expiry_date = registration_end_date
    registration.save()
    # Payment due registration application
    payment_due_application = Application(
        type=ApplicationType.REGISTRATION.value,
        status=Application.Status.PAYMENT_DUE,
        payment_account=str(ACCOUNT_ID),
        registration_id=registration.id,
        application_json={},
        application_number=Application.generate_unique_application_number(),
    )
    payment_due_application.save()

    rv = client.get(f"/registrations/{registration.id}/todos", headers=headers)
    response_json = rv.json
    todos = response_json.get("todos")

    # Should only have registration payment pending todo
    assert len(todos) == 1
    assert todos[0].get("task").get("type") == "REGISTRATION_APPLICATION_PAYMENT_DUE"
    assert todos[0].get("task").get("detail") == payment_due_application.application_number


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
@patch(
    "strr_api.services.approval_service.ApprovalService.getSTRDataForAddress",
    return_value={"organizationNm": "Test Municipality"},
)
def test_update_registration_str_address(mock_get_str_data, session, client, jwt):
    """Test updating the STR address for a registration."""
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        application = Application.find_by_application_number(application_number=application_number)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.status = Application.Status.FULL_REVIEW
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        rv = client.put(f"/applications/{application_number}/assign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        registration_id = response_json.get("header").get("registrationId")
        invalid_updated_address = {"unitAddress": {}}
        valid_updated_address = {
            "unitAddress": {
                "unitNumber": "1",
                "streetNumber": "66211",
                "streetName": "COTTONWOOD DR",
                "city": "MAPLE RIDGE",
                "postalCode": "V2X 3L8",
                "province": "BC",
                "locationDescription": "Located at the corner of Cottonwood Dr and 119 Ave",
            }
        }
        rv = client.patch(
            f"/registrations/{registration_id}/str-address", json=invalid_updated_address, headers=staff_headers
        )
        assert HTTPStatus.BAD_REQUEST == rv.status_code

        rv = client.patch(
            f"/registrations/{registration_id}/str-address", json=valid_updated_address, headers=staff_headers
        )
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        updated_addr_response = response_json.get("unitAddress")
        assert updated_addr_response.get("streetNumber") == "66211"
        assert updated_addr_response.get("streetName") == "COTTONWOOD DR"
        assert updated_addr_response.get("unitNumber") == "1"
        assert updated_addr_response.get("city") == "MAPLE RIDGE"
        assert updated_addr_response.get("postalCode") == "V2X 3L8"

        non_existent_reg_id = 999999
        rv = client.patch(
            f"/registrations/{non_existent_reg_id}/str-address", json=valid_updated_address, headers=staff_headers
        )
        assert HTTPStatus.NOT_FOUND == rv.status_code

        public_headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        public_headers["Account-Id"] = ACCOUNT_ID
        rv = client.patch(
            f"/registrations/{registration_id}/str-address", json=valid_updated_address, headers=public_headers
        )
        assert HTTPStatus.UNAUTHORIZED == rv.status_code


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
@patch(
    "strr_api.services.approval_service.ApprovalService.getSTRDataForAddress", side_effect=Exception("Service error")
)
def test_update_registration_str_address_service_error_with_jurisdiction(mock_get_str_data, session, client, jwt):
    """Test updating STR address when getSTRDataForAddress returns an error."""
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        application = Application.find_by_application_number(application_number=application_number)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.status = Application.Status.FULL_REVIEW
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        rv = client.put(f"/applications/{application_number}/assign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        registration_id = response_json.get("header").get("registrationId")

        valid_updated_address = {
            "unitAddress": {
                "unitNumber": "1",
                "streetNumber": "66211",
                "streetName": "COTTONWOOD DR",
                "city": "MAPLE RIDGE",
                "postalCode": "V2X 3L8",
                "province": "BC",
                "locationDescription": "Located at the corner of Cottonwood Dr and 119 Ave",
            }
        }

        rv = client.patch(
            f"/registrations/{registration_id}/str-address", json=valid_updated_address, headers=staff_headers
        )
        assert HTTPStatus.UNPROCESSABLE_ENTITY == rv.status_code
        response_json = rv.json
        assert "Error updating jurisdiction" in response_json.get("message", "")


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
@patch("strr_api.services.approval_service.ApprovalService.getSTRDataForAddress", return_value={"organizationNm": ""})
def test_update_registration_str_address_empty_jurisdiction(mock_get_str_data, session, client, jwt):
    """Test updating STR address when getSTRDataForAddress returns empty jurisdiction."""
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        application = Application.find_by_application_number(application_number=application_number)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.status = Application.Status.FULL_REVIEW
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        rv = client.put(f"/applications/{application_number}/assign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        registration_id = response_json.get("header").get("registrationId")

        valid_updated_address = {
            "unitAddress": {
                "unitNumber": "1",
                "streetNumber": "66211",
                "streetName": "COTTONWOOD DR",
                "city": "MAPLE RIDGE",
                "postalCode": "V2X 3L8",
                "province": "BC",
                "locationDescription": "Located at the corner of Cottonwood Dr and 119 Ave",
            }
        }

        rv = client.patch(
            f"/registrations/{registration_id}/str-address", json=valid_updated_address, headers=staff_headers
        )
        assert HTTPStatus.UNPROCESSABLE_ENTITY == rv.status_code
        response_json = rv.json
        assert "No jurisdiction found for address" in response_json.get("message", "")


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_update_registration_str_address_with_jurisdiction(session, client, jwt):
    """Test updating STR address when jurisdiction is provided in unit address."""
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        application = Application.find_by_application_number(application_number=application_number)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.status = Application.Status.FULL_REVIEW
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        rv = client.put(f"/applications/{application_number}/assign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        registration_id = response_json.get("header").get("registrationId")

        valid_updated_address_with_jurisdiction = {
            "unitAddress": {
                "unitNumber": "1",
                "streetNumber": "66211",
                "streetName": "COTTONWOOD DR",
                "city": "MAPLE RIDGE",
                "postalCode": "V2X 3L8",
                "province": "BC",
                "locationDescription": "Located at the corner of Cottonwood Dr and 119 Ave",
                "jurisdiction": "Custom Municipality",
            }
        }

        rv = client.patch(
            f"/registrations/{registration_id}/str-address",
            json=valid_updated_address_with_jurisdiction,
            headers=staff_headers,
        )
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        updated_addr_response = response_json.get("unitAddress")
        assert updated_addr_response.get("streetNumber") == "66211"
        assert updated_addr_response.get("streetName") == "COTTONWOOD DR"
        assert updated_addr_response.get("unitNumber") == "1"

        unit_details = response_json.get("unitDetails")
        assert unit_details.get("jurisdiction") == "Custom Municipality"


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_set_aside_registration_decision(session, client, jwt):
    """Test setting aside a registration decision."""
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        application = Application.find_by_application_number(application_number=application_number)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.status = Application.Status.FULL_REVIEW
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        rv = client.put(f"/applications/{application_number}/assign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        registration_id = response_json.get("header").get("registrationId")

        rv = client.put(f"/registrations/{registration_id}/assign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        rv = client.post(f"/registrations/{registration_id}/decision/set-aside", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("header").get("isSetAside") is True
        assert response_json.get("header").get("examinerActions") == ["APPROVE", "CANCEL"]

        public_headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        public_headers["Account-Id"] = ACCOUNT_ID
        rv = client.post(f"/registrations/{registration_id}/decision/set-aside", headers=public_headers)
        assert HTTPStatus.UNAUTHORIZED == rv.status_code

        non_existent_reg_id = 999999
        rv = client.post(f"/registrations/{non_existent_reg_id}/decision/set-aside", headers=staff_headers)
        assert HTTPStatus.NOT_FOUND == rv.status_code


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_reinstate_registration_using_status_endpoint(session, client, jwt):
    """Test reinstating a registration using the /status endpoint after set-aside."""
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        application = Application.find_by_application_number(application_number=application_number)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.status = Application.Status.FULL_REVIEW
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        rv = client.put(f"/applications/{application_number}/assign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        registration_id = response_json.get("header").get("registrationId")

        rv = client.post(f"/registrations/{registration_id}/decision/set-aside", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("header").get("isSetAside") is True

        status_update_request = {"status": RegistrationStatus.ACTIVE.value}
        rv = client.put(f"/registrations/{registration_id}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("status") == RegistrationStatus.ACTIVE.value


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_set_aside_registration_events(session, client, jwt):
    """Test that set-aside registration creates proper events."""
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        application = Application.find_by_application_number(application_number=application_number)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.status = Application.Status.FULL_REVIEW
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        rv = client.put(f"/applications/{application_number}/assign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        registration_id = response_json.get("header").get("registrationId")

        rv = client.post(f"/registrations/{registration_id}/decision/set-aside", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code

        rv = client.get(f"/registrations/{registration_id}/events", headers=headers)
        assert HTTPStatus.OK == rv.status_code
        events = rv.json
        event_names = [event.get("eventName") for event in events]
        assert Events.EventName.REGISTRATION_CREATED in event_names
        assert Events.EventName.REGISTRATION_DECISION_SET_ASIDE in event_names

        status_update_request = {"status": RegistrationStatus.ACTIVE.value}
        rv = client.put(f"/registrations/{registration_id}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code

        rv = client.get(f"/registrations/{registration_id}/events", headers=headers)
        assert HTTPStatus.OK == rv.status_code
        events = rv.json
        event_names = [event.get("eventName") for event in events]
        assert Events.EventName.REGISTRATION_CREATED in event_names
        assert Events.EventName.REGISTRATION_DECISION_SET_ASIDE in event_names
        assert Events.EventName.REGISTRATION_APPROVED in event_names

        status_update_request = {"status": RegistrationStatus.SUSPENDED.value}
        rv = client.put(f"/registrations/{registration_id}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code

        status_update_request = {"status": RegistrationStatus.ACTIVE.value}
        rv = client.put(f"/registrations/{registration_id}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code

        rv = client.get(f"/registrations/{registration_id}/events", headers=headers)
        assert HTTPStatus.OK == rv.status_code
        events = rv.json
        event_names = [event.get("eventName") for event in events]
        assert Events.EventName.REGISTRATION_REINSTATED in event_names


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_cancel_registration_using_status_endpoint(session, client, jwt):
    """Test canceling a registration using the /status endpoint after set-aside."""
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        application = Application.find_by_application_number(application_number=application_number)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.status = Application.Status.FULL_REVIEW
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        rv = client.put(f"/applications/{application_number}/assign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        registration_id = response_json.get("header").get("registrationId")

        rv = client.put(f"/registrations/{registration_id}/assign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        rv = client.post(f"/registrations/{registration_id}/decision/set-aside", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code

        status_update_request = {"status": RegistrationStatus.CANCELLED.value}
        rv = client.put(f"/registrations/{registration_id}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("status") == RegistrationStatus.CANCELLED.value
        assert response_json.get("cancelledDate") is not None


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_upload_registration_document(session, client, jwt):
    """Test successful document upload to registration with NOC_PENDING status."""
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        application = Application.find_by_application_number(application_number=application_number)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.status = Application.Status.FULL_REVIEW
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        rv = client.put(f"/applications/{application_number}/assign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        registration_id = response_json.get("header").get("registrationId")
        registration = Registration.query.filter_by(id=registration_id).one_or_none()

        with patch(
            "strr_api.services.gcp_storage_service.GCPStorageService.upload_registration_document",
            return_value="Test Key",
        ):
            with open(MOCK_DOCUMENT_UPLOAD, "rb") as df:
                data = {"file": (df, MOCK_DOCUMENT_UPLOAD)}
                rv = client.post(
                    f"/registrations/{registration_id}/documents",
                    content_type="multipart/form-data",
                    data=data,
                    headers=headers,
                )
                assert rv.status_code == HTTPStatus.BAD_REQUEST

            with open(MOCK_DOCUMENT_UPLOAD, "rb") as df:
                data = {"file": (df, MOCK_DOCUMENT_UPLOAD)}
                rv_staff = client.post(
                    f"/registrations/{registration_id}/documents",
                    content_type="multipart/form-data",
                    data=data,
                    headers=staff_headers,
                )
                assert rv_staff.status_code == HTTPStatus.CREATED

            registration.noc_status = RegistrationNocStatus.NOC_PENDING.value
            registration.save()
            with open(MOCK_DOCUMENT_UPLOAD, "rb") as df:
                data = {"file": (df, MOCK_DOCUMENT_UPLOAD)}
                rv = client.post(
                    f"/registrations/{registration_id}/documents",
                    content_type="multipart/form-data",
                    data=data,
                    headers=headers,
                )
                assert rv.status_code == HTTPStatus.CREATED

            registration.noc_status = RegistrationNocStatus.NOC_EXPIRED.value
            registration.save()
            with open(MOCK_DOCUMENT_UPLOAD, "rb") as df:
                data = {"file": (df, MOCK_DOCUMENT_UPLOAD)}
                rv = client.post(
                    f"/registrations/{registration_id}/documents",
                    content_type="multipart/form-data",
                    data=data,
                    headers=headers,
                )
                assert rv.status_code == HTTPStatus.BAD_REQUEST

            with open(MOCK_DOCUMENT_UPLOAD, "rb") as df:
                data = {"file": (df, MOCK_DOCUMENT_UPLOAD)}
                rv_staff = client.post(
                    f"/registrations/{registration_id}/documents",
                    content_type="multipart/form-data",
                    data=data,
                    headers=staff_headers,
                )
                assert rv_staff.status_code == HTTPStatus.CREATED


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_send_notice_of_consideration_success(mock_invoice, session, client, jwt):
    """Test successful sending of notice of consideration for registration."""
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        application = Application.find_by_application_number(application_number=application_number)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.status = Application.Status.FULL_REVIEW
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        rv = client.put(f"/applications/{application_number}/assign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        registration_id = response_json.get("header").get("registrationId")

        rv = client.put(f"/registrations/{registration_id}/assign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        noc_request = {"content": "This is a test notice of consideration for your registration."}
        rv = client.post(
            f"/registrations/{registration_id}/notice-of-consideration", json=noc_request, headers=staff_headers
        )
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("nocStatus") == RegistrationNocStatus.NOC_PENDING.value
        assert response_json.get("nocStartDate") is not None
        assert response_json.get("nocEndDate") is not None

        rv = client.get(f"/registrations/{registration_id}/events", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        events = rv.json
        event_names = [event.get("eventName") for event in events]
        assert Events.EventName.NOC_SENT in event_names


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_send_notice_of_consideration_validation_errors(mock_invoice, session, client, jwt):
    """Test validation errors when sending notice of consideration."""
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        application = Application.find_by_application_number(application_number=application_number)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.status = Application.Status.FULL_REVIEW  # Move to assignable state
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        # Assign application first
        rv = client.put(f"/applications/{application_number}/assign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        registration_id = response_json.get("header").get("registrationId")

        noc_request = {"content": ""}
        rv = client.post(
            f"/registrations/{registration_id}/notice-of-consideration", json=noc_request, headers=staff_headers
        )
        assert HTTPStatus.BAD_REQUEST == rv.status_code

        noc_request = {"content": "   "}
        rv = client.post(
            f"/registrations/{registration_id}/notice-of-consideration", json=noc_request, headers=staff_headers
        )
        assert HTTPStatus.BAD_REQUEST == rv.status_code

        noc_request = {}
        rv = client.post(
            f"/registrations/{registration_id}/notice-of-consideration", json=noc_request, headers=staff_headers
        )
        assert HTTPStatus.BAD_REQUEST == rv.status_code

        noc_request = {"content": "This is a notice of consideration."}
        rv = client.post(f"/registrations/{registration_id}/notice-of-consideration", json=noc_request, headers=headers)
        assert HTTPStatus.UNAUTHORIZED == rv.status_code

        non_existent_reg_id = 999999
        rv = client.post(
            f"/registrations/{non_existent_reg_id}/notice-of-consideration", json=noc_request, headers=staff_headers
        )
        assert HTTPStatus.NOT_FOUND == rv.status_code


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_assign_and_unassign_registration(session, client, jwt):
    """Test assigning and unassigning a registration to a staff user."""
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        application = Application.find_by_application_number(application_number=application_number)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.status = Application.Status.FULL_REVIEW
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        rv = client.put(f"/applications/{application_number}/assign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        registration_id = response_json.get("header").get("registrationId")

        rv = client.put(f"/registrations/{registration_id}/assign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("header").get("assignee") != {}
        assert response_json.get("header").get("assignee").get("username") is not None

        rv = client.put(f"/registrations/{registration_id}/unassign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("header").get("assignee") == {}

        registration = Registration.query.filter_by(id=registration_id).one_or_none()
        registration.status = RegistrationStatus.EXPIRED
        registration.save()

        rv = client.put(f"/registrations/{registration_id}/assign", headers=staff_headers)
        assert HTTPStatus.BAD_REQUEST == rv.status_code

        rv = client.put(f"/registrations/{registration_id}/unassign", headers=staff_headers)
        assert HTTPStatus.BAD_REQUEST == rv.status_code

        non_existent_reg_id = 999999
        rv = client.put(f"/registrations/{non_existent_reg_id}/assign", headers=staff_headers)
        assert HTTPStatus.NOT_FOUND == rv.status_code

        rv = client.put(f"/registrations/{non_existent_reg_id}/unassign", headers=staff_headers)
        assert HTTPStatus.NOT_FOUND == rv.status_code


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_registration_status_update_sets_decider_id(session, client, jwt):
    """Test that updating registration status sets the decider_id field."""
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        application = Application.find_by_application_number(application_number=application_number)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.status = Application.Status.FULL_REVIEW
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        rv = client.put(f"/applications/{application_number}/assign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        registration_id = response_json.get("header").get("registrationId")

        registration = Registration.query.filter_by(id=registration_id).one_or_none()
        initial_decider_id = registration.decider_id
        assert initial_decider_id is not None

        rv = client.put(f"/registrations/{registration_id}/assign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        status_update_request = {"status": RegistrationStatus.CANCELLED.value}
        rv = client.put(f"/registrations/{registration_id}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("status") == RegistrationStatus.CANCELLED.value
        assert response_json.get("cancelledDate") is not None

        registration = Registration.query.filter_by(id=registration_id).one_or_none()
        assert registration.decider_id is not None

        assert response_json.get("header").get("decider") != {}
        assert response_json.get("header").get("decider").get("username") is not None


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_application_status_update_sets_decider_id(session, client, jwt):
    """Test that updating application status sets the decider_id field."""
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        application = Application.find_by_application_number(application_number=application_number)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.status = Application.Status.FULL_REVIEW
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        rv = client.put(f"/applications/{application_number}/assign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("header").get("status") == Application.Status.FULL_REVIEW_APPROVED

        assert response_json.get("header").get("decider") != {}
        assert response_json.get("header").get("decider").get("username") is not None

        application = Application.find_by_application_number(application_number=application_number)
        assert application.decider_id is not None

        application.status = Application.Status.FULL_REVIEW
        application.decider_id = None
        application.save()

        status_update_request = {"status": Application.Status.DECLINED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("header").get("status") == Application.Status.DECLINED

        assert response_json.get("header").get("decider") != {}
        assert response_json.get("header").get("decider").get("username") is not None

        application = Application.find_by_application_number(application_number=application_number)
        assert application.decider_id is not None


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_add_conditions_on_registration(session, client, jwt):
    """Test reinstating a registration using the /status endpoint after set-aside."""
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        application = Application.find_by_application_number(application_number=application_number)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.status = Application.Status.FULL_REVIEW
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        rv = client.put(f"/applications/{application_number}/assign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        registration_id = response_json.get("header").get("registrationId")

        conditions_of_approval_request = {
            "status": "ACTIVE",
            "conditionsOfApproval": {
                "predefinedConditions": ["PR", "BL"],
                "customConditions": ["Condition 1", "Condition 2"],
                "minBookingDays": 30,
            },
        }
        rv = client.put(
            f"/registrations/{registration_id}/status", json=conditions_of_approval_request, headers=staff_headers
        )
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("status") == RegistrationStatus.ACTIVE.value
        assert response_json.get("conditionsOfApproval") is not None
        assert response_json.get("conditionsOfApproval").get("predefinedConditions") == ["PR", "BL"]
        assert response_json.get("conditionsOfApproval").get("customConditions") == ["Condition 1", "Condition 2"]


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_clear_conditions_on_registration(session, client, jwt):
    """Test reinstating a registration using the /status endpoint after set-aside."""
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        application = Application.find_by_application_number(application_number=application_number)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.status = Application.Status.FULL_REVIEW
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        rv = client.put(f"/applications/{application_number}/assign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        registration_id = response_json.get("header").get("registrationId")

        conditions_of_approval_request = {
            "status": "ACTIVE",
            "conditionsOfApproval": {
                "predefinedConditions": ["PR", "BL"],
                "customConditions": ["Condition 1", "Condition 2"],
                "minBookingDays": 30,
            },
        }
        rv = client.put(
            f"/registrations/{registration_id}/status", json=conditions_of_approval_request, headers=staff_headers
        )
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("status") == RegistrationStatus.ACTIVE.value
        assert response_json.get("conditionsOfApproval") is not None
        assert response_json.get("conditionsOfApproval").get("predefinedConditions") == ["PR", "BL"]
        assert response_json.get("conditionsOfApproval").get("customConditions") == ["Condition 1", "Condition 2"]

        conditions_of_approval_request = {"status": "ACTIVE"}
        rv = client.put(
            f"/registrations/{registration_id}/status", json=conditions_of_approval_request, headers=staff_headers
        )
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("status") == RegistrationStatus.ACTIVE.value
        assert response_json.get("conditionsOfApproval") is None


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_clear_predefined_conditions(session, client, jwt):
    """Test reinstating a registration using the /status endpoint after set-aside."""
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        application = Application.find_by_application_number(application_number=application_number)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.status = Application.Status.FULL_REVIEW
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        rv = client.put(f"/applications/{application_number}/assign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        registration_id = response_json.get("header").get("registrationId")

        conditions_of_approval_request = {
            "status": "ACTIVE",
            "conditionsOfApproval": {
                "predefinedConditions": ["PR", "BL"],
                "customConditions": ["Condition 1", "Condition 2"],
                "minBookingDays": 30,
            },
        }
        rv = client.put(
            f"/registrations/{registration_id}/status", json=conditions_of_approval_request, headers=staff_headers
        )
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("status") == RegistrationStatus.ACTIVE.value
        assert response_json.get("conditionsOfApproval") is not None
        assert response_json.get("conditionsOfApproval").get("predefinedConditions") == ["PR", "BL"]
        assert response_json.get("conditionsOfApproval").get("customConditions") == ["Condition 1", "Condition 2"]

        conditions_of_approval_request = {
            "status": "ACTIVE",
            "conditionsOfApproval": {
                "predefinedConditions": [],
                "customConditions": ["Condition 1", "Condition 2"],
                "minBookingDays": 30,
            },
        }
        rv = client.put(
            f"/registrations/{registration_id}/status", json=conditions_of_approval_request, headers=staff_headers
        )
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("status") == RegistrationStatus.ACTIVE.value
        assert response_json.get("conditionsOfApproval") is not None
        assert response_json.get("conditionsOfApproval").get("predefinedConditions") == []
        assert response_json.get("conditionsOfApproval").get("customConditions") == ["Condition 1", "Condition 2"]
