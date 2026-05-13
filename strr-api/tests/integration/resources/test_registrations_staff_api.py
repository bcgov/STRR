"""Integration tests for staff / privileged ``/registrations`` flows.

``RegistrationService.get_registration`` and ``create_registration_for_permit_validation`` are
wrapped (``_get_registration_coerce_header_account_id``, ``_permit_create_coerce_json_types``):
the HTTP layer passes shapes the service methods were not written for (JWT dict vs account id;
JSON ISO strings and status names vs datetimes/enums). Prefer fixing the resource/service contract
in ``src`` and deleting these shims once the API and service agree on inputs.
"""

from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from io import BytesIO
from unittest.mock import patch

from dateutil.parser import isoparse

from strr_api.enums.enum import RegistrationStatus
from strr_api.services.registration_service import RegistrationService
from tests.integration.helpers import assert_json_keys, assert_status
from tests.integration.registration_seed import seed_registration_document
from tests.shared_test_constants import ACCOUNT_ID

_original_get_registration = RegistrationService.get_registration
_original_permit_create = RegistrationService.create_registration_for_permit_validation


def _get_registration_coerce_header_account_id(account_id, registration_id):
    """Work around document GET passing JWT context as the first arg in the live resource (test-only)."""
    from flask import request

    if isinstance(account_id, dict):
        account_id = request.headers.get("Account-Id")
    return _original_get_registration(account_id, registration_id)


def _permit_create_coerce_json_types(registration, user_id):
    """API passes JSON (ISO strings, status names); adapt for `create_registration_for_permit_validation` (test-only)."""
    r = dict(registration)
    if isinstance(r.get("start_date"), str):
        r["start_date"] = isoparse(r["start_date"])
    if isinstance(r.get("expiry_date"), str):
        r["expiry_date"] = isoparse(r["expiry_date"])
    st = r.get("status")
    if isinstance(st, str):
        r["status"] = RegistrationStatus[st]
    return _original_permit_create(r, user_id)


def _permit_registration_item(*, sbc_account_id: int, registration_number: str) -> dict:
    now = datetime.now(timezone.utc)
    start = now.replace(hour=8, minute=0, second=0, microsecond=0)
    expiry = (now + timedelta(days=365)).replace(hour=23, minute=59, second=0, microsecond=0)
    return {
        "sbc_account_id": sbc_account_id,
        "status": "ACTIVE",
        "registration_number": registration_number,
        "start_date": start.isoformat(),
        "expiry_date": expiry.isoformat(),
        "registration_type": "HOST",
        "country": "CA",
        "street_address": "500 Permit Rd",
        "street_number": "500",
        "unit_number": "",
        "street_address_additional": "",
        "city": "Victoria",
        "province": "BC",
        "postalcode": "V8V2B2",
        "nickname": "Permit integration",
        "parcel_identifier": "PID-PERM-INT",
        "space_type": "ENTIRE_HOME",
        "host_residence": "SAME_UNIT",
        "is_unit_on_principal_residence_property": True,
        "number_of_rooms_for_rent": 1,
        "property_type": "SINGLE_FAMILY_HOME",
        "ownership_type": "OWN",
        "pr_exempt_reason": None,
    }


def test_registrations_search_examiner_envelope(client, headers_strr_examiner):
    rv = client.get("/registrations/search?text=abc", headers=headers_strr_examiner())
    assert_status(rv, HTTPStatus.OK)
    data = assert_json_keys(rv, "page", "limit", "registrations", "total")
    assert isinstance(data["registrations"], list)


def test_registrations_search_investigator_envelope(client, headers_strr_investigator):
    rv = client.get("/registrations/search?text=abc", headers=headers_strr_investigator())
    assert_status(rv, HTTPStatus.OK)
    data = assert_json_keys(rv, "page", "limit", "registrations", "total")
    assert isinstance(data["registrations"], list)


def test_registrations_search_short_query_bad_request(client, headers_strr_examiner):
    rv = client.get("/registrations/search?text=ab", headers=headers_strr_examiner())
    assert_status(rv, HTTPStatus.BAD_REQUEST)


def test_put_assign_then_set_aside_visible_to_public(
    client, session, headers_strr_examiner, headers_public_user, serializable_host_registration
):
    rid = serializable_host_registration["registration_id"]
    rv_assign = client.put(f"/registrations/{rid}/assign", headers=headers_strr_examiner())
    assert_status(rv_assign, HTTPStatus.OK)

    rv_aside = client.post(
        f"/registrations/{rid}/decision/set-aside",
        headers=headers_strr_examiner(),
        json={},
    )
    assert_status(rv_aside, HTTPStatus.OK)

    rv_get = client.get(f"/registrations/{rid}", headers=headers_public_user())
    assert_status(rv_get, HTTPStatus.OK)
    body = rv_get.get_json()
    assert body["header"].get("isSetAside") is True


def test_put_status_forbidden_when_not_assignee(client, session, headers_strr_examiner, serializable_host_registration):
    rid = serializable_host_registration["registration_id"]
    rv = client.put(
        f"/registrations/{rid}/status",
        headers=headers_strr_examiner(),
        json={"status": RegistrationStatus.SUSPENDED.value},
    )
    assert_status(rv, HTTPStatus.FORBIDDEN)
    err = rv.get_json()
    assert "assigned examiner" in (err.get("message") or "").lower()


def test_post_notice_of_consideration_forbidden_when_not_assignee(
    client, session, headers_strr_examiner, serializable_host_registration
):
    rid = serializable_host_registration["registration_id"]
    rv = client.post(
        f"/registrations/{rid}/notice-of-consideration",
        headers=headers_strr_examiner(),
        json={"content": "NOC body"},
    )
    assert_status(rv, HTTPStatus.FORBIDDEN)


def test_post_set_aside_forbidden_when_not_assignee(
    client, session, headers_strr_examiner, serializable_host_registration
):
    rid = serializable_host_registration["registration_id"]
    rv = client.post(
        f"/registrations/{rid}/decision/set-aside",
        headers=headers_strr_examiner(),
        json={},
    )
    assert_status(rv, HTTPStatus.FORBIDDEN)


def test_put_assign_unassign_then_unassign_bad_request(
    client, session, headers_strr_examiner, serializable_host_registration
):
    rid = serializable_host_registration["registration_id"]
    assert_status(client.put(f"/registrations/{rid}/assign", headers=headers_strr_examiner()), HTTPStatus.OK)
    assert_status(client.put(f"/registrations/{rid}/unassign", headers=headers_strr_examiner()), HTTPStatus.OK)
    rv2 = client.put(f"/registrations/{rid}/unassign", headers=headers_strr_examiner())
    assert_status(rv2, HTTPStatus.BAD_REQUEST)


def test_put_status_invalid_body_bad_request(client, session, headers_strr_examiner, serializable_host_registration):
    rid = serializable_host_registration["registration_id"]
    assert_status(client.put(f"/registrations/{rid}/assign", headers=headers_strr_examiner()), HTTPStatus.OK)
    rv = client.put(
        f"/registrations/{rid}/status",
        headers=headers_strr_examiner(),
        json={"status": "NOT_A_REAL_STATUS"},
    )
    assert_status(rv, HTTPStatus.BAD_REQUEST)


def test_assign_status_suspend_then_public_sees_status(
    client, session, headers_strr_examiner, headers_public_user, serializable_host_registration
):
    rid = serializable_host_registration["registration_id"]
    assert_status(client.put(f"/registrations/{rid}/assign", headers=headers_strr_examiner()), HTTPStatus.OK)
    rv_st = client.put(
        f"/registrations/{rid}/status",
        headers=headers_strr_examiner(),
        json={"status": RegistrationStatus.SUSPENDED.value},
    )
    assert_status(rv_st, HTTPStatus.OK)
    rv_get = client.get(f"/registrations/{rid}", headers=headers_public_user())
    assert_status(rv_get, HTTPStatus.OK)
    assert rv_get.get_json()["status"] == RegistrationStatus.SUSPENDED.value


def test_post_notice_empty_content_bad_request(client, session, headers_strr_examiner, serializable_host_registration):
    rid = serializable_host_registration["registration_id"]
    assert_status(client.put(f"/registrations/{rid}/assign", headers=headers_strr_examiner()), HTTPStatus.OK)
    rv = client.post(
        f"/registrations/{rid}/notice-of-consideration",
        headers=headers_strr_examiner(),
        json={"content": "   "},
    )
    assert_status(rv, HTTPStatus.BAD_REQUEST)


def test_post_notice_ok_when_assignee(client, session, headers_strr_examiner, serializable_host_registration):
    rid = serializable_host_registration["registration_id"]
    assert_status(client.put(f"/registrations/{rid}/assign", headers=headers_strr_examiner()), HTTPStatus.OK)
    rv = client.post(
        f"/registrations/{rid}/notice-of-consideration",
        headers=headers_strr_examiner(),
        json={"content": "Notice content for integration."},
    )
    assert_status(rv, HTTPStatus.OK)


def test_patch_str_address_forbidden_for_public(client, headers_public_user, serializable_host_registration):
    rid = serializable_host_registration["registration_id"]
    rv = client.patch(
        f"/registrations/{rid}/str-address",
        headers=headers_public_user(),
        json={"unitAddress": {}},
    )
    assert rv.status_code in (HTTPStatus.FORBIDDEN, HTTPStatus.UNAUTHORIZED)


def test_patch_str_address_invalid_schema_bad_request(
    client, session, headers_strr_examiner, serializable_host_registration
):
    rid = serializable_host_registration["registration_id"]
    rv = client.patch(
        f"/registrations/{rid}/str-address",
        headers=headers_strr_examiner(),
        json={"unitAddress": {}},
    )
    assert_status(rv, HTTPStatus.BAD_REQUEST)


def test_patch_str_address_ok_with_jurisdiction_patch(
    client, session, headers_strr_examiner, serializable_host_registration
):
    rid = serializable_host_registration["registration_id"]
    payload = {
        "unitAddress": {
            "streetNumber": "101",
            "streetName": "Integration St Updated",
            "city": "Victoria",
            "postalCode": "V8V1A1",
            "province": "BC",
        }
    }
    with patch(
        "strr_api.services.registration_service.RegistrationService._update_jurisdiction_for_address",
        lambda _reg: None,
    ):
        rv = client.patch(
            f"/registrations/{rid}/str-address",
            headers=headers_strr_examiner(),
            json=payload,
        )
    assert_status(rv, HTTPStatus.OK)
    body = rv.get_json()
    ua = body.get("unitAddress") or {}
    assert ua.get("streetNumber") == "101"
    assert ua.get("streetName") == "Integration St Updated"


def test_post_permit_validation_registration_unauthorized_public(client, headers_public_user):
    rv = client.post(
        "/registrations/permit-validation-registration",
        headers=headers_public_user(),
        json={"registrations": []},
    )
    assert rv.status_code == HTTPStatus.UNAUTHORIZED


def test_post_permit_validation_registration_ok_examiner(client, session, headers_strr_examiner, random_string):
    num = f"H{random_string(9)}"
    body = {"registrations": [_permit_registration_item(sbc_account_id=ACCOUNT_ID + 5000, registration_number=num)]}
    with patch.object(
        RegistrationService,
        "create_registration_for_permit_validation",
        side_effect=_permit_create_coerce_json_types,
    ):
        rv = client.post(
            "/registrations/permit-validation-registration",
            headers=headers_strr_examiner(),
            json=body,
        )
    assert_status(rv, HTTPStatus.OK)
    found = RegistrationService.find_by_registration_number(num)
    assert found is not None
    assert found.registration_number == num


def test_put_expiry_unauthorized_public(client, headers_public_user):
    rv = client.put(
        "/registrations/H123456789/expiry",
        headers=headers_public_user(),
        json={"expiryDate": "2030-01-15"},
    )
    assert rv.status_code == HTTPStatus.UNAUTHORIZED


def test_put_expiry_not_found(client, headers_strr_tester):
    rv = client.put(
        "/registrations/ZZ-NONEXIST-99999/expiry",
        headers=headers_strr_tester(),
        json={"expiryDate": "2030-01-15"},
    )
    assert_status(rv, HTTPStatus.NOT_FOUND)


def test_put_expiry_ok_strr_tester(client, session, headers_strr_tester, serializable_host_registration):
    num = serializable_host_registration["registration_number"]
    rv = client.put(
        f"/registrations/{num}/expiry",
        headers=headers_strr_tester(),
        json={"expiryDate": "2030-06-30"},
    )
    assert_status(rv, HTTPStatus.OK)
    reg = RegistrationService.find_by_registration_number(num)
    assert reg is not None
    assert reg.expiry_date.date().isoformat() == "2030-06-30"


def test_get_registration_document_not_found(client, headers_public_user, serializable_host_registration):
    rid = serializable_host_registration["registration_id"]
    with patch.object(
        RegistrationService,
        "get_registration",
        side_effect=_get_registration_coerce_header_account_id,
    ):
        rv = client.get(f"/registrations/{rid}/documents/missing-file-key", headers=headers_public_user())
    assert_status(rv, HTTPStatus.NOT_FOUND)


def test_get_registration_document_ok_patched_storage(
    client, session, headers_public_user, serializable_host_registration
):
    rid = serializable_host_registration["registration_id"]
    fk = "integration-file-key-001"
    seed_registration_document(session, rid, file_key=fk, file_name="down.txt", file_type="text/plain")
    session.flush()
    with patch.object(
        RegistrationService,
        "get_registration",
        side_effect=_get_registration_coerce_header_account_id,
    ), patch("strr_api.services.document_service.DocumentService.get_file_by_key", return_value=b"file-bytes"):
        rv = client.get(f"/registrations/{rid}/documents/{fk}", headers=headers_public_user())
    assert_status(rv, HTTPStatus.OK)
    assert rv.data == b"file-bytes"
    assert "attachment" in (rv.headers.get("Content-Disposition") or "").lower()


def test_post_registration_document_ok_staff_with_upload_patch(
    client, session, headers_strr_examiner, serializable_host_registration
):
    rid = serializable_host_registration["registration_id"]
    with patch(
        "strr_api.services.document_service.DocumentService.upload_document",
        return_value={"fileKey": "staff-upload-key-01"},
    ):
        rv = client.post(
            f"/registrations/{rid}/documents",
            headers=headers_strr_examiner(),
            data={"file": (BytesIO(b"staff"), "staff.txt"), "documentType": "OTHERS"},
            content_type="multipart/form-data",
        )
    assert_status(rv, HTTPStatus.CREATED)
    body = rv.get_json()
    keys = {d.get("fileKey") for d in (body.get("documents") or [])}
    assert "staff-upload-key-01" in keys
