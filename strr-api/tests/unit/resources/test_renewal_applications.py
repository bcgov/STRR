import json
import os
from datetime import datetime
from http import HTTPStatus
from unittest.mock import patch

import pytest

from strr_api.enums.enum import PaymentStatus, RegistrationStatus
from strr_api.models import Application, Events
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
