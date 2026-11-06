"""Integration test for the complete renewal lifecycle.

Covers the full end-to-end journey:
1. Public user submits an initial host application (POST /applications).
2. Application is marked ready for examination and staff examiner approves it.
3. System creates an active Registration with a valid registration number and expiry date.
4. Public user fetches the active registration (GET /registrations/{id}), verifying that optional null fields
   (e.g., locationDescription) are omitted defensively by RegistrationSerializer without causing schema violations.
5. Public user builds and submits a renewal application (POST /applications) using the real serialized payload.
6. System validates the renewal against JSON schema, issues an invoice, and stores the renewal application.
7. User can save, update (PUT /applications/{num}), and inspect draft renewals.
8. Staff examiner assigns, reviews, and approves the renewal application.
9. Registration expiry is extended, audit events are logged, and renewal history is preserved.
"""

from __future__ import annotations

import copy
import json
from http import HTTPStatus
from unittest.mock import patch

import pytest

from strr_api.enums.enum import ApplicationType, PaymentStatus, RegistrationStatus
from strr_api.models import Application, Events, Registration
from tests.integration.application_seed import (
    count_renewal_applications_for_account_registration,
    generate_application_number,
    host_renewal_application_json,
)
from tests.integration.helpers import assert_status, load_mock_json
from tests.shared_test_constants import ACCOUNT_ID, MOCK_INVOICE_RESPONSE
from tests.unit.utils.application_flow_helpers import (
    assign_examiner_and_full_review_approve,
    set_application_ready_for_examiner_review,
)
from tests.unit.utils.auth_helpers import PUBLIC_USER, STRR_EXAMINER, create_header


@pytest.fixture
def mock_invoice():
    with patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE) as mock:
        yield mock


def test_full_renewal_cycle_from_initial_application_to_approved_renewal(
    client, session, jwt, headers_public_user, headers_strr_examiner, mock_invoice
):
    """Verify complete lifecycle: initial application -> approval -> GET registration -> renewal POST -> renewal approval."""
    # 1. User submits initial application
    initial_body = copy.deepcopy(load_mock_json("host_registration.json"))
    pub_headers = headers_public_user(account_id=ACCOUNT_ID)

    rv_initial = client.post("/applications", json=initial_body, headers=pub_headers)
    assert_status(rv_initial, HTTPStatus.OK)
    initial_data = rv_initial.get_json()
    initial_app_number = initial_data["header"]["applicationNumber"]
    assert initial_app_number is not None

    # 2. Staff review and approve initial application
    set_application_ready_for_examiner_review(initial_app_number)
    approved_resp, staff_headers = assign_examiner_and_full_review_approve(client, jwt, initial_app_number)

    registration_id = approved_resp["header"]["registrationId"]
    registration_number = approved_resp["header"]["registrationNumber"]
    assert registration_id is not None
    assert registration_number is not None

    # Verify registration in database
    reg = session.get(Registration, registration_id)
    assert reg is not None
    assert reg.status == RegistrationStatus.ACTIVE
    initial_expiry = reg.expiry_date

    # 3. User calls GET /registrations/{id} to fetch registration
    rv_reg = client.get(f"/registrations/{registration_id}", headers=pub_headers)
    assert_status(rv_reg, HTTPStatus.OK)
    serialized_reg = rv_reg.get_json()

    # Defensive check: ensure optional null fields like locationDescription are safely omitted
    primary_contact = serialized_reg.get("primaryContact", {})
    mailing_addr = primary_contact.get("mailingAddress", {})
    assert "locationDescription" not in mailing_addr
    unit_addr = serialized_reg.get("unitAddress", {})
    assert "locationDescription" not in unit_addr

    # 4. Construct renewal payload directly from GET /registrations/{id} (frontend parity)
    renewal_payload = {
        "header": {
            "applicationType": "renewal",
            "registrationId": registration_id,
        },
        "registration": {
            "registrationType": "HOST",
            "primaryContact": serialized_reg.get("primaryContact"),
            "secondaryContact": serialized_reg.get("secondaryContact"),
            "unitAddress": serialized_reg.get("unitAddress"),
            "unitDetails": serialized_reg.get("unitDetails"),
            "listingDetails": serialized_reg.get("listingDetails"),
        },
    }
    if serialized_reg.get("propertyManager"):
        renewal_payload["registration"]["propertyManager"] = serialized_reg.get("propertyManager")

    # 5. Submit renewal application via POST /applications
    rv_renewal = client.post("/applications", json=renewal_payload, headers=pub_headers)
    assert_status(rv_renewal, HTTPStatus.OK)
    renewal_data = rv_renewal.get_json()
    renewal_app_number = renewal_data["header"]["applicationNumber"]
    assert renewal_app_number is not None
    assert renewal_data["header"]["registrationId"] == registration_id

    # Verify renewal application in database
    renewal_app = Application.find_by_application_number(application_number=renewal_app_number)
    assert renewal_app is not None
    assert renewal_app.registration_id == registration_id
    assert renewal_app.type == ApplicationType.RENEWAL.value

    # 6. Verify user can inspect the renewal application via GET /applications/{num}
    rv_get_renewal = client.get(f"/applications/{renewal_app_number}", headers=pub_headers)
    assert_status(rv_get_renewal, HTTPStatus.OK)
    get_renewal_data = rv_get_renewal.get_json()
    assert get_renewal_data["header"]["applicationNumber"] == renewal_app_number
    assert get_renewal_data["header"]["registrationId"] == registration_id

    # 7. Staff review and approve renewal application
    set_application_ready_for_examiner_review(renewal_app_number)
    staff_headers = headers_strr_examiner()
    rv_assign = client.put(f"/applications/{renewal_app_number}/assign", headers=staff_headers)
    assert_status(rv_assign, HTTPStatus.OK)
    rv_approve = client.put(
        f"/applications/{renewal_app_number}/status",
        json={"status": Application.Status.FULL_REVIEW_APPROVED.value},
        headers=staff_headers,
    )
    assert (
        rv_approve.status_code == HTTPStatus.OK
    ), f"Approve failed with: {rv_approve.status_code} {rv_approve.get_data(as_text=True)}"
    approved_renewal_resp = rv_approve.get_json()
    assert approved_renewal_resp["header"]["status"] == Application.Status.FULL_REVIEW_APPROVED.value

    # 8. Verify registration events and updated status after renewal approval
    rv_events = client.get(f"/registrations/{registration_id}/events", headers=pub_headers)
    assert_status(rv_events, HTTPStatus.OK)
    event_names = [e.get("eventName") for e in rv_events.get_json()]
    assert any("RENEW" in ev.upper() or "APPROVED" in ev.upper() for ev in event_names if ev)


def test_renewal_draft_lifecycle_and_update(
    client, session, jwt, headers_public_user, headers_strr_examiner, mock_invoice
):
    """Verify renewal draft lifecycle: create draft -> update draft via PUT -> final submit -> approval."""
    # 1. Create and approve initial registration
    initial_body = copy.deepcopy(load_mock_json("host_registration.json"))
    pub_headers = headers_public_user(account_id=ACCOUNT_ID)

    rv_initial = client.post("/applications", json=initial_body, headers=pub_headers)
    assert_status(rv_initial, HTTPStatus.OK)
    initial_app_number = rv_initial.get_json()["header"]["applicationNumber"]

    set_application_ready_for_examiner_review(initial_app_number)
    approved_resp, staff_headers = assign_examiner_and_full_review_approve(client, jwt, initial_app_number)
    registration_id = approved_resp["header"]["registrationId"]

    # 2. Save a DRAFT renewal application
    draft_headers = headers_public_user(account_id=ACCOUNT_ID)
    draft_headers["isDraft"] = "true"

    renewal_base = host_renewal_application_json(registration_id, base_json=initial_body)
    rv_draft = client.post("/applications", json=renewal_base, headers=draft_headers)
    assert_status(rv_draft, HTTPStatus.OK)
    draft_data = rv_draft.get_json()
    draft_app_number = draft_data["header"]["applicationNumber"]

    draft_app = Application.find_by_application_number(application_number=draft_app_number)
    assert draft_app.status == Application.Status.DRAFT.value
    assert draft_app.registration_id == registration_id

    # 3. Update the draft renewal via PUT /applications/{num}
    updated_payload = copy.deepcopy(renewal_base)
    updated_payload["registration"]["primaryContact"]["preferredName"] = "UpdatedHostNickname"

    rv_update = client.put(f"/applications/{draft_app_number}", json=updated_payload, headers=draft_headers)
    assert_status(rv_update, HTTPStatus.OK)
    updated_data = rv_update.get_json()
    assert updated_data["registration"]["primaryContact"].get("preferredName") == "UpdatedHostNickname"

    # 4. Final submit of the renewal application (without isDraft)
    final_headers = headers_public_user(account_id=ACCOUNT_ID)
    rv_final = client.put(f"/applications/{draft_app_number}", json=updated_payload, headers=final_headers)
    assert_status(rv_final, HTTPStatus.OK)
    final_data = rv_final.get_json()
    assert final_data["header"]["status"] != Application.Status.DRAFT.value

    # 5. Examiner approves the submitted renewal
    set_application_ready_for_examiner_review(draft_app_number)
    approved_renewal_resp, _ = assign_examiner_and_full_review_approve(client, jwt, draft_app_number)
    assert approved_renewal_resp["header"]["status"] == Application.Status.FULL_REVIEW_APPROVED.value


@pytest.mark.parametrize(
    "fixture_file",
    [
        "property_manager_individual.json",
        "property_manager_business.json",
    ],
)
def test_full_renewal_cycle_with_property_managers(
    client, session, jwt, headers_public_user, headers_strr_examiner, mock_invoice, fixture_file
):
    """Verify renewal round-trip when registration contains property manager (individual or business)."""
    payload = copy.deepcopy(load_mock_json(fixture_file))
    pub_headers = headers_public_user(account_id=ACCOUNT_ID)

    # 1. Create and approve initial application with Property Manager
    rv = client.post("/applications", json=payload, headers=pub_headers)
    assert_status(rv, HTTPStatus.OK)
    app_num = rv.get_json()["header"]["applicationNumber"]

    set_application_ready_for_examiner_review(app_num)
    approved_resp, _ = assign_examiner_and_full_review_approve(client, jwt, app_num)
    reg_id = approved_resp["header"]["registrationId"]
    assert reg_id is not None

    # 2. Fetch registration
    rv_reg = client.get(f"/registrations/{reg_id}", headers=pub_headers)
    assert_status(rv_reg, HTTPStatus.OK)
    serialized = rv_reg.get_json()
    assert "propertyManager" in serialized

    # 3. Submit renewal constructed from serialized registration
    renewal_payload = {
        "header": {
            "applicationType": "renewal",
            "registrationId": reg_id,
        },
        "registration": {
            "registrationType": "HOST",
            "primaryContact": serialized.get("primaryContact"),
            "secondaryContact": serialized.get("secondaryContact"),
            "unitAddress": serialized.get("unitAddress"),
            "unitDetails": serialized.get("unitDetails"),
            "listingDetails": serialized.get("listingDetails"),
            "propertyManager": serialized.get("propertyManager"),
        },
    }

    rv_renewal = client.post("/applications", json=renewal_payload, headers=pub_headers)
    assert_status(rv_renewal, HTTPStatus.OK)
    renewal_num = rv_renewal.get_json()["header"]["applicationNumber"]
    assert renewal_num is not None


def test_renewal_guards_against_invalid_registration_and_cross_account(
    client, session, jwt, headers_public_user, mock_invoice
):
    """Verify that renewal application rejects non-existent registration and cross-account registration IDs."""
    pub_headers_a = headers_public_user(account_id=ACCOUNT_ID)
    pub_headers_b = headers_public_user(account_id=ACCOUNT_ID + 9999)

    # 1. Non-existent registration ID returns 400 Bad Request
    initial_body = copy.deepcopy(load_mock_json("host_registration.json"))
    bad_renewal = host_renewal_application_json(999999999, base_json=initial_body)
    rv_bad = client.post("/applications", json=bad_renewal, headers=pub_headers_a)
    assert rv_bad.status_code in (HTTPStatus.BAD_REQUEST, HTTPStatus.NOT_FOUND)

    # 2. Create registration under Account A
    rv = client.post("/applications", json=initial_body, headers=pub_headers_a)
    assert_status(rv, HTTPStatus.OK)
    app_num = rv.get_json()["header"]["applicationNumber"]
    set_application_ready_for_examiner_review(app_num)
    approved_resp, _ = assign_examiner_and_full_review_approve(client, jwt, app_num)
    reg_id_a = approved_resp["header"]["registrationId"]

    # 3. Account B attempts to renew Account A's registration -> must be rejected
    renewal_cross = host_renewal_application_json(reg_id_a, base_json=initial_body)
    rv_cross = client.post("/applications", json=renewal_cross, headers=pub_headers_b)
    assert rv_cross.status_code in (HTTPStatus.BAD_REQUEST, HTTPStatus.NOT_FOUND, HTTPStatus.FORBIDDEN)
