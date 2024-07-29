import json
import os
from http import HTTPStatus
from unittest.mock import patch

from strr_api.models import Application, Events
from tests.unit.utils.auth_helpers import PUBLIC_USER, STAFF_ROLE, create_header

CREATE_REGISTRATION_REQUEST = os.path.join(
    os.path.dirname(os.path.realpath(__file__)), "../../mocks/json/registration_use_sbc_account.json"
)
CREATE_REGISTRATION_MINIMUM_FIELDS_REQUEST = os.path.join(
    os.path.dirname(os.path.realpath(__file__)), "../../mocks/json/registration_use_sbc_account_minimum.json"
)

ACCOUNT_ID = 1234

MOCK_INVOICE_RESPONSE = {"id": 123, "statusCode": "CREATED", "paymentAccount": {"accountId": ACCOUNT_ID}}


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_create_application(session, client, jwt):
    with open(CREATE_REGISTRATION_REQUEST) as f:
        json_data = json.load(f)
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        rv = client.post("/applications", json=json_data, headers=headers)

    assert HTTPStatus.CREATED == rv.status_code


def test_get_applications(session, client, jwt):
    headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
    headers["Account-Id"] = ACCOUNT_ID
    rv = client.get("/applications", headers=headers)

    assert HTTPStatus.OK == rv.status_code
    response_json = rv.json
    assert len(response_json.get("applications")) == 1


def test_get_applications_invalid_account(session, client, jwt):
    headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
    headers["Account-Id"] = 456
    rv = client.get("/applications", headers=headers)

    assert HTTPStatus.OK == rv.status_code
    response_json = rv.json
    assert len(response_json.get("applications")) == 0


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_create_application_with_minimum_fields(session, client, jwt):
    with open(CREATE_REGISTRATION_MINIMUM_FIELDS_REQUEST) as f:
        json_data = json.load(f)
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        rv = client.post("/applications", json=json_data, headers=headers)

    assert HTTPStatus.CREATED == rv.status_code


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
    headers = create_header(jwt, [STAFF_ROLE], "Account-Id")
    rv = client.get("/applications/100/ltsa", headers=headers)
    assert HTTPStatus.NOT_FOUND == rv.status_code


def test_get_application_ltsa(session, client, jwt):
    with open(CREATE_REGISTRATION_REQUEST) as f:
        json_data = json.load(f)
        application = Application(type="registration", application_json=json_data)
        application.save()
        headers = create_header(jwt, [STAFF_ROLE], "Account-Id")
        rv = client.get(f"/applications/{application.id}/ltsa", headers=headers)

        assert HTTPStatus.OK == rv.status_code


def test_get_application_auto_approval_unauthorized(session, client, jwt):
    headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
    headers["Account-Id"] = ACCOUNT_ID
    rv = client.get("/applications/1/auto-approval-records", headers=headers)
    assert HTTPStatus.UNAUTHORIZED == rv.status_code


def test_get_application_auto_approval_invalid_application(session, client, jwt):
    headers = create_header(jwt, [STAFF_ROLE], "Account-Id")
    rv = client.get("/applications/100/auto-approval-records", headers=headers)
    assert HTTPStatus.NOT_FOUND == rv.status_code


def test_get_application_auto_approval(session, client, jwt):
    with open(CREATE_REGISTRATION_REQUEST) as f:
        json_data = json.load(f)
        application = Application(type="registration", application_json=json_data)
        application.save()
        headers = create_header(jwt, [STAFF_ROLE], "Account-Id")
        rv = client.get(f"/applications/{application.id}/auto-approval-records", headers=headers)

        assert HTTPStatus.OK == rv.status_code


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_get_application_events(session, client, jwt):
    with open(CREATE_REGISTRATION_REQUEST) as f:
        json_data = json.load(f)
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        rv = client.post("/applications", json=json_data, headers=headers)
        assert HTTPStatus.CREATED == rv.status_code
        response_json = rv.json
        application_id = response_json.get("header").get("id")

        rv = client.get(f"/applications/{application_id}/events", headers=headers)
        assert HTTPStatus.OK == rv.status_code
        events_response = rv.json
        assert events_response[0].get("event_name") == Events.EventName.APPLICATION_SUBMITTED
        assert events_response[0].get("event_type") == Events.EventType.APPLICATION
