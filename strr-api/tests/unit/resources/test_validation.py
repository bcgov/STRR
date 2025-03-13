import json
import os
from datetime import datetime
from http import HTTPStatus
from unittest.mock import patch

from strr_api.enums.enum import PaymentStatus, RegistrationStatus
from strr_api.models import Application, Events
from tests.unit.utils.auth_helpers import PUBLIC_USER, STRR_EXAMINER, create_header

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


def test_permit_does_not_exist(session, client, jwt):
    headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
    validate_permit_request = {"identifier": "H123", "address": {"streetNumber": "2435", "postalCode": "V4A 8H4"}}
    rv = client.post("/permits/:validatePermit", json=validate_permit_request, headers=headers)
    response_json = rv.json
    assert rv.status_code == HTTPStatus.NOT_FOUND
    assert len(response_json.get("errors")) == 1
    assert response_json.get("errors")[0].get("code") == "PERMIT_NOT_FOUND"
    assert response_json.get("errors")[0].get("message") == "Permit does not exist."

    rv = client.post("/v1/permits/:validatePermit", json=validate_permit_request, headers=headers)
    response_json = rv.json
    assert rv.status_code == HTTPStatus.NOT_FOUND
    assert len(response_json.get("errors")) == 1
    assert response_json.get("errors")[0].get("code") == "PERMIT_NOT_FOUND"
    assert response_json.get("errors")[0].get("message") == "Permit does not exist."


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_permit_exists(session, client, jwt):
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
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("header").get("status") == Application.Status.FULL_REVIEW_APPROVED
        assert response_json.get("header").get("reviewer").get("username") is not None
        assert response_json.get("header").get("registrationId") is not None

        registration_number = response_json.get("header").get("registrationNumber")
        assert registration_number is not None

        validate_permit_request = {
            "identifier": registration_number,
            "address": {"streetNumber": "12166", "postalCode": "V2X 7N1"},
        }

        rv = client.post("/permits/:validatePermit", json=validate_permit_request, headers=headers)
        assert rv.status_code == HTTPStatus.OK
        response_json = rv.json

        assert response_json.get("status")
        assert response_json.get("validUntil")


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_permit_details_mismatch(session, client, jwt):
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
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("header").get("status") == Application.Status.FULL_REVIEW_APPROVED
        assert response_json.get("header").get("reviewer").get("username") is not None
        assert response_json.get("header").get("registrationId") is not None

        registration_number = response_json.get("header").get("registrationNumber")
        assert registration_number is not None

        validate_permit_request = {
            "identifier": registration_number,
            "address": {"streetNumber": "12165", "postalCode": "V2X 7N2"},
        }
        rv = client.post("/permits/:validatePermit", json=validate_permit_request, headers=headers)
        assert rv.status_code == HTTPStatus.OK
        response_json = rv.json

        assert len(response_json.get("errors")) == 2
        assert response_json.get("errors")[0].get("code") == "STREET_NUMBER_MISMATCH"
        assert (
            response_json.get("errors")[0].get("message") == "Street number does not match with the data in the permit."
        )

        assert response_json.get("errors")[1].get("code") == "POSTAL_CODE_MISMATCH"
        assert (
            response_json.get("errors")[1].get("message") == "Postal code does not match with the data in the permit."
        )


def test_invalid_request_with_identifier(session, client, jwt):
    headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
    validate_permit_request = {"identifier": "H123", "address": {"postalCode": "V4A 8H4"}}
    rv = client.post("/permits/:validatePermit", json=validate_permit_request, headers=headers)
    assert rv.status_code == HTTPStatus.BAD_REQUEST
    response_json = rv.json
    assert len(response_json.get("errors")) == 1
    assert response_json.get("errors")[0].get("message") == "'streetNumber' is a required property"

    rv = client.post("/v1/permits/:validatePermit", json=validate_permit_request, headers=headers)
    assert rv.status_code == HTTPStatus.BAD_REQUEST
    response_json = rv.json
    assert len(response_json.get("errors")) == 1
    assert response_json.get("errors")[0].get("message") == "'streetNumber' is a required property"


def test_invalid_request_without_identifier(session, client, jwt):
    headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
    validate_permit_request = {"address": {"streetNumber": "2435", "postalCode": "V4A 8H4"}}
    rv = client.post("/permits/:validatePermit", json=validate_permit_request, headers=headers)
    assert rv.status_code == HTTPStatus.BAD_REQUEST
    response_json = rv.json
    assert len(response_json.get("errors")) == 1
    assert response_json.get("errors")[0].get("message") == "'identifier' is a required property"


def test_action_invalid(client, jwt):
    "Test that an invalid action is not allowed."
    headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
    headers["Account-Id"] = ACCOUNT_ID
    validate_permit_request = {
        "identifier": "H1234567",
        "address": {"streetNumber": "12166", "postalCode": "V2X 7N1"},
    }
    rv = client.post("/permits/:UnknownAction", json=validate_permit_request, headers=headers)
    assert rv.status_code == HTTPStatus.BAD_REQUEST
    response_json = rv.json
    assert response_json == {"errors": "Invalid action requested."}
