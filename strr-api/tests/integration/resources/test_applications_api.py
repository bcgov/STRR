"""Integration tests for public/account ``/applications`` paths and auth smoke."""

from http import HTTPStatus
from unittest.mock import patch

import pytest

from strr_api.enums.enum import ApplicationType, ErrorMessage
from tests.integration.application_seed import (
    generate_application_number,
    seed_applicant_visible_application_event,
    seed_draft_application,
    seed_listable_application,
)
from tests.integration.helpers import (
    assert_json_keys,
    assert_status,
    load_mock_json,
    protected_routes_with_prefix,
    resolve_path_for_unauth,
    unauthenticated_request,
)


def test_applications_routes_require_auth_without_bearer(client, app):
    rows = protected_routes_with_prefix(app, "/applications")
    assert rows, "expected at least one protected /applications route"
    for method, rule in rows:
        path = resolve_path_for_unauth(rule)
        rv = unauthenticated_request(client, method, path)
        assert rv.status_code == HTTPStatus.UNAUTHORIZED, f"{method} {rule}"


@patch("strr_api.services.strr_pay.create_invoice")
@pytest.mark.slow
def test_post_application_with_invoice_mock_returns_success(
    mock_invoice, client, jwt, integration_account_id, mock_invoice_response
):
    mock_invoice.return_value = mock_invoice_response
    from tests.unit.utils.auth_helpers import PUBLIC_USER, create_header

    headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
    headers["Account-Id"] = str(integration_account_id)
    payload = load_mock_json("host_registration.json")
    rv = client.post("/applications", json=payload, headers=headers)
    assert rv.status_code in (HTTPStatus.OK, HTTPStatus.CREATED), rv.get_data(as_text=True)


def test_get_applications_list_ok(client, jwt, integration_account_id):
    from tests.unit.utils.auth_helpers import PUBLIC_USER, create_header

    headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
    headers["Account-Id"] = str(integration_account_id)
    rv = client.get("/applications", headers=headers)
    assert rv.status_code == HTTPStatus.OK
    assert rv.is_json


def test_get_applications_list_envelope_and_row(client, headers_public_user, serializable_application):
    rv = client.get("/applications", headers=headers_public_user())
    assert_status(rv, HTTPStatus.OK)
    data = assert_json_keys(rv, "page", "limit", "applications", "total")
    assert isinstance(data["applications"], list)
    nums = {a["header"]["applicationNumber"] for a in data["applications"]}
    assert serializable_application["application_number"] in nums


@pytest.mark.parametrize(
    "query",
    [
        "status=FULL_REVIEW",
        "registrationType=HOST",
        "sortBy=id&sortOrder=desc",
        "limit=10&page=1",
        "status=FULL_REVIEW&registrationType=HOST",
    ],
)
def test_get_applications_list_query_params_ok(client, headers_public_user, serializable_application, query):
    num = serializable_application["application_number"]
    rv = client.get(f"/applications?{query}", headers=headers_public_user())
    assert_status(rv, HTTPStatus.OK)
    data = assert_json_keys(rv, "page", "limit", "applications", "total")
    nums = {a["header"]["applicationNumber"] for a in data["applications"]}
    assert num in nums


@patch("strr_api.services.application_service.ApplicationService.enrich_document_added_on_from_gcp", lambda d: d)
def test_get_application_detail_shape(client, headers_public_user, serializable_application):
    num = serializable_application["application_number"]
    rv = client.get(f"/applications/{num}", headers=headers_public_user())
    assert_status(rv, HTTPStatus.OK)
    data = assert_json_keys(rv, "header", "registration")
    assert data["header"]["applicationNumber"] == num
    assert isinstance(data["registration"], dict)


@patch("strr_api.services.application_service.ApplicationService.enrich_document_added_on_from_gcp", lambda d: d)
def test_get_application_events_item_keys(client, session, headers_public_user, serializable_application):
    aid = serializable_application["application_id"]
    num = serializable_application["application_number"]
    seed_applicant_visible_application_event(session, aid)
    rv = client.get(f"/applications/{num}/events", headers=headers_public_user())
    assert_status(rv, HTTPStatus.OK)
    events = rv.get_json()
    assert isinstance(events, list)
    assert events, "expected seeded applicant-visible event"
    first = events[0]
    for k in ("eventType", "eventName", "message", "createdDate"):
        assert k in first, first


def test_get_application_not_found_wrong_account(client, session, headers_public_user, serializable_host_registration):
    from tests.integration.application_seed import generate_application_number, seed_listable_application

    other = seed_listable_application(
        session,
        account_id=999999991,
        submitter_user_id=serializable_host_registration["user_id"],
        registration_id=None,
        application_number=generate_application_number(),
        status="FULL_REVIEW",
        application_json=load_mock_json("host_registration.json"),
    )
    rv = client.get(
        f"/applications/{other['application_number']}",
        headers=headers_public_user(),
    )
    assert_status(rv, HTTPStatus.NOT_FOUND)


def test_applications_user_search_envelope(client, headers_public_user, serializable_application):
    num = serializable_application["application_number"]
    rv = client.get(f"/applications/user/search?text={num[:8]}", headers=headers_public_user())
    assert_status(rv, HTTPStatus.OK)
    data = assert_json_keys(rv, "page", "limit", "applications", "total")


def test_applications_user_search_short_query_bad_request(client, headers_public_user):
    rv = client.get("/applications/user/search?text=ab", headers=headers_public_user())
    assert_status(rv, HTTPStatus.BAD_REQUEST)


def test_applications_user_search_requires_account_id(client, jwt):
    from tests.unit.utils.auth_helpers import PUBLIC_USER, create_header

    headers = create_header(jwt, [PUBLIC_USER])
    rv = client.get("/applications/user/search?text=abc", headers=headers)
    assert_status(rv, HTTPStatus.BAD_REQUEST)


def test_delete_draft_application_returns_no_content_and_get_is_not_found(
    client, session, headers_public_user, integration_account_id, serializable_host_registration
):
    num = generate_application_number()
    seed_draft_application(
        session,
        account_id=integration_account_id,
        submitter_user_id=serializable_host_registration["user_id"],
        registration_id=serializable_host_registration["registration_id"],
        application_number=num,
    )
    session.flush()
    rv = client.delete(f"/applications/{num}", headers=headers_public_user())
    assert_status(rv, HTTPStatus.NO_CONTENT)
    rv2 = client.get(f"/applications/{num}", headers=headers_public_user())
    assert_status(rv2, HTTPStatus.NOT_FOUND)


def test_delete_application_returns_bad_request_when_not_draft(
    client, session, headers_public_user, integration_account_id, serializable_host_registration
):
    num = generate_application_number()
    seed_listable_application(
        session,
        account_id=integration_account_id,
        submitter_user_id=serializable_host_registration["user_id"],
        registration_id=serializable_host_registration["registration_id"],
        application_number=num,
        status="FULL_REVIEW",
        application_json=load_mock_json("host_registration.json"),
    )
    session.flush()
    rv = client.delete(f"/applications/{num}", headers=headers_public_user())
    assert_status(rv, HTTPStatus.BAD_REQUEST)
    err = rv.get_json()
    assert err is not None
    assert ErrorMessage.APPLICATION_CANNOT_BE_DELETED.value in (err.get("message") or "")


def test_delete_draft_application_not_found_wrong_account(
    client, session, headers_public_user, serializable_host_registration
):
    num = generate_application_number()
    seed_draft_application(
        session,
        account_id=999999991,
        submitter_user_id=serializable_host_registration["user_id"],
        registration_id=serializable_host_registration["registration_id"],
        application_number=num,
    )
    session.flush()
    rv = client.delete(f"/applications/{num}", headers=headers_public_user())
    assert_status(rv, HTTPStatus.NOT_FOUND)


@patch("strr_api.services.strr_pay.create_invoice")
def test_put_draft_application_with_is_draft_does_not_call_invoice(
    mock_invoice,
    client,
    session,
    headers_public_user,
    integration_account_id,
    serializable_host_registration,
):
    num = generate_application_number()
    seed_draft_application(
        session,
        account_id=integration_account_id,
        submitter_user_id=serializable_host_registration["user_id"],
        registration_id=serializable_host_registration["registration_id"],
        application_number=num,
    )
    session.flush()
    payload = load_mock_json("host_registration.json")
    headers = headers_public_user()
    headers["isDraft"] = "true"
    rv = client.put(f"/applications/{num}", json=payload, headers=headers)
    assert_status(rv, HTTPStatus.OK)
    mock_invoice.assert_not_called()
    body = rv.get_json()
    assert body["header"]["applicationNumber"] == num


@patch("strr_api.services.strr_pay.create_invoice")
def test_post_draft_application_with_is_draft_does_not_call_invoice(
    mock_invoice,
    client,
    session,
    headers_public_user,
    integration_account_id,
    serializable_host_registration,
):
    """``POST /applications/<string:application_number>`` shares create handler with PUT."""
    num = generate_application_number()
    seed_draft_application(
        session,
        account_id=integration_account_id,
        submitter_user_id=serializable_host_registration["user_id"],
        registration_id=serializable_host_registration["registration_id"],
        application_number=num,
    )
    session.flush()
    payload = load_mock_json("host_registration.json")
    headers = headers_public_user()
    headers["isDraft"] = "true"
    rv = client.post(f"/applications/{num}", json=payload, headers=headers)
    assert_status(rv, HTTPStatus.OK)
    mock_invoice.assert_not_called()
    body = rv.get_json()
    assert body["header"]["applicationNumber"] == num


def test_put_renewal_draft_registration_id_mismatch_returns_bad_request(
    client,
    session,
    headers_public_user,
    integration_account_id,
    serializable_host_registration,
):
    rid = serializable_host_registration["registration_id"]
    num = generate_application_number()
    seed_draft_application(
        session,
        account_id=integration_account_id,
        submitter_user_id=serializable_host_registration["user_id"],
        registration_id=rid,
        application_number=num,
        application_type=ApplicationType.RENEWAL.value,
    )
    session.flush()
    payload = load_mock_json("host_registration.json")
    payload.setdefault("header", {})["applicationType"] = ApplicationType.RENEWAL.value
    payload["header"]["registrationId"] = rid + 987654321  # differs from draft row
    headers = headers_public_user()
    headers["isDraft"] = "true"
    rv = client.put(f"/applications/{num}", json=payload, headers=headers)
    assert_status(rv, HTTPStatus.BAD_REQUEST)
    err = rv.get_json()
    assert err is not None
    assert ErrorMessage.REGISTRATION_ID_MISMATCH.value in (err.get("message") or "")


@patch("strr_api.services.strr_pay.create_invoice")
@pytest.mark.slow
def test_put_renewal_draft_final_submit_with_invoice_mock(
    mock_invoice,
    client,
    session,
    headers_public_user,
    integration_account_id,
    serializable_host_registration,
    mock_invoice_response,
):
    """Non-draft PUT on a renewal draft runs validation, invoice, and status update (SBC pay mocked)."""
    rid = serializable_host_registration["registration_id"]
    num = generate_application_number()
    seed_draft_application(
        session,
        account_id=integration_account_id,
        submitter_user_id=serializable_host_registration["user_id"],
        registration_id=rid,
        application_number=num,
        application_type=ApplicationType.RENEWAL.value,
    )
    session.flush()
    payload = load_mock_json("host_registration.json")
    payload["header"] = {
        "applicationType": ApplicationType.RENEWAL.value,
        "registrationId": rid,
    }
    mock_invoice.return_value = mock_invoice_response
    rv = client.put(f"/applications/{num}", json=payload, headers=headers_public_user())
    assert rv.status_code in (HTTPStatus.OK, HTTPStatus.CREATED), rv.get_data(as_text=True)
    mock_invoice.assert_called()
    body = rv.get_json()
    assert body["header"]["applicationNumber"] == num
