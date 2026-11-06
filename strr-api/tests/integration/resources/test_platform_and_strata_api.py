"""Integration tests for PLATFORM and STRATA_HOTEL application and registration lifecycles."""

from __future__ import annotations

import copy
from http import HTTPStatus
from unittest.mock import patch

import pytest

from strr_api.enums.enum import ApplicationType, RegistrationStatus, RegistrationType
from strr_api.models import Application, Registration
from tests.integration.helpers import assert_status, load_mock_json
from tests.shared_test_constants import ACCOUNT_ID, MOCK_INVOICE_RESPONSE
from tests.unit.utils.application_flow_helpers import (
    assign_examiner_and_full_review_approve,
    set_application_ready_for_examiner_review,
)
from tests.unit.utils.auth_helpers import create_header

READ_SCOPE = "strr.registrations:read"


@pytest.fixture
def mock_invoice():
    with patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE) as mock:
        yield mock


def test_platform_application_lifecycle_and_query_export(
    client, session, jwt, headers_public_user, headers_strr_examiner, mock_invoice
):
    """Verify Platform application creation, examiner approval, and query export."""
    platform_body = copy.deepcopy(load_mock_json("platform_registration.json"))
    pub_headers = headers_public_user(account_id=ACCOUNT_ID)

    # 1. Submit Platform application
    rv = client.post("/applications", json=platform_body, headers=pub_headers)
    assert_status(rv, HTTPStatus.OK)
    app_data = rv.get_json()
    app_num = app_data["header"]["applicationNumber"]
    assert app_num is not None

    # 2. Verify application detail
    rv_get = client.get(f"/applications/{app_num}", headers=pub_headers)
    assert_status(rv_get, HTTPStatus.OK)
    assert rv_get.get_json()["registration"]["registrationType"] == RegistrationType.PLATFORM.value

    # 3. Staff review and approve
    set_application_ready_for_examiner_review(app_num)
    approved_resp, staff_headers = assign_examiner_and_full_review_approve(client, jwt, app_num)
    reg_id = approved_resp["header"]["registrationId"]
    assert reg_id is not None

    reg = session.get(Registration, reg_id)
    assert reg is not None
    assert reg.status == RegistrationStatus.ACTIVE
    assert reg.registration_type == RegistrationType.PLATFORM.value
    assert reg.platform_registration is not None

    # 4. Fetch registration detail
    rv_reg = client.get(f"/registrations/{reg_id}", headers=pub_headers)
    assert_status(rv_reg, HTTPStatus.OK)
    reg_data = rv_reg.get_json()
    assert reg_data["registrationType"] == RegistrationType.PLATFORM.value
    assert "businessDetails" in reg_data
    assert "platformDetails" in reg_data
    assert "platformRepresentatives" in reg_data

    # 5. Verify query export route (/registrations:query) returns Platform details
    query_headers = create_header(jwt, roles=[], username="m2m-test", additional_claims={"scope": READ_SCOPE})
    query_body = {"registrationNumbers": [reg.registration_number]}
    rv_query = client.post("/registrations:query", json=query_body, headers=query_headers)
    assert_status(rv_query, HTTPStatus.OK)
    results = rv_query.get_json().get("items", [])
    assert len(results) == 1
    snapshot = results[0]
    assert snapshot["registrationType"] == RegistrationType.PLATFORM.value
    assert snapshot["businessDetails"]["legalName"] is not None


def test_strata_hotel_application_lifecycle_and_query_export(
    client, session, jwt, headers_public_user, headers_strr_examiner, mock_invoice
):
    """Verify Strata Hotel application creation, examiner approval, and query export."""
    strata_body = copy.deepcopy(load_mock_json("strata_hotel_registration.json"))
    pub_headers = headers_public_user(account_id=ACCOUNT_ID)

    # 1. Submit Strata Hotel application
    rv = client.post("/applications", json=strata_body, headers=pub_headers)
    assert_status(rv, HTTPStatus.OK)
    app_data = rv.get_json()
    app_num = app_data["header"]["applicationNumber"]
    assert app_num is not None

    # 2. Verify application detail
    rv_get = client.get(f"/applications/{app_num}", headers=pub_headers)
    assert_status(rv_get, HTTPStatus.OK)
    assert rv_get.get_json()["registration"]["registrationType"] == RegistrationType.STRATA_HOTEL.value

    # 3. Staff review and approve
    set_application_ready_for_examiner_review(app_num)
    approved_resp, staff_headers = assign_examiner_and_full_review_approve(client, jwt, app_num)
    reg_id = approved_resp["header"]["registrationId"]
    assert reg_id is not None

    reg = session.get(Registration, reg_id)
    assert reg is not None
    assert reg.status == RegistrationStatus.ACTIVE
    assert reg.registration_type == RegistrationType.STRATA_HOTEL.value
    assert reg.strata_hotel_registration is not None

    # 4. Fetch registration detail
    rv_reg = client.get(f"/registrations/{reg_id}", headers=pub_headers)
    assert_status(rv_reg, HTTPStatus.OK)
    reg_data = rv_reg.get_json()
    assert reg_data["registrationType"] == RegistrationType.STRATA_HOTEL.value
    assert "businessDetails" in reg_data
    assert "strataHotelDetails" in reg_data
    assert "strataHotelRepresentatives" in reg_data

    # 5. Verify query export route (/registrations:query) returns Strata Hotel details
    query_headers = create_header(jwt, roles=[], username="m2m-test", additional_claims={"scope": READ_SCOPE})
    query_body = {"registrationNumbers": [reg.registration_number]}
    rv_query = client.post("/registrations:query", json=query_body, headers=query_headers)
    assert_status(rv_query, HTTPStatus.OK)
    results = rv_query.get_json().get("items", [])
    assert len(results) == 1
    snapshot = results[0]
    assert snapshot["registrationType"] == RegistrationType.STRATA_HOTEL.value
    assert snapshot["strataHotelDetails"]["numberOfUnits"] is not None
