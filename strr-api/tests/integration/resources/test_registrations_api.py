"""Integration tests for public/account ``/registrations`` read paths and auth smoke."""

import json
from http import HTTPStatus
from io import BytesIO
from unittest.mock import patch

import pytest

from strr_api.enums.enum import ChannelType, ErrorMessage, InteractionStatus, RegistrationNocStatus
from strr_api.models import CustomerInteraction, Events
from strr_api.models.rental import Document
from tests.integration.helpers import (
    assert_json_keys,
    assert_status,
    assert_unauthenticated_returns_401_for_protected_prefix,
)
from tests.integration.registration_seed import (
    seed_applicant_visible_registration_event,
    seed_registration_snapshot,
    seed_serializable_host_registration,
)


def _email_update_payload(email: str) -> dict:
    """Build PATCH payload for registration primary contact email updates."""
    return {"primaryContact": {"emailAddress": email}}


def test_registrations_routes_require_auth_without_bearer(client, app):
    assert_unauthenticated_returns_401_for_protected_prefix(client, app, "/registrations")


def test_get_registrations_list_ok(client, headers_public_user, integration_account_id):
    rv = client.get("/registrations", headers=headers_public_user(integration_account_id))
    assert_status(rv, HTTPStatus.OK)
    assert_json_keys(rv, "page", "limit", "registrations", "total")


def test_get_registrations_list_envelope_and_row(client, headers_public_user, serializable_host_registration):
    rv = client.get("/registrations", headers=headers_public_user())
    assert_status(rv, HTTPStatus.OK)
    data = assert_json_keys(rv, "page", "limit", "registrations", "total")
    assert isinstance(data["registrations"], list)
    assert isinstance(data["total"], int)
    assert data["total"] >= 1
    ids = {r["id"] for r in data["registrations"]}
    assert serializable_host_registration["registration_id"] in ids


@pytest.mark.parametrize(
    "query",
    [
        "status=ACTIVE",
        "registration_type=HOST",
        "sort_desc=true",
        "limit=10&offset=1",
        "status=ACTIVE&registration_type=HOST&sort_desc=true",
    ],
)
def test_get_registrations_list_query_params_ok(client, headers_public_user, serializable_host_registration, query):
    rid = serializable_host_registration["registration_id"]
    rv = client.get(f"/registrations?{query}", headers=headers_public_user())
    assert_status(rv, HTTPStatus.OK)
    data = assert_json_keys(rv, "page", "limit", "registrations", "total")
    ids = {r["id"] for r in data["registrations"]}
    assert rid in ids


def test_get_registration_detail_shape(
    client, integration_account_id, headers_public_user, serializable_host_registration
):
    rid = serializable_host_registration["registration_id"]
    rv = client.get(f"/registrations/{rid}", headers=headers_public_user())
    assert_status(rv, HTTPStatus.OK)
    data = assert_json_keys(
        rv,
        "id",
        "registrationNumber",
        "status",
        "sbc_account_id",
        "header",
        "primaryContact",
        "unitAddress",
        "unitDetails",
    )
    assert data["id"] == rid
    assert data["registrationNumber"] == serializable_host_registration["registration_number"]
    assert data["sbc_account_id"] == integration_account_id
    assert isinstance(data["header"], dict)
    assert "hostStatus" in data["header"]


def test_get_registration_not_found_wrong_account(client, session, headers_public_user, random_string):
    other = seed_serializable_host_registration(
        session,
        account_id=999_999_999,
        registration_number=f"OTH{random_string(8).upper()}",
    )
    session.flush()
    rv = client.get(f"/registrations/{other['registration_id']}", headers=headers_public_user())
    assert_status(rv, HTTPStatus.NOT_FOUND)


def test_get_registration_not_found_unknown_id(client, headers_public_user):
    rv = client.get("/registrations/999999999", headers=headers_public_user())
    assert_status(rv, HTTPStatus.NOT_FOUND)


def test_validate_registration_active_and_inactive(client, headers_public_user, serializable_host_registration):
    num = serializable_host_registration["registration_number"]
    rv = client.get(f"/registrations/{num}/validate", headers=headers_public_user())
    assert_status(rv, HTTPStatus.OK)
    data = assert_json_keys(rv, "isValid")
    assert data["isValid"] is True

    rv2 = client.get("/registrations/ZZ-NONEXIST-99999/validate", headers=headers_public_user())
    assert_status(rv2, HTTPStatus.OK)
    data2 = assert_json_keys(rv2, "isValid")
    assert data2["isValid"] is False


def test_registrations_search_unauthorized_for_public_user(client, headers_public_user):
    """Staff search requires examiner/investigator; public JWT is rejected (401 from JWT layer)."""
    rv = client.get("/registrations/search?text=abc", headers=headers_public_user())
    assert rv.status_code == HTTPStatus.UNAUTHORIZED


def test_registrations_user_search_requires_account_id(client, headers_public_user):
    rv = client.get("/registrations/user/search?text=abc", headers=headers_public_user(account_id=None))
    assert_status(rv, HTTPStatus.BAD_REQUEST)


def test_registrations_user_search_short_text_bad_request(client, headers_public_user):
    rv = client.get(
        "/registrations/user/search?text=ab",
        headers=headers_public_user(),
    )
    assert_status(rv, HTTPStatus.BAD_REQUEST)


def test_registrations_user_search_envelope_ok(client, headers_public_user, serializable_host_registration):
    rid = serializable_host_registration["registration_id"]
    rv = client.get("/registrations/user/search", headers=headers_public_user())
    assert_status(rv, HTTPStatus.OK)
    data = assert_json_keys(rv, "page", "limit", "registrations", "total")
    assert isinstance(data["registrations"], list)
    assert data["total"] >= 1
    assert rid in {r["id"] for r in data["registrations"]}


def test_registrations_user_search_text_finds_registration(client, headers_public_user, serializable_host_registration):
    suffix = serializable_host_registration["registration_number"][-6:]
    rv = client.get(f"/registrations/user/search?text={suffix}", headers=headers_public_user())
    assert_status(rv, HTTPStatus.OK)
    data = assert_json_keys(rv, "page", "limit", "registrations", "total")
    numbers = {r.get("registrationNumber") or r.get("registration_number") for r in data["registrations"]}
    assert serializable_host_registration["registration_number"] in numbers


def test_get_registration_todos_envelope(client, headers_public_user, serializable_host_registration):
    rid = serializable_host_registration["registration_id"]
    rv = client.get(f"/registrations/{rid}/todos", headers=headers_public_user())
    assert_status(rv, HTTPStatus.OK)
    data = assert_json_keys(rv, "todos")
    assert isinstance(data["todos"], list)


def test_get_registration_snapshot_ok(client, session, headers_public_user, serializable_host_registration):
    rid = serializable_host_registration["registration_id"]
    snap = seed_registration_snapshot(session, rid, snapshot_data={"k": "v"})
    session.flush()
    rv = client.get(f"/registrations/{rid}/snapshots/{snap['snapshot_id']}", headers=headers_public_user())
    assert_status(rv, HTTPStatus.OK)
    data = assert_json_keys(rv, "id", "registrationId", "version", "snapshotDateTime", "snapshotData")
    assert data["registrationId"] == rid
    assert data["snapshotData"] == {"k": "v"}


def test_get_registration_snapshot_not_found_wrong_id(
    client, session, headers_public_user, serializable_host_registration
):
    rid = serializable_host_registration["registration_id"]
    seed_registration_snapshot(session, rid)
    session.flush()
    rv = client.get(f"/registrations/{rid}/snapshots/999999999", headers=headers_public_user())
    assert_status(rv, HTTPStatus.NOT_FOUND)


def test_get_registration_events_item_shape(client, session, headers_public_user, serializable_host_registration):
    rid = serializable_host_registration["registration_id"]
    seed_applicant_visible_registration_event(session, rid, user_id=serializable_host_registration["user_id"])
    session.flush()
    rv = client.get(f"/registrations/{rid}/events", headers=headers_public_user())
    assert rv.status_code == HTTPStatus.OK
    assert rv.is_json
    body = rv.get_json()
    assert isinstance(body, list)
    assert len(body) >= 1
    seeded_event = next((e for e in body if e.get("eventName") == "REGISTRATION_CREATED"), body[0])
    assert set(seeded_event.keys()) >= {
        "eventType",
        "eventName",
        "message",
        "createdDate",
        "details",
        "structuredDetails",
    }
    assert seeded_event["details"] == "Integration seed event"
    assert seeded_event["structuredDetails"] is None


@pytest.mark.parametrize(
    "include_interaction_delivery, expected_present",
    [
        (False, False),
        (True, True),
    ],
)
def test_get_registration_events_include_interaction_delivery_toggle(
    client,
    session,
    headers_public_user,
    serializable_host_registration,
    include_interaction_delivery,
    expected_present,
):
    rid = serializable_host_registration["registration_id"]

    interaction = CustomerInteraction(
        channel=ChannelType.EMAIL,
        status=InteractionStatus.FAILED,
        registration_id=rid,
        meta_data={
            "email_type": "HOST_FULL_REVIEW_APPROVED",
            "notify_delivery": {
                "updated_at": "2026-07-08T20:53:21.399598+00:00",
                "recipient_statuses": {
                    "610067": {
                        "email_address": "karim.jazzar@gov.bc.ca",
                        "failure_reason": "Mailbox unavailable",
                        "failure_type": "permanent",
                        "notify_reference": "610067",
                        "provider_reference": "610523",
                        "request_date": "2026-06-09T22:23:11.634878",
                        "sent_date": "2026-06-09T22:23:11.714837",
                        "status": "FAILED",
                    }
                },
            },
        },
    )
    session.add(interaction)
    session.flush()

    query = "?include_interaction_delivery=true" if include_interaction_delivery else ""
    rv = client.get(f"/registrations/{rid}/events{query}", headers=headers_public_user())
    assert_status(rv, HTTPStatus.OK)
    events = rv.get_json()
    email_event = next((e for e in events if e.get("eventName") == "EMAIL_FAILED"), None)
    assert (email_event is not None) is expected_present
    if expected_present:
        assert email_event["details"] is None
        assert email_event["idir"] is None
        assert email_event["structuredDetails"]["interactionStatus"] == "FAILED"
        assert isinstance(email_event["structuredDetails"]["recipientStatuses"], list)


def test_post_registration_document_rejected_without_noc(client, headers_public_user, serializable_host_registration):
    """Host cannot upload when NOC is not pending (unless staff / BL exception)."""
    rid = serializable_host_registration["registration_id"]

    rv = client.post(
        f"/registrations/{rid}/documents",
        headers=headers_public_user(),
        data={"file": (BytesIO(b"hello"), "note.txt")},
        content_type="multipart/form-data",
    )
    assert_status(rv, HTTPStatus.BAD_REQUEST)
    err = rv.get_json()
    assert err is not None
    assert ErrorMessage.REGISTRATION_DOCUMENT_UPLOAD_NOC_STATUS.value in (err.get("message") or "")


def test_post_registration_document_ok_when_noc_pending_patched_upload(
    client,
    session,
    headers_public_user,
    serializable_host_registration,
):
    """Host may upload when registration ``noc_status`` is ``NOC_PENDING`` (external upload patched)."""
    from strr_api.models.rental import Registration as RegistrationModel

    rid = serializable_host_registration["registration_id"]
    reg = session.get(RegistrationModel, rid)
    assert reg is not None
    reg.noc_status = RegistrationNocStatus.NOC_PENDING
    session.flush()
    with patch(
        "strr_api.services.document_service.DocumentService.upload_document",
        return_value={"fileKey": "host-noc-upload-key-01"},
    ):
        rv = client.post(
            f"/registrations/{rid}/documents",
            headers=headers_public_user(),
            data={"file": (BytesIO(b"hello-noc"), "noc-doc.txt"), "documentType": "OTHERS"},
            content_type="multipart/form-data",
        )
    assert_status(rv, HTTPStatus.CREATED)
    body = rv.get_json()
    keys = {d.get("fileKey") for d in (body.get("documents") or [])}
    assert "host-noc-upload-key-01" in keys


def test_post_registration_document_bl_upload_ok_without_noc_when_affected_municipality(
    client,
    headers_public_user,
    serializable_host_registration,
):
    """BL upload bypasses NOC check when flagged from affected municipality (upload patched)."""
    rid = serializable_host_registration["registration_id"]
    bl_type = Document.DocumentType.LOCAL_GOVT_BUSINESS_LICENSE.name
    with patch(
        "strr_api.services.document_service.DocumentService.upload_document",
        return_value={"fileKey": "bl-bypass-key-01"},
    ):
        rv = client.post(
            f"/registrations/{rid}/documents",
            headers=headers_public_user(),
            data={
                "file": (BytesIO(b"bl-doc"), "bl.pdf"),
                "documentType": bl_type,
                "isUploadedFromAffectedMunicipality": "true",
            },
            content_type="multipart/form-data",
        )
    assert_status(rv, HTTPStatus.CREATED)
    body = rv.get_json()
    keys = {d.get("fileKey") for d in (body.get("documents") or [])}
    assert "bl-bypass-key-01" in keys


def test_post_registration_document_bl_type_still_requires_noc_without_municipality_flag(
    client,
    headers_public_user,
    serializable_host_registration,
):
    """BL document type alone does not bypass NOC without affected-municipality flag."""
    rid = serializable_host_registration["registration_id"]
    bl_type = Document.DocumentType.LOCAL_GOVT_BUSINESS_LICENSE.name
    rv = client.post(
        f"/registrations/{rid}/documents",
        headers=headers_public_user(),
        data={
            "file": (BytesIO(b"bl-doc"), "bl.pdf"),
            "documentType": bl_type,
        },
        content_type="multipart/form-data",
    )
    assert_status(rv, HTTPStatus.BAD_REQUEST)
    err = rv.get_json()
    assert err is not None
    assert ErrorMessage.REGISTRATION_DOCUMENT_UPLOAD_NOC_STATUS.value in (err.get("message") or "")


def test_patch_registration_email_ok(client, session, headers_public_user, serializable_host_registration):
    """Test updating registration email via PATCH endpoint."""
    from strr_api.models.rental import Registration as RegistrationModel

    rid = serializable_host_registration["registration_id"]

    update_data = _email_update_payload("updated@example.com")
    rv = client.patch(f"/registrations/{rid}", headers=headers_public_user(), json=update_data)

    assert_status(rv, HTTPStatus.OK)
    data = assert_json_keys(rv, "id", "primaryContact")
    assert data["id"] == rid
    assert data["primaryContact"]["emailAddress"] == "updated@example.com"

    # Verify Contact DB record was also updated
    reg = session.get(RegistrationModel, rid)
    primary_contact = [c for c in reg.rental_property.contacts if c.is_primary][0]
    assert primary_contact.contact.email == "updated@example.com"

    # Verify event was created
    events = Events.fetch_registration_events(rid, applicant_visible_events_only=False)
    registration_updated_events = [e for e in events if e.event_name == Events.EventName.REGISTRATION_UPDATED]
    assert len(registration_updated_events) == 1

    event = registration_updated_events[0]
    assert event.visible_to_applicant is True
    details = json.loads(event.details)
    assert "changes" in details
    assert len(details["changes"]) == 1
    change = details["changes"][0]
    assert change["field"] == "primaryContact.emailAddress"
    assert change["newValue"] == "updated@example.com"


def test_patch_registration_email_not_found_wrong_account(client, session, headers_public_user, random_string):
    """Test that updating registration from different account returns 404."""
    other = seed_serializable_host_registration(
        session,
        account_id=999_999_999,
        registration_number=f"OTH{random_string(8).upper()}",
    )
    session.flush()

    update_data = _email_update_payload("hacker@example.com")
    rv = client.patch(f"/registrations/{other['registration_id']}", headers=headers_public_user(), json=update_data)

    assert_status(rv, HTTPStatus.NOT_FOUND)


def test_patch_registration_email_not_found_unknown_id(client, headers_public_user):
    """Test updating non-existent registration returns 404."""
    update_data = _email_update_payload("test@example.com")
    rv = client.patch("/registrations/999999999", headers=headers_public_user(), json=update_data)

    assert_status(rv, HTTPStatus.NOT_FOUND)


def test_patch_registration_email_rejects_non_host(
    client, session, headers_public_user, serializable_host_registration
):
    """Test that PATCH registration updates are allowed only for HOST registrations."""
    from strr_api.models.rental import Registration as RegistrationModel

    rid = serializable_host_registration["registration_id"]
    reg = session.get(RegistrationModel, rid)
    assert reg is not None
    reg.registration_type = RegistrationModel.RegistrationType.PLATFORM
    session.flush()

    update_data = _email_update_payload("updated@example.com")
    rv = client.patch(f"/registrations/{rid}", headers=headers_public_user(), json=update_data)

    assert_status(rv, HTTPStatus.BAD_REQUEST)
    body = rv.get_json()
    assert body is not None
    assert body.get("message") == "Registration update is only allowed for Host type registrations"


@pytest.mark.parametrize(
    "payload",
    [
        _email_update_payload("not-an-email"),
        {},
    ],
    ids=["invalid_email_format", "empty_body"],
)
def test_patch_registration_bad_request_payloads(client, headers_public_user, serializable_host_registration, payload):
    """Test invalid registration PATCH payloads are rejected by schema validation."""
    rid = serializable_host_registration["registration_id"]
    rv = client.patch(f"/registrations/{rid}", headers=headers_public_user(), json=payload)

    assert_status(rv, HTTPStatus.BAD_REQUEST)


def test_patch_registration_no_change_no_event(client, session, headers_public_user, serializable_host_registration):
    """Test that updating with same email value doesn't create an event."""
    from strr_api.models.rental import Registration as RegistrationModel

    rid = serializable_host_registration["registration_id"]

    # Get the registration and check current email
    reg = session.get(RegistrationModel, rid)
    # Get email from registration_json if it exists, otherwise from the Contact table
    if reg.registration_json and reg.registration_json.get("primaryContact", {}).get("emailAddress"):
        current_email = reg.registration_json["primaryContact"]["emailAddress"]
    else:
        # Get from the database Contact table
        primary_contact = [c for c in reg.rental_property.contacts if c.is_primary][0]
        current_email = primary_contact.contact.email

    # Update with same email
    update_data = _email_update_payload(current_email)
    rv = client.patch(f"/registrations/{rid}", headers=headers_public_user(), json=update_data)

    assert_status(rv, HTTPStatus.OK)

    # Verify no REGISTRATION_UPDATED event was created
    events = Events.fetch_registration_events(rid, applicant_visible_events_only=False)
    registration_updated_events = [e for e in events if e.event_name == Events.EventName.REGISTRATION_UPDATED]
    assert len(registration_updated_events) == 0


def test_patch_registration_unauthorized_without_auth(client, serializable_host_registration):
    """Test that PATCH endpoint requires authentication."""
    rid = serializable_host_registration["registration_id"]

    update_data = _email_update_payload("test@example.com")
    rv = client.patch(f"/registrations/{rid}", json=update_data)

    assert_status(rv, HTTPStatus.UNAUTHORIZED)
