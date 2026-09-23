"""Integration tests for public/account ``/applications`` paths and auth smoke."""

import copy
from http import HTTPStatus
from unittest.mock import patch

import pytest

from strr_api.enums.enum import ChannelType, ErrorMessage, InteractionStatus
from strr_api.models import CustomerInteraction
from tests.integration.application_seed import (
    count_renewal_applications_for_account_registration,
    generate_application_number,
    host_renewal_application_json,
    seed_applicant_visible_application_event,
    seed_draft_application,
    seed_flushed_host_renewal_draft,
    seed_listable_application,
    seed_terminal_host_renewal,
)
from tests.integration.helpers import (
    assert_json_keys,
    assert_status,
    assert_unauthenticated_returns_401_for_protected_prefix,
    load_mock_json,
)
from tests.integration.registration_seed import seed_serializable_host_registration


def test_applications_routes_require_auth_without_bearer(client, app):
    assert_unauthenticated_returns_401_for_protected_prefix(client, app, "/applications")


@patch("strr_api.services.strr_pay.create_invoice")
@pytest.mark.slow
def test_post_application_with_invoice_mock_returns_success(
    mock_invoice, client, integration_account_id, mock_invoice_response, headers_public_user
):
    mock_invoice.return_value = mock_invoice_response
    payload = load_mock_json("host_registration.json")
    rv = client.post("/applications", json=payload, headers=headers_public_user(integration_account_id))
    assert rv.status_code in (HTTPStatus.OK, HTTPStatus.CREATED), rv.get_data(as_text=True)


def test_get_applications_list_ok(client, headers_public_user, integration_account_id):
    rv = client.get("/applications", headers=headers_public_user(integration_account_id))
    assert_status(rv, HTTPStatus.OK)
    assert_json_keys(rv, "page", "limit", "applications", "total")


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
    first = next((e for e in events if e.get("eventName") == "APPLICATION_SUBMITTED"), events[0])
    for k in ("eventType", "eventName", "message", "createdDate", "details", "structuredDetails"):
        assert k in first, first
    assert first["details"] == "Integration seed"
    assert first["structuredDetails"] is None


@pytest.mark.parametrize(
    "include_interaction_delivery, expected_present",
    [
        (False, False),
        (True, True),
    ],
)
def test_get_application_events_include_interaction_delivery_toggle(
    client,
    session,
    headers_public_user,
    serializable_application,
    include_interaction_delivery,
    expected_present,
):
    aid = serializable_application["application_id"]
    num = serializable_application["application_number"]

    interaction = CustomerInteraction(
        channel=ChannelType.EMAIL,
        status=InteractionStatus.DELIVERED,
        application_id=aid,
        meta_data={
            "email_type": "HOST_FULL_REVIEW_APPROVED",
            "notify_delivery": {
                "updated_at": "2026-07-08T20:53:21.399598+00:00",
                "recipient_statuses": {
                    "610066": {
                        "email_address": "karim.jazzar@gov.bc.ca",
                        "failure_reason": None,
                        "failure_type": None,
                        "notify_reference": "610066",
                        "provider_reference": "610522",
                        "request_date": "2026-06-09T22:23:11.634878",
                        "sent_date": "2026-06-09T22:23:11.714837",
                        "status": "SENT",
                    }
                },
            },
        },
    )
    session.add(interaction)
    session.flush()

    query = "?include_interaction_delivery=true" if include_interaction_delivery else ""
    rv = client.get(f"/applications/{num}/events{query}", headers=headers_public_user())
    assert_status(rv, HTTPStatus.OK)
    events = rv.get_json()
    email_event = next((e for e in events if e.get("eventName") == "EMAIL_DELIVERED"), None)
    assert (email_event is not None) is expected_present
    if expected_present:
        assert email_event["details"] is None
        assert email_event["idir"] is None
        assert email_event["structuredDetails"]["interactionStatus"] == "DELIVERED"
        assert isinstance(email_event["structuredDetails"]["recipientStatuses"], list)


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


def test_applications_user_search_requires_account_id(client, headers_public_user):
    rv = client.get("/applications/user/search?text=abc", headers=headers_public_user(account_id=None))
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


def test_post_second_renewal_without_path_returns_conflict_when_seeded_non_terminal_exists(
    client,
    session,
    headers_public_user,
    integration_account_id,
    serializable_host_registration,
):
    """``POST /applications`` must not create a second renewal row while one is already non-terminal."""
    rid = serializable_host_registration["registration_id"]
    uid = serializable_host_registration["user_id"]
    seed_flushed_host_renewal_draft(
        session,
        account_id=integration_account_id,
        submitter_user_id=uid,
        registration_id=rid,
    )
    before = count_renewal_applications_for_account_registration(
        session, account_id=integration_account_id, registration_id=rid
    )
    assert before == 1

    payload = host_renewal_application_json(rid)
    headers = headers_public_user(integration_account_id)
    headers["isDraft"] = "true"
    rv = client.post("/applications", json=payload, headers=headers)
    assert_status(rv, HTTPStatus.CONFLICT)
    body = rv.get_json()
    assert body is not None
    assert body.get("message") == ErrorMessage.RENEWAL_APPLICATION_ALREADY_IN_PROGRESS.value
    assert body.get("errorCode") == "RENEWAL_ALREADY_IN_PROGRESS"
    after = count_renewal_applications_for_account_registration(
        session, account_id=integration_account_id, registration_id=rid
    )
    assert after == before


@pytest.mark.parametrize("is_draft", ["true", "false"])
@patch("strr_api.services.strr_pay.create_invoice")
def test_post_second_renewal_conflict_for_draft_and_final_attempt(
    mock_invoice,
    client,
    session,
    headers_public_user,
    integration_account_id,
    serializable_host_registration,
    mock_invoice_response,
    is_draft,
):
    """Duplicate renewal is rejected before save whether or not ``isDraft`` is set; invoice is never created."""
    rid = serializable_host_registration["registration_id"]
    uid = serializable_host_registration["user_id"]
    seed_flushed_host_renewal_draft(
        session,
        account_id=integration_account_id,
        submitter_user_id=uid,
        registration_id=rid,
    )
    before = count_renewal_applications_for_account_registration(
        session, account_id=integration_account_id, registration_id=rid
    )

    payload = host_renewal_application_json(rid)
    headers = headers_public_user(integration_account_id)
    if is_draft == "true":
        headers["isDraft"] = "true"
    else:
        mock_invoice.return_value = mock_invoice_response

    rv = client.post("/applications", json=payload, headers=headers)
    assert_status(rv, HTTPStatus.CONFLICT)
    mock_invoice.assert_not_called()
    assert (
        count_renewal_applications_for_account_registration(
            session, account_id=integration_account_id, registration_id=rid
        )
        == before
    )


def test_put_renewal_draft_succeeds_after_duplicate_post_returns_conflict(
    client,
    session,
    headers_public_user,
    integration_account_id,
    serializable_host_registration,
):
    """Client can still update the existing renewal draft via ``PUT`` after a duplicate ``POST`` is rejected."""
    rid = serializable_host_registration["registration_id"]
    uid = serializable_host_registration["user_id"]
    existing_num = seed_flushed_host_renewal_draft(
        session,
        account_id=integration_account_id,
        submitter_user_id=uid,
        registration_id=rid,
    )

    payload = host_renewal_application_json(rid)
    dup_headers = headers_public_user(integration_account_id)
    dup_headers["isDraft"] = "true"
    rv_dup = client.post("/applications", json=payload, headers=dup_headers)
    assert_status(rv_dup, HTTPStatus.CONFLICT)

    put_headers = headers_public_user(integration_account_id)
    put_headers["isDraft"] = "true"
    updated = copy.deepcopy(payload)
    updated["header"]["applicationNumber"] = existing_num
    rv_put = client.put(f"/applications/{existing_num}", json=updated, headers=put_headers)
    assert_status(rv_put, HTTPStatus.OK)
    assert rv_put.get_json()["header"]["applicationNumber"] == existing_num


def test_post_renewal_succeeds_when_prior_renewal_on_same_registration_is_terminal(
    client,
    session,
    headers_public_user,
    integration_account_id,
    serializable_host_registration,
):
    """After a terminal renewal exists for the registration, a new ``POST`` may create another renewal."""
    rid = serializable_host_registration["registration_id"]
    uid = serializable_host_registration["user_id"]
    terminal_num = seed_terminal_host_renewal(
        session,
        account_id=integration_account_id,
        submitter_user_id=uid,
        registration_id=rid,
    )

    payload = host_renewal_application_json(rid)
    headers = headers_public_user(integration_account_id)
    headers["isDraft"] = "true"
    rv = client.post("/applications", json=payload, headers=headers)
    assert_status(rv, HTTPStatus.OK)
    new_num = rv.get_json()["header"]["applicationNumber"]
    assert new_num != terminal_num
    assert (
        count_renewal_applications_for_account_registration(
            session, account_id=integration_account_id, registration_id=rid
        )
        == 2
    )


def test_post_renewal_for_different_registration_succeeds_when_first_registration_has_open_renewal(
    client,
    session,
    headers_public_user,
    integration_account_id,
    random_string,
):
    """Open renewal on registration A must not block a new renewal draft for registration B (same account)."""

    suffix_a = random_string(10).upper().replace("-", "")[:10]
    suffix_b = random_string(10).upper().replace("-", "")[:10]
    reg_a = seed_serializable_host_registration(
        session,
        account_id=integration_account_id,
        registration_number=f"INTA{suffix_a}",
    )
    reg_b = seed_serializable_host_registration(
        session,
        account_id=integration_account_id,
        registration_number=f"INTB{suffix_b}",
    )
    session.flush()

    seed_flushed_host_renewal_draft(
        session,
        account_id=integration_account_id,
        submitter_user_id=reg_a["user_id"],
        registration_id=reg_a["registration_id"],
    )

    payload_b = host_renewal_application_json(reg_b["registration_id"])
    headers = headers_public_user(integration_account_id)
    headers["isDraft"] = "true"
    rv = client.post("/applications", json=payload_b, headers=headers)
    assert_status(rv, HTTPStatus.OK)
    assert rv.get_json()["header"]["applicationNumber"] is not None


def test_put_renewal_draft_registration_id_mismatch_returns_bad_request(
    client,
    session,
    headers_public_user,
    integration_account_id,
    serializable_host_registration,
):
    rid = serializable_host_registration["registration_id"]
    num = seed_flushed_host_renewal_draft(
        session,
        account_id=integration_account_id,
        submitter_user_id=serializable_host_registration["user_id"],
        registration_id=rid,
    )
    payload = host_renewal_application_json(rid)
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
    num = seed_flushed_host_renewal_draft(
        session,
        account_id=integration_account_id,
        submitter_user_id=serializable_host_registration["user_id"],
        registration_id=rid,
    )
    payload = host_renewal_application_json(rid)
    mock_invoice.return_value = mock_invoice_response
    rv = client.put(f"/applications/{num}", json=payload, headers=headers_public_user())
    assert rv.status_code in (HTTPStatus.OK, HTTPStatus.CREATED), rv.get_data(as_text=True)
    mock_invoice.assert_called()
    body = rv.get_json()
    assert body["header"]["applicationNumber"] == num
