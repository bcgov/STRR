"""Integration tests for public/account ``/registrations`` read paths and auth smoke."""

from http import HTTPStatus
from io import BytesIO
from unittest.mock import patch

import pytest

from strr_api.enums.enum import ErrorMessage, RegistrationNocStatus
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
    for item in body:
        assert set(item.keys()) >= {"eventType", "eventName", "message", "createdDate"}


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
