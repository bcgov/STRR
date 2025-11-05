import json
import os
from datetime import datetime
from http import HTTPStatus
from unittest.mock import patch

import pytest

from strr_api.enums.enum import ErrorMessage, PaymentStatus, RegistrationStatus
from strr_api.models import Application, Events
from strr_api.services import RegistrationService
from tests.unit.utils.auth_helpers import PUBLIC_USER, STRR_EXAMINER, create_header

CREATE_HOST_REGISTRATION_REQUEST = os.path.join(
    os.path.dirname(os.path.realpath(__file__)), "../../mocks/json/host_registration.json"
)
PROPERTY_MANAGER_INDIVIDUAL = os.path.join(
    os.path.dirname(os.path.realpath(__file__)), "../../mocks/json/property_manager_individual.json"
)
PROPERTY_MANAGER_BUSINESS = os.path.join(
    os.path.dirname(os.path.realpath(__file__)), "../../mocks/json/property_manager_business.json"
)
CREATE_PLATFORM_REGISTRATION_REQUEST = os.path.join(
    os.path.dirname(os.path.realpath(__file__)), "../../mocks/json/platform_registration.json"
)
CREATE_STRATA_HOTEL_REGISTRATION_REQUEST = os.path.join(
    os.path.dirname(os.path.realpath(__file__)), "../../mocks/json/strata_hotel_registration.json"
)

ACCOUNT_ID = 1234

MOCK_INVOICE_RESPONSE = {"id": 123, "statusCode": "CREATED", "paymentAccount": {"accountId": ACCOUNT_ID}}
MOCK_PAYMENT_COMPLETED_RESPONSE = {
    "id": 123,
    "statusCode": "COMPLETED",
    "paymentAccount": {"accountId": ACCOUNT_ID},
    "paymentDate": datetime.now().isoformat(),
}


@pytest.mark.parametrize(
    "request_json, isUnitOnPrincipalResidence",
    [
        (CREATE_HOST_REGISTRATION_REQUEST, True),
        (CREATE_HOST_REGISTRATION_REQUEST, False),
        (PROPERTY_MANAGER_INDIVIDUAL, True),
        (PROPERTY_MANAGER_INDIVIDUAL, False),
        (PROPERTY_MANAGER_BUSINESS, True),
        (PROPERTY_MANAGER_BUSINESS, False),
    ],
)
@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_host_renewal_application_submission(session, client, jwt, request_json, isUnitOnPrincipalResidence):
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
        assert registration_id is not None
        assert response_json.get("header").get("registrationNumber") is not None

        renewal_header_json = {"registrationId": registration_id, "applicationType": "renewal"}
        json_data["header"] = renewal_header_json
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")
        assert application_number is not None
        application = Application.find_by_application_number(application_number=application_number)
        assert application.registration_id == registration_id
        assert application.type == "renewal"


@pytest.mark.parametrize(
    "request_json, isUnitOnPrincipalResidence",
    [
        (CREATE_HOST_REGISTRATION_REQUEST, True),
    ],
)
@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_examiner_approve_host_registration__renewal_application(
    session, client, jwt, request_json, isUnitOnPrincipalResidence
):
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
        assert registration_id is not None
        assert response_json.get("header").get("registrationNumber") is not None
        registration_number = response_json.get("header").get("registrationNumber")
        prev_registration = RegistrationService.get_registration_by_id(registration_id)
        prev_registration.status = RegistrationStatus.EXPIRED.value
        prev_registration.save()
        prev_expiry_date = prev_registration.expiry_date

        renewal_header_json = {"registrationId": registration_id, "applicationType": "renewal"}
        json_data["header"] = renewal_header_json
        json_data["registration"]["unitAddress"]["nickname"] = "My Rental Property renewal"
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")
        assert application_number is not None
        application = Application.find_by_application_number(application_number=application_number)
        assert application.registration_id == registration_id
        assert application.type == "renewal"

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
        assert response_json.get("header").get("registrationId") == registration_id
        assert response_json.get("header").get("registrationNumber") == registration_number
        assert response_json.get("header").get("hostStatus") == "Approved"
        assert response_json.get("header").get("examinerStatus") == "Approved – Examined"

        registration = RegistrationService.get_registration_by_id(registration_id)
        assert registration.rental_property.nickname == "My Rental Property renewal"
        assert registration.expiry_date > prev_expiry_date
        assert registration.status == RegistrationStatus.ACTIVE

        rv = client.get(f"/registrations/{registration_id}/events", headers=headers)
        assert rv.status_code == HTTPStatus.OK
        events = rv.json
        assert any(e.get("eventName") == Events.EventName.REGISTRATION_RENEWED for e in events)


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_renewal_application_registration_id(session, client, jwt):
    with open(CREATE_HOST_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        registration_payload = json.load(f)

    def _complete_registration(app_number: str) -> int:
        application = Application.find_by_application_number(application_number=app_number)
        application.payment_status = PaymentStatus.COMPLETED.value
        application.status = Application.Status.FULL_REVIEW
        application.save()

        staff_headers = create_header(jwt, [STRR_EXAMINER], "Account-Id")
        rv_assign = client.put(f"/applications/{app_number}/assign", headers=staff_headers)
        assert rv_assign.status_code == HTTPStatus.OK
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv_status = client.put(
            f"/applications/{app_number}/status",
            json=status_update_request,
            headers=staff_headers,
        )
        assert rv_status.status_code == HTTPStatus.OK
        return rv_status.json.get("header").get("registrationId")

    rv = client.post("/applications", json=registration_payload, headers=headers)
    assert rv.status_code == HTTPStatus.OK
    application_number = rv.json.get("header").get("applicationNumber")
    registration_id = _complete_registration(application_number)

    # Successful renewal application creation
    renewal_payload = json.loads(json.dumps(registration_payload))
    renewal_payload["header"] = {
        "applicationType": "renewal",
        "registrationId": registration_id,
    }

    rv = client.post("/applications", json=renewal_payload, headers=headers)
    assert rv.status_code == HTTPStatus.OK

    # Successful renewal draft application creation
    draft_headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
    draft_headers["Account-Id"] = ACCOUNT_ID
    draft_headers["isDraft"] = True

    draft_payload = json.loads(json.dumps(renewal_payload))
    rv = client.post("/applications", json=draft_payload, headers=draft_headers)
    assert rv.status_code == HTTPStatus.OK
    draft_application_number = rv.json.get("header").get("applicationNumber")
    draft_registration_id = rv.json.get("header").get("registrationId")

    updated_draft_payload = json.loads(json.dumps(draft_payload))
    updated_draft_payload["header"]["applicationNumber"] = draft_application_number

    rv = client.put(
        f"/applications/{draft_application_number}",
        json=updated_draft_payload,
        headers=draft_headers,
    )
    assert rv.status_code == HTTPStatus.OK

    # No registrationId provided on renewal application creation
    missing_id_payload = json.loads(json.dumps(registration_payload))
    missing_id_payload["header"] = {"applicationType": "renewal"}
    rv = client.post("/applications", json=missing_id_payload, headers=headers)
    assert rv.status_code == HTTPStatus.BAD_REQUEST
    assert rv.json.get("message") == ErrorMessage.REGISTRATION_ID_REQUIRED.value

    # No registrationId provided on draft renewal application save
    missing_id_draft_payload = json.loads(json.dumps(draft_payload))
    missing_id_draft_payload["header"]["applicationNumber"] = draft_application_number
    missing_id_draft_payload["header"].pop("registrationId")
    rv = client.put(
        f"/applications/{draft_application_number}",
        json=missing_id_draft_payload,
        headers=draft_headers,
    )
    assert rv.status_code == HTTPStatus.BAD_REQUEST
    assert rv.json.get("message") == ErrorMessage.REGISTRATION_ID_REQUIRED.value

    # registrationId not integer
    non_integer_payload = json.loads(json.dumps(registration_payload))
    non_integer_payload["header"] = {
        "applicationType": "renewal",
        "registrationId": "abc",
    }
    rv = client.post("/applications", json=non_integer_payload, headers=headers)
    assert rv.status_code == HTTPStatus.BAD_REQUEST
    assert rv.json.get("message") == ErrorMessage.REGISTRATION_ID_NOT_INTEGER.value

    # registrationId mismatch on draft renewal application save
    mismatch_payload = json.loads(json.dumps(draft_payload))
    mismatch_payload["header"]["applicationNumber"] = draft_application_number
    mismatch_payload["header"]["registrationId"] = draft_registration_id + 1
    rv = client.put(
        f"/applications/{draft_application_number}",
        json=mismatch_payload,
        headers=draft_headers,
    )
    assert rv.status_code == HTTPStatus.BAD_REQUEST
    assert rv.json.get("message") == ErrorMessage.REGISTRATION_ID_MISMATCH.value


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_platform_renewal_application_submission(session, client, jwt):
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
        registration_id = response_json.get("header").get("registrationId")
        assert registration_id is not None
        assert response_json.get("header").get("registrationNumber") is not None

        renewal_header_json = {"registrationId": registration_id, "applicationType": "renewal"}
        json_data["header"] = renewal_header_json
        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")
        assert application_number is not None
        application = Application.find_by_application_number(application_number=application_number)
        assert application.registration_id == registration_id
        assert application.type == "renewal"


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_examiner_approve_platform_registration__renewal_application(session, client, jwt):
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
        registration_id = response_json.get("header").get("registrationId")
        registration_number = response_json.get("header").get("registrationNumber")
        assert registration_id is not None
        assert registration_number is not None

        renewal_header_json = {"registrationId": registration_id, "applicationType": "renewal"}
        json_data["header"] = renewal_header_json
        json_data["registration"]["businessDetails"]["legalName"] = "Updated Platform Legal Name"
        json_data["registration"]["platformDetails"]["listingSize"] = "BETWEEN_250_AND_999"

        rv = client.post("/applications", json=json_data, headers=headers)
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")
        assert application_number is not None
        application = Application.find_by_application_number(application_number=application_number)
        assert application.registration_id == registration_id
        assert application.type == "renewal"

        application.payment_status = PaymentStatus.COMPLETED.value
        application.status = Application.Status.FULL_REVIEW
        application.save()

        rv = client.put(f"/applications/{application_number}/assign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("header").get("status") == Application.Status.FULL_REVIEW_APPROVED
        assert response_json.get("header").get("assignee").get("username") is not None
        assert response_json.get("header").get("registrationId") == registration_id
        assert response_json.get("header").get("registrationNumber") == registration_number
        assert response_json.get("header").get("hostStatus") == "Approved"
        assert response_json.get("header").get("examinerStatus") == "Approved – Examined"

        registration = RegistrationService.get_registration_by_id(registration_id)
        platform = registration.platform_registration.platform
        assert platform.legal_name == "Updated Platform Legal Name"
        assert platform.listing_size.name == "BETWEEN_250_AND_999"


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_strata_hotel_renewal_application_submission(session, client, jwt):
    with open(CREATE_STRATA_HOTEL_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)

        rv = client.post("/applications", json=json_data, headers=headers)
        assert HTTPStatus.OK == rv.status_code
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
        assert registration_id is not None
        assert response_json.get("header").get("registrationNumber") is not None

        renewal_header_json = {"registrationId": registration_id, "applicationType": "renewal"}
        json_data["header"] = renewal_header_json
        rv = client.post("/applications", json=json_data, headers=headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")
        assert application_number is not None
        application = Application.find_by_application_number(application_number=application_number)
        assert application.registration_id == registration_id
        assert application.type == "renewal"


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_examiner_approve_strata_hotel_registration__renewal_application(session, client, jwt):
    with open(CREATE_STRATA_HOTEL_REGISTRATION_REQUEST) as f:
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = ACCOUNT_ID
        json_data = json.load(f)

        rv = client.post("/applications", json=json_data, headers=headers)
        assert HTTPStatus.OK == rv.status_code
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
        registration_number = response_json.get("header").get("registrationNumber")
        assert registration_id is not None
        assert registration_number is not None

        renewal_header_json = {"registrationId": registration_id, "applicationType": "renewal"}
        json_data["header"] = renewal_header_json
        json_data["registration"]["businessDetails"]["legalName"] = "Updated Strata Hotel Legal Name"
        json_data["registration"]["strataHotelDetails"]["numberOfUnits"] = 75

        rv = client.post("/applications", json=json_data, headers=headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        application_number = response_json.get("header").get("applicationNumber")
        assert application_number is not None
        application = Application.find_by_application_number(application_number=application_number)
        assert application.registration_id == registration_id
        assert application.type == "renewal"

        application.payment_status = PaymentStatus.COMPLETED.value
        application.status = Application.Status.FULL_REVIEW
        application.save()

        rv = client.put(f"/applications/{application_number}/assign", headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        status_update_request = {"status": Application.Status.FULL_REVIEW_APPROVED}
        rv = client.put(f"/applications/{application_number}/status", json=status_update_request, headers=staff_headers)
        assert HTTPStatus.OK == rv.status_code
        response_json = rv.json
        assert response_json.get("header").get("status") == Application.Status.FULL_REVIEW_APPROVED
        assert response_json.get("header").get("assignee").get("username") is not None
        assert response_json.get("header").get("registrationId") == registration_id
        assert response_json.get("header").get("registrationNumber") == registration_number
        assert response_json.get("header").get("hostStatus") == "Approved"
        assert response_json.get("header").get("examinerStatus") == "Approved – Examined"

        registration = RegistrationService.get_registration_by_id(registration_id)
        strata_hotel = registration.strata_hotel_registration.strata_hotel
        assert strata_hotel.legal_name == "Updated Strata Hotel Legal Name"
        assert strata_hotel.number_of_units == 75
