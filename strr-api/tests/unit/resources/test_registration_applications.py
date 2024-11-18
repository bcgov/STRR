import json
import os
from datetime import datetime
from http import HTTPStatus
from unittest.mock import patch

import pytest

from strr_api.enums.enum import PaymentStatus
from strr_api.models import Application, Events
from strr_api.models.application import ApplicationSerializer
from tests.unit.utils.auth_helpers import PUBLIC_USER, STRR_EXAMINER, create_header

CREATE_HOST_REGISTRATION_REQUEST = os.path.join(
    os.path.dirname(os.path.realpath(__file__)), "../../mocks/json/host_registration.json"
)
CREATE_PROPERTY_MANAGER_HOST_REGISTRATION_REQUEST = os.path.join(
    os.path.dirname(os.path.realpath(__file__)), "../../mocks/json/host_registration_property_manager.json"
)
CREATE_HOST_REGISTRATION_MINIMUM_FIELDS_REQUEST = os.path.join(
    os.path.dirname(os.path.realpath(__file__)), "../../mocks/json/host_registration_minimum.json"
)
CREATE_PLATFORM_REGISTRATION_REQUEST = os.path.join(
    os.path.dirname(os.path.realpath(__file__)), "../../mocks/json/platform_registration.json"
)
CREATE_STRATA_HOTEL_REGISTRATION_REQUEST = os.path.join(
    os.path.dirname(os.path.realpath(__file__)), "../../mocks/json/strata_hotel_registration.json"
)
CREATE_HOST_REGISTRATION_BUSINESS_AS_HOST = os.path.join(
    os.path.dirname(os.path.realpath(__file__)), "../../mocks/json/business_as_host.json"
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


def test_save_and_resume_applications(session, client, jwt):
    with open(CREATE_HOST_REGISTRATION_BUSINESS_AS_HOST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        headers["isDraft"] = True
        json_data = json.load(f)

        rv = client.post("/applications", json=json_data, headers=headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        rv = client.put(f"/applications/{application_number}", json=json_data, headers=headers)
        assert HTTPStatus.OK == rv.status_code


def test_staff_cannot_access_draft_applications(session, client, jwt):
    headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
    rv = client.get("/applications/search", headers=headers)
    assert HTTPStatus.OK == rv.status_code
    applications = rv.json
    assert len(applications.get("applications")) == 0


@pytest.mark.parametrize(
    "request_json",
    [
        CREATE_HOST_REGISTRATION_REQUEST,
        CREATE_PROPERTY_MANAGER_HOST_REGISTRATION_REQUEST,
    ],
)
@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_create_host_registration_application(session, client, jwt, request_json):
    with open(request_json) as f:
        json_data = json.load(f)
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        rv = client.post("/applications", json=json_data, headers=headers)

    assert HTTPStatus.OK == rv.status_code
    response_json = rv.json
    assert response_json.get("header").get("hostStatus") == "Payment Due"
    assert response_json.get("header").get("examinerStatus") == "Payment Due"
    assert response_json.get("header").get("examinerActions") == []
    assert response_json.get("header").get("hostActions") == ApplicationSerializer.HOST_ACTIONS.get(
        Application.Status.PAYMENT_DUE
    )


def test_get_applications(session, client, jwt):
    headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
    headers["Account-Id"] = ACCOUNT_ID
    rv = client.get("/applications", headers=headers)

    assert HTTPStatus.OK == rv.status_code
    response_json = rv.json
    assert len(response_json.get("applications")) == 3


def test_get_applications_by_registration_type(session, client, jwt):
    headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
    headers["Account-Id"] = ACCOUNT_ID
    rv = client.get("/applications?registrationType=HOST", headers=headers)

    assert HTTPStatus.OK == rv.status_code
    response_json = rv.json
    assert len(response_json.get("applications")) == 3

    rv = client.get("/applications?registrationType=PLATFORM", headers=headers)

    assert HTTPStatus.OK == rv.status_code
    response_json = rv.json
    assert len(response_json.get("applications")) == 0


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_get_application_details(session, client, jwt):
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        json_data = json.load(f)
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        rv = client.post("/applications", json=json_data, headers=headers)

        assert HTTPStatus.OK == rv.status_code
        application_number = rv.json.get("header").get("applicationNumber")

        rv = client.get(f"/applications/{application_number}", headers=headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert (response_json.get("header").get("applicationNumber")) == application_number

        rv = client.get(f"/applications/{application_number}")
        assert HTTPStatus.UNAUTHORIZED == rv.status_code

        rv = client.get(f"/applications/{application_number}1", headers=headers)
        assert HTTPStatus.NOT_FOUND == rv.status_code


def test_get_applications_invalid_account(session, client, jwt):
    headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
    headers["Account-Id"] = 456
    rv = client.get("/applications", headers=headers)

    assert HTTPStatus.OK == rv.status_code
    response_json = rv.json
    assert len(response_json.get("applications")) == 0


def test_get_application_details_with_multiple_accounts(session, client, jwt):
    secondary_account = 456
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        json_data = json.load(f)
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")

        with patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE):
            headers["Account-Id"] = ACCOUNT_ID
            rv = client.post("/applications", json=json_data, headers=headers)
            assert HTTPStatus.OK == rv.status_code
            print(rv.json)
            application_number = rv.json.get("header").get("applicationNumber")

        mock_invoice_response_2 = {
            "id": 123,
            "statusCode": "CREATED",
            "paymentAccount": {"accountId": secondary_account},
        }
        with patch("strr_api.services.strr_pay.create_invoice", return_value=mock_invoice_response_2):
            headers["Account-Id"] = secondary_account
            rv = client.post("/applications", json=json_data, headers=headers)
            assert HTTPStatus.OK == rv.status_code
            print(rv.json)
            application_number_2 = rv.json.get("header").get("applicationNumber")

        headers["Account-Id"] = ACCOUNT_ID
        rv = client.get(f"/applications/{application_number}", headers=headers)
        assert HTTPStatus.OK == rv.status_code

        rv = client.get(f"/applications/{application_number_2}", headers=headers)
        assert HTTPStatus.NOT_FOUND == rv.status_code

        headers["Account-Id"] = secondary_account
        rv = client.get(f"/applications/{application_number}", headers=headers)
        assert HTTPStatus.NOT_FOUND == rv.status_code

        rv = client.get(f"/applications/{application_number_2}", headers=headers)
        assert HTTPStatus.OK == rv.status_code


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_create_application_with_minimum_fields(session, client, jwt):
    with open(CREATE_HOST_REGISTRATION_MINIMUM_FIELDS_REQUEST) as f:
        json_data = json.load(f)
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        rv = client.post("/applications", json=json_data, headers=headers)

    assert HTTPStatus.OK == rv.status_code


def test_create_application_invalid_request(session, client, jwt):
    headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
    headers["Account-Id"] = ACCOUNT_ID
    rv = client.post("/applications", json={}, headers=headers)
    assert HTTPStatus.BAD_REQUEST == rv.status_code
    response_json = rv.json
    assert response_json.get("message") == "Invalid request"
    assert response_json.get("details", [])[0].get("message") == "'registration' is a required property"


def test_get_application_ltsa_unauthorized(session, client, jwt):
    headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
    headers["Account-Id"] = ACCOUNT_ID
    rv = client.get("/applications/1/ltsa", headers=headers)
    assert HTTPStatus.UNAUTHORIZED == rv.status_code


def test_get_application_ltsa_invalid_application(session, client, jwt):
    headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
    rv = client.get("/applications/100/ltsa", headers=headers)
    assert HTTPStatus.NOT_FOUND == rv.status_code


def test_get_application_ltsa(session, client, jwt):
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        json_data = json.load(f)
        application = Application(
            type="registration",
            application_json=json_data,
            application_number=Application.generate_unique_application_number(),
        )
        application.save()
        headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        rv = client.get(f"/applications/{application.application_number}/ltsa", headers=headers)

        assert HTTPStatus.OK == rv.status_code


def test_get_application_auto_approval_unauthorized(session, client, jwt):
    headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
    headers["Account-Id"] = ACCOUNT_ID
    rv = client.get("/applications/1/auto-approval-records", headers=headers)
    assert HTTPStatus.UNAUTHORIZED == rv.status_code


def test_get_application_auto_approval_invalid_application(session, client, jwt):
    headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
    rv = client.get("/applications/100/auto-approval-records", headers=headers)
    assert HTTPStatus.NOT_FOUND == rv.status_code


def test_get_application_auto_approval(session, client, jwt):
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        json_data = json.load(f)
        application = Application(
            type="registration",
            application_json=json_data,
            application_number=Application.generate_unique_application_number(),
        )
        application.save()
        headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        rv = client.get(f"/applications/{application.application_number}/auto-approval-records", headers=headers)

        assert HTTPStatus.OK == rv.status_code


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_get_application_events_user(session, client, jwt):
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        json_data = json.load(f)
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        rv = client.post("/applications", json=json_data, headers=headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        rv = client.get(f"/applications/{application_number}/events", headers=headers)
        assert HTTPStatus.OK == rv.status_code
        events_response = rv.json
        assert events_response[0].get("eventName") == Events.EventName.APPLICATION_SUBMITTED
        assert events_response[0].get("eventType") == Events.EventType.APPLICATION


def test_update_application_payment(session, client, jwt):
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        with patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE):
            json_data = json.load(f)
            rv = client.post("/applications", json=json_data, headers=headers)
            response_json = rv.json
            application_number = response_json.get("header").get("applicationNumber")
        with patch(
            "strr_api.services.strr_pay.get_payment_details_by_invoice_id", return_value=MOCK_PAYMENT_COMPLETED_RESPONSE
        ):
            rv = client.put(f"/applications/{application_number}/payment-details", json={}, headers=headers)
            assert HTTPStatus.OK == rv.status_code
            response_json = rv.json
            assert response_json.get("header").get("status") == Application.Status.PAID
            assert response_json.get("header").get("hostStatus") == "Pending Approval"
            assert response_json.get("header").get("examinerStatus") == "Paid"
            assert response_json.get("header").get("examinerActions") == []
            assert response_json.get("header").get("hostActions") == []


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_examiner_reject_application(session, client, jwt):
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        application = Application.find_by_application_number(application_number=application_number)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        status_update_request = {"status": "DECLINED"}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("header").get("status") == Application.Status.DECLINED
        assert response_json.get("header").get("hostStatus") == "Declined"
        assert response_json.get("header").get("examinerStatus") == "Declined"
        assert response_json.get("header").get("reviewer").get("username") is not None
        assert response_json.get("header").get("examinerActions") == []
        assert response_json.get("header").get("hostActions") == []


@pytest.mark.parametrize(
    "request_json, isUnitOnPrincipalResidence",
    [
        (CREATE_HOST_REGISTRATION_REQUEST, True),
        (CREATE_HOST_REGISTRATION_REQUEST, False),
        (CREATE_PROPERTY_MANAGER_HOST_REGISTRATION_REQUEST, True),
        (CREATE_PROPERTY_MANAGER_HOST_REGISTRATION_REQUEST, False),
    ],
)
@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_examiner_approve_host_registration_application(session, client, jwt, request_json, isUnitOnPrincipalResidence):
    with open(request_json) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)

        if not isUnitOnPrincipalResidence:
            json_data["registration"]["unitDetails"]["isUnitOnPrincipalResidenceProperty"] = False
            del json_data["registration"]["unitDetails"]["hostResidence"]

        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        application = Application.find_by_application_number(application_number=application_number)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("header").get("status") == Application.Status.FULL_REVIEW_APPROVED
        assert response_json.get("header").get("reviewer").get("username") is not None
        assert response_json.get("header").get("registrationId") is not None
        assert response_json.get("header").get("registrationNumber") is not None
        assert response_json.get("header").get("hostStatus") == "Approved"
        assert response_json.get("header").get("examinerStatus") == "Approved – Examined"
        assert response_json.get("header").get("examinerActions") == ApplicationSerializer.EXAMINER_ACTIONS.get(
            Application.Status.FULL_REVIEW_APPROVED
        )
        assert response_json.get("header").get("hostActions") == []


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_examiner_approve_platform_registration_application(session, client, jwt):
    with open(CREATE_PLATFORM_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        application = Application.find_by_application_number(application_number=application_number)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("header").get("status") == Application.Status.FULL_REVIEW_APPROVED
        assert response_json.get("header").get("reviewer").get("username") is not None
        assert response_json.get("header").get("registrationId") is not None
        assert response_json.get("header").get("registrationNumber") is not None
        assert response_json.get("header").get("hostStatus") == "Approved"
        assert response_json.get("header").get("examinerStatus") == "Approved – Examined"
        assert response_json.get("header").get("examinerActions") == ApplicationSerializer.EXAMINER_ACTIONS.get(
            Application.Status.FULL_REVIEW_APPROVED
        )
        assert response_json.get("header").get("hostActions") == []


def test_post_and_delete_registration_documents(session, client, jwt):
    with patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE):
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
            json_data = json.load(f)
            rv = client.post("/applications", json=json_data, headers=headers)
            response_json = rv.json
            application_number = response_json.get("header").get("applicationNumber")
            with patch(
                "strr_api.services.gcp_storage_service.GCPStorageService.upload_registration_document",
                return_value="Test Key",
            ):
                with open(MOCK_DOCUMENT_UPLOAD, "rb") as df:
                    data = {"file": (df, MOCK_DOCUMENT_UPLOAD)}
                    rv = client.post(
                        f"/applications/{application_number}/documents",
                        content_type="multipart/form-data",
                        data=data,
                        headers=headers,
                    )

                    assert rv.status_code == HTTPStatus.CREATED
                    fileKey = rv.json.get("fileKey")
                    assert fileKey == "Test Key"
                    with patch(
                        "strr_api.services.gcp_storage_service.GCPStorageService.delete_registration_document",
                        return_value="Test Key",
                    ):
                        rv = client.delete(f"/applications/{application_number}/documents/{fileKey}", headers=headers)
                        assert rv.status_code == HTTPStatus.NO_CONTENT


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_search_applications(session, client, jwt):
    with open(CREATE_HOST_REGISTRATION_MINIMUM_FIELDS_REQUEST) as f:
        json_data = json.load(f)
        json_data["registration"]["unitAddress"]["address"] = "12144 GREENWELL ST MAPLE RIDGE"
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        rv = client.post("/applications", json=json_data, headers=headers)
        assert HTTPStatus.OK == rv.status_code

        headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        rv = client.get("/applications/search?text=12177 GREENWELL ST", headers=headers)
        assert HTTPStatus.OK == rv.status_code
        applications = rv.json
        assert len(applications.get("applications")) == 0

        rv = client.get("/applications/search?text=12144 GREENWELL", headers=headers)
        assert HTTPStatus.OK == rv.status_code
        applications = rv.json
        assert len(applications.get("applications")) == 1


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_create_platform_registration_application(session, client, jwt):
    with open(CREATE_PLATFORM_REGISTRATION_REQUEST) as f:
        json_data = json.load(f)
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        rv = client.post("/applications", json=json_data, headers=headers)

    assert HTTPStatus.OK == rv.status_code


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_actions_for_application_in_full_review(session, client, jwt):
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        application = Application.find_by_application_number(application_number=application_number)
        application.status = Application.Status.FULL_REVIEW
        application.save()

        rv = client.get(f"/applications/{application_number}", headers=headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("header").get("status") == Application.Status.FULL_REVIEW
        assert response_json.get("header").get("hostStatus") == "Pending Approval"
        assert response_json.get("header").get("examinerStatus") == "Full Examination"
        assert response_json.get("header").get("examinerActions") == ApplicationSerializer.EXAMINER_ACTIONS.get(
            Application.Status.FULL_REVIEW
        )
        assert response_json.get("header").get("hostActions") == []


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_create_strata_hotel_registration_application(session, client, jwt):
    with open(CREATE_STRATA_HOTEL_REGISTRATION_REQUEST) as f:
        json_data = json.load(f)
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        rv = client.post("/applications", json=json_data, headers=headers)

    assert HTTPStatus.OK == rv.status_code


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_create_strata_hotel_registration_application_bad_request(session, client, jwt):
    with open(CREATE_STRATA_HOTEL_REGISTRATION_REQUEST) as f:
        json_data = json.load(f)
        del json_data["registration"]["strataHotelRepresentatives"]
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        rv = client.post("/applications", json=json_data, headers=headers)

    assert HTTPStatus.BAD_REQUEST == rv.status_code


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_create_registration_application_with_business_as_a_host(session, client, jwt):
    with open(CREATE_HOST_REGISTRATION_BUSINESS_AS_HOST) as f:
        json_data = json.load(f)
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        rv = client.post("/applications", json=json_data, headers=headers)

    assert HTTPStatus.OK == rv.status_code


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_approve_registration_application_with_business_as_a_host(session, client, jwt):
    with open(CREATE_HOST_REGISTRATION_BUSINESS_AS_HOST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)

        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        application = Application.find_by_application_number(application_number=application_number)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("header").get("status") == Application.Status.FULL_REVIEW_APPROVED
        assert response_json.get("header").get("reviewer").get("username") is not None
        assert response_json.get("header").get("registrationId") is not None
        assert response_json.get("header").get("registrationNumber") is not None
        assert response_json.get("header").get("hostStatus") == "Approved"
        assert response_json.get("header").get("examinerStatus") == "Approved – Examined"
        assert response_json.get("header").get("examinerActions") == ApplicationSerializer.EXAMINER_ACTIONS.get(
            Application.Status.FULL_REVIEW_APPROVED
        )
        assert response_json.get("header").get("hostActions") == []


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_examiner_approve_strata_hotel_registration_application(session, client, jwt):
    with open(CREATE_STRATA_HOTEL_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        application = Application.find_by_application_number(application_number=application_number)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("header").get("status") == Application.Status.FULL_REVIEW_APPROVED
        assert response_json.get("header").get("reviewer").get("username") is not None
        assert response_json.get("header").get("registrationId") is not None
        assert response_json.get("header").get("registrationNumber") is not None
        assert response_json.get("header").get("registrationNumber").startswith("ST")
        assert response_json.get("header").get("hostStatus") == "Approved"
        assert response_json.get("header").get("examinerStatus") == "Approved – Examined"
        assert response_json.get("header").get("examinerActions") == ApplicationSerializer.EXAMINER_ACTIONS.get(
            Application.Status.FULL_REVIEW_APPROVED
        )
        assert response_json.get("header").get("hostActions") == []


@patch("strr_api.services.strr_pay.create_invoice", return_value=None)
def test_create_application_invoice_failure(session, client, jwt):
    with open(CREATE_STRATA_HOTEL_REGISTRATION_REQUEST) as f:
        json_data = json.load(f)
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        rv = client.post("/applications", json=json_data, headers=headers)

    assert HTTPStatus.PAYMENT_REQUIRED == rv.status_code


def test_save_and_resume_applications(session, client, jwt):
    with open(CREATE_HOST_REGISTRATION_BUSINESS_AS_HOST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        headers["isDraft"] = True
        json_data = json.load(f)

        rv = client.post("/applications", json=json_data, headers=headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        rv = client.put(f"/applications/{application_number}", json=json_data, headers=headers)
        assert HTTPStatus.OK == rv.status_code


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_save_and_resume_failed_for_paid_applications(session, client, jwt):
    with open(CREATE_HOST_REGISTRATION_BUSINESS_AS_HOST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)

        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")

        rv = client.put(f"/applications/{application_number}", json=json_data, headers=headers)
        assert HTTPStatus.BAD_REQUEST == rv.status_code
