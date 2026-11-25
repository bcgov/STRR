"""Renewals before and after the renewal window opens."""

import json
import os
import random
from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from unittest.mock import patch

import pytest

from strr_api.enums.enum import ApplicationType, RegistrationStatus
from strr_api.models import Application, Registration, User
from strr_api.utils.renewal_window import RenewalWindow
from tests.integration.application_seed import host_renewal_application_json
from tests.shared_test_constants import ACCOUNT_ID, MOCK_INVOICE_RESPONSE
from tests.unit.utils.auth_helpers import PUBLIC_USER, create_header

MOCKS = os.path.join(os.path.dirname(os.path.realpath(__file__)), "../../mocks/json")
HOST_REGISTRATION = os.path.join(MOCKS, "host_registration.json")


@pytest.fixture
def headers(jwt):
    headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
    headers["Account-Id"] = ACCOUNT_ID
    return headers


@pytest.fixture
def make_registration(session):
    def _make(days_to_expiry, registration_type="HOST"):
        user = User(
            username="testUser",
            firstname="Test",
            lastname="User",
            iss="test",
            sub=f"sub{random.randint(0, 999999)}",
            idp_userid="testUserID",
            login_source="testLogin",
        )
        user.save()
        expiry = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=days_to_expiry)
        registration = Registration(
            start_date=expiry - timedelta(days=364),
            expiry_date=expiry,
            status=RegistrationStatus.ACTIVE,
            registration_type=registration_type,
            sbc_account_id=ACCOUNT_ID,
            registration_number=f"H{random.randint(100000000, 999999999)}",
            user_id=user.id,
        )
        registration.save()
        return registration

    return _make


def _make_renewal(registration, status, header=None):
    application = Application(
        application_json={"header": header or {}, "registration": {}},
        application_number=str(random.randint(10**13, 10**14 - 1)),
        type=ApplicationType.RENEWAL.value,
        registration_type="HOST",
        status=status,
        registration_id=registration.id,
        payment_account=str(ACCOUNT_ID),
        application_date=datetime.now(timezone.utc),
    )
    application.save()
    return application


def test_todos_include_early_draft(client, headers, make_registration):
    registration = make_registration(200)
    draft = _make_renewal(registration, Application.Status.DRAFT)

    rv = client.get(f"/registrations/{registration.id}/todos", headers=headers)

    assert rv.json["todos"] == [{"task": {"type": "REGISTRATION_RENEWAL_DRAFT", "detail": draft.application_number}}]
    assert rv.json["renewalWindow"] == {
        "startDate": RenewalWindow.for_registration(registration).start_date.isoformat(),
        "hasStarted": False,
    }


@pytest.mark.parametrize("newest_first", [True, False])
def test_todos_return_most_recently_saved_early_draft(client, headers, make_registration, newest_first):
    registration = make_registration(200)
    drafts = [_make_renewal(registration, Application.Status.DRAFT) for _ in range(2)]
    newest, oldest = drafts if newest_first else reversed(drafts)
    oldest.application_date = datetime.now(timezone.utc) - timedelta(days=1)
    oldest.save()

    rv = client.get(f"/registrations/{registration.id}/todos", headers=headers)

    assert rv.json["todos"] == [{"task": {"type": "REGISTRATION_RENEWAL_DRAFT", "detail": newest.application_number}}]


def test_todos_early_without_draft_has_no_renewal(client, headers, make_registration):
    registration = make_registration(200)
    _make_renewal(registration, Application.Status.PAYMENT_DUE)

    rv = client.get(f"/registrations/{registration.id}/todos", headers=headers)

    assert rv.json["todos"] == []


def test_todos_window_is_open(client, headers, make_registration):
    registration = make_registration(20)

    rv = client.get(f"/registrations/{registration.id}/todos", headers=headers)

    assert rv.json["todos"] == [{"task": {"type": "REGISTRATION_RENEWAL"}}]
    assert rv.json["renewalWindow"]["hasStarted"] is True


@pytest.mark.parametrize("days_to_expiry, is_open", [(200, False), (20, True)])
def test_draft_header_is_computed_and_ignores_stored_values(
    client, headers, make_registration, days_to_expiry, is_open
):
    registration = make_registration(days_to_expiry)
    draft = _make_renewal(
        registration,
        Application.Status.DRAFT,
        {"renewalWindowStartDate": "1999-01-01", "hasRenewalWindowStarted": not is_open},
    )

    header = client.get(f"/applications/{draft.application_number}", headers=headers).json["header"]

    assert header["hasRenewalWindowStarted"] is is_open
    assert header["renewalWindowStartDate"] == RenewalWindow.for_registration(registration).start_date.isoformat()


def test_submitted_renewal_header_has_no_window(client, headers, make_registration):
    registration = make_registration(20)
    renewal = _make_renewal(registration, Application.Status.PAID, {"hasRenewalWindowStarted": False})

    header = client.get(f"/applications/{renewal.application_number}", headers=headers).json["header"]

    assert "hasRenewalWindowStarted" not in header
    assert "renewalWindowStartDate" not in header


@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_early_draft_can_be_saved_but_not_submitted(mock_invoice, client, headers, make_registration):
    with open(HOST_REGISTRATION) as f:
        base_json = json.load(f)
    registration = make_registration(200)
    payload = host_renewal_application_json(registration.id, base_json=base_json)

    rv = client.post("/applications", json=payload, headers={**headers, "isDraft": True})
    assert rv.status_code == HTTPStatus.OK
    number = rv.json["header"]["applicationNumber"]
    saved = client.put(f"/applications/{number}", json=payload, headers={**headers, "isDraft": True})
    assert saved.status_code == HTTPStatus.OK

    before = Application.find_by_application_number(number).application_date
    rv = client.put(f"/applications/{number}", json=payload, headers=headers)

    assert rv.status_code == HTTPStatus.BAD_REQUEST
    assert rv.json["errorCode"] == "RENEWAL_WINDOW_NOT_OPEN"
    mock_invoice.assert_not_called()
    application = Application.find_by_application_number(number)
    assert application.status == Application.Status.DRAFT
    assert application.application_date == before

    registration.expiry_date = registration.expiry_date - timedelta(days=180)
    registration.save()
    rv = client.put(f"/applications/{number}", json=payload, headers=headers)
    assert rv.status_code == HTTPStatus.OK
    mock_invoice.assert_called_once()


@pytest.mark.parametrize(
    "registration_type, mock_file, days_to_expiry",
    [
        ("HOST", "host_registration.json", 50),
        ("PLATFORM", "platform_registration.json", 50),
        ("STRATA_HOTEL", "strata_hotel_registration.json", 70),
    ],
)
@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_early_submit_without_draft_is_rejected(
    mock_invoice, client, headers, make_registration, registration_type, mock_file, days_to_expiry
):
    with open(os.path.join(MOCKS, mock_file)) as f:
        base_json = json.load(f)
    registration = make_registration(days_to_expiry, registration_type)
    payload = host_renewal_application_json(registration.id, base_json=base_json)

    rv = client.post("/applications", json=payload, headers=headers)

    assert rv.status_code == HTTPStatus.BAD_REQUEST
    assert rv.json["errorCode"] == "RENEWAL_WINDOW_NOT_OPEN"
    mock_invoice.assert_not_called()
    assert Application.query.filter_by(registration_id=registration.id).count() == 0


@pytest.mark.parametrize(
    "registration_type, mock_file, days_to_expiry",
    [
        ("HOST", "host_registration.json", 30),
        ("PLATFORM", "platform_registration.json", 30),
        ("STRATA_HOTEL", "strata_hotel_registration.json", 50),
    ],
)
@patch("strr_api.services.strr_pay.create_invoice", return_value=MOCK_INVOICE_RESPONSE)
def test_submit_without_draft_in_window_is_accepted(
    mock_invoice, client, headers, make_registration, registration_type, mock_file, days_to_expiry
):
    with open(os.path.join(MOCKS, mock_file)) as f:
        base_json = json.load(f)
    registration = make_registration(days_to_expiry, registration_type)
    payload = host_renewal_application_json(registration.id, base_json=base_json)

    rv = client.post("/applications", json=payload, headers=headers)

    assert rv.status_code == HTTPStatus.OK
    mock_invoice.assert_called_once()
