"""Integration tests for staff / privileged ``/applications`` flows."""

from http import HTTPStatus
from io import BytesIO
from unittest.mock import patch

from flask import Response

from strr_api.models.application import Application as AppModel
from tests.integration.application_seed import generate_application_number, seed_listable_application
from tests.integration.helpers import assert_json_keys, assert_status, load_mock_json
from tests.unit.resources.conftest import MOCK_PAYMENT_COMPLETED_RESPONSE


def test_applications_search_examiner_envelope(client, headers_strr_examiner):
    rv = client.get("/applications/search?text=abc", headers=headers_strr_examiner())
    assert_status(rv, HTTPStatus.OK)
    data = assert_json_keys(rv, "page", "limit", "applications", "total")
    assert isinstance(data["applications"], list)


def test_applications_search_investigator_envelope(client, headers_strr_investigator):
    rv = client.get("/applications/search?text=abc", headers=headers_strr_investigator())
    assert_status(rv, HTTPStatus.OK)
    data = assert_json_keys(rv, "page", "limit", "applications", "total")
    assert isinstance(data["applications"], list)


def test_applications_search_short_query_bad_request(client, headers_strr_examiner):
    rv = client.get("/applications/search?text=ab", headers=headers_strr_examiner())
    assert_status(rv, HTTPStatus.BAD_REQUEST)


def test_put_assign_then_status_additional_info(client, session, headers_strr_examiner, serializable_application):
    num = serializable_application["application_number"]
    assert_status(client.put(f"/applications/{num}/assign", headers=headers_strr_examiner()), HTTPStatus.OK)
    rv = client.put(
        f"/applications/{num}/status",
        headers=headers_strr_examiner(),
        json={"status": AppModel.Status.ADDITIONAL_INFO_REQUESTED.value},
    )
    assert_status(rv, HTTPStatus.OK)
    assert rv.get_json()["header"]["status"] == AppModel.Status.ADDITIONAL_INFO_REQUESTED.value


def test_put_status_forbidden_when_not_assignee(client, session, headers_strr_examiner, serializable_application):
    num = serializable_application["application_number"]
    rv = client.put(
        f"/applications/{num}/status",
        headers=headers_strr_examiner(),
        json={"status": AppModel.Status.ADDITIONAL_INFO_REQUESTED.value},
    )
    assert_status(rv, HTTPStatus.FORBIDDEN)


def test_post_notice_forbidden_when_not_assignee(client, session, headers_strr_examiner, serializable_application):
    num = serializable_application["application_number"]
    rv = client.post(
        f"/applications/{num}/notice-of-consideration",
        headers=headers_strr_examiner(),
        json={"content": "NOC body"},
    )
    assert_status(rv, HTTPStatus.FORBIDDEN)


def test_post_set_aside_forbidden_when_not_assignee(client, session, headers_strr_examiner, serializable_application):
    num = serializable_application["application_number"]
    rv = client.post(
        f"/applications/{num}/decision/set-aside",
        headers=headers_strr_examiner(),
        json={},
    )
    assert_status(rv, HTTPStatus.FORBIDDEN)


def test_put_assign_unassign_then_unassign_bad_request(
    client, session, headers_strr_examiner, serializable_application
):
    num = serializable_application["application_number"]
    assert_status(client.put(f"/applications/{num}/assign", headers=headers_strr_examiner()), HTTPStatus.OK)
    assert_status(client.put(f"/applications/{num}/unassign", headers=headers_strr_examiner()), HTTPStatus.OK)
    rv2 = client.put(f"/applications/{num}/unassign", headers=headers_strr_examiner())
    assert_status(rv2, HTTPStatus.BAD_REQUEST)


def test_post_notice_ok_when_assignee(client, session, headers_strr_examiner, serializable_application):
    num = serializable_application["application_number"]
    assert_status(client.put(f"/applications/{num}/assign", headers=headers_strr_examiner()), HTTPStatus.OK)
    rv = client.post(
        f"/applications/{num}/notice-of-consideration",
        headers=headers_strr_examiner(),
        json={"content": "Notice content for integration."},
    )
    assert_status(rv, HTTPStatus.OK)


def test_post_set_aside_ok_when_assignee(client, session, headers_strr_examiner, serializable_application):
    num = serializable_application["application_number"]
    assert_status(client.put(f"/applications/{num}/assign", headers=headers_strr_examiner()), HTTPStatus.OK)
    rv = client.post(
        f"/applications/{num}/decision/set-aside",
        headers=headers_strr_examiner(),
        json={},
    )
    assert_status(rv, HTTPStatus.OK)
    assert rv.get_json()["header"].get("isSetAside") is True


def test_patch_str_address_invalid_schema_bad_request(client, session, headers_strr_examiner, serializable_application):
    num = serializable_application["application_number"]
    rv = client.patch(
        f"/applications/{num}/str-address",
        headers=headers_strr_examiner(),
        json={"unitAddress": {}},
    )
    assert_status(rv, HTTPStatus.BAD_REQUEST)


def test_patch_str_address_ok(client, session, headers_strr_examiner, serializable_application):
    num = serializable_application["application_number"]
    payload = {
        "unitAddress": {
            "streetNumber": "12167",
            "streetName": "GREENWELL ST MAPLE RIDGE",
            "city": "MAPLE RIDGE",
            "postalCode": "V2X 7N1",
            "province": "BC",
        }
    }
    rv = client.patch(
        f"/applications/{num}/str-address",
        headers=headers_strr_examiner(),
        json=payload,
    )
    assert_status(rv, HTTPStatus.OK)
    ua = rv.get_json().get("registration", {}).get("unitAddress", {})
    assert ua.get("streetNumber") == "12167"


def test_get_ltsa_ok_patched(client, session, headers_strr_examiner, serializable_application):
    num = serializable_application["application_number"]
    with patch("strr_api.services.ltsa_service.LtsaService.get_application_ltsa_records", return_value=[]):
        rv = client.get(f"/applications/{num}/ltsa", headers=headers_strr_examiner())
    assert_status(rv, HTTPStatus.OK)
    assert rv.get_json() == []


def test_get_auto_approval_records_ok_patched(client, session, headers_strr_examiner, serializable_application):
    num = serializable_application["application_number"]
    with patch(
        "strr_api.services.approval_service.ApprovalService.get_approval_records_for_application",
        return_value=[],
    ):
        rv = client.get(f"/applications/{num}/auto-approval-records", headers=headers_strr_examiner())
    assert_status(rv, HTTPStatus.OK)
    assert rv.get_json() == []


def test_get_related_registrations_ok(client, session, headers_strr_examiner, serializable_application):
    num = serializable_application["application_number"]
    rv = client.get(
        f"/applications/{num}/host/related-registrations",
        headers=headers_strr_examiner(),
    )
    assert_status(rv, HTTPStatus.OK)
    assert isinstance(rv.get_json(), list)


def test_post_application_document_ok_patched_upload(client, session, headers_public_user, serializable_application):
    num = serializable_application["application_number"]
    with patch(
        "strr_api.services.document_service.DocumentService.upload_document",
        return_value={
            "fileKey": "app-doc-key-01",
            "fileName": "doc.txt",
            "fileType": "text/plain",
        },
    ):
        rv = client.post(
            f"/applications/{num}/documents",
            headers=headers_public_user(),
            data={
                "file": (BytesIO(b"hello"), "hello.txt"),
                "documentType": "OTHERS",
            },
            content_type="multipart/form-data",
        )
    assert_status(rv, HTTPStatus.CREATED)
    body = rv.get_json()
    assert body.get("fileKey") == "app-doc-key-01"


def test_put_application_document_ok_patched_upload(client, session, headers_public_user, serializable_application):
    num = serializable_application["application_number"]
    with patch(
        "strr_api.services.document_service.DocumentService.upload_document",
        return_value={
            "fileKey": "app-doc-put-01",
            "fileName": "put.txt",
            "fileType": "text/plain",
        },
    ):
        rv = client.put(
            f"/applications/{num}/documents",
            headers=headers_public_user(),
            data={
                "file": (BytesIO(b"put-body"), "put.txt"),
                "documentType": "OTHERS",
            },
            content_type="multipart/form-data",
        )
    assert_status(rv, HTTPStatus.OK)
    keys = {d.get("fileKey") for d in rv.get_json().get("registration", {}).get("documents", [])}
    assert "app-doc-put-01" in keys


@patch("strr_api.services.application_service.ApplicationService.enrich_document_added_on_from_gcp", lambda d: d)
def test_get_application_document_ok_patched_storage(client, session, headers_public_user, serializable_application):
    num = serializable_application["application_number"]
    with patch("strr_api.services.document_service.DocumentService.get_file_by_key", return_value=b"bytes"):
        rv = client.get(
            f"/applications/{num}/documents/a1234",
            headers=headers_public_user(),
        )
    assert_status(rv, HTTPStatus.OK)
    assert rv.data == b"bytes"


def test_get_application_document_wrong_key_bad_request(client, headers_public_user, serializable_application):
    num = serializable_application["application_number"]
    rv = client.get(
        f"/applications/{num}/documents/does-not-exist",
        headers=headers_public_user(),
    )
    assert_status(rv, HTTPStatus.BAD_REQUEST)


def test_delete_application_document_ok_patched(client, session, headers_public_user, serializable_application):
    num = serializable_application["application_number"]
    with patch("strr_api.services.document_service.DocumentService.delete_document", return_value=None):
        rv = client.delete(
            f"/applications/{num}/documents/a1234",
            headers=headers_public_user(),
        )
    assert_status(rv, HTTPStatus.NO_CONTENT)


def test_put_payment_details_missing_account_id_bad_request(client, jwt, serializable_application):
    from tests.unit.utils.auth_helpers import PUBLIC_USER, create_header

    num = serializable_application["application_number"]
    headers = create_header(jwt, [PUBLIC_USER])
    rv = client.put(f"/applications/{num}/payment-details", headers=headers, json={})
    assert_status(rv, HTTPStatus.BAD_REQUEST)


def test_put_payment_details_ok_patched_pay(
    client, session, headers_public_user, serializable_host_registration, integration_account_id
):
    num = generate_application_number()
    seed_listable_application(
        session,
        account_id=integration_account_id,
        submitter_user_id=serializable_host_registration["user_id"],
        registration_id=serializable_host_registration["registration_id"],
        application_number=num,
        status=AppModel.Status.PAYMENT_DUE.value,
        application_json=load_mock_json("host_registration.json"),
        invoice_id=555,
        payment_status_code="CREATED",
    )
    with patch(
        "strr_api.resources.application.strr_pay.get_payment_details_by_invoice_id",
        return_value=MOCK_PAYMENT_COMPLETED_RESPONSE,
    ):
        rv = client.put(f"/applications/{num}/payment-details", headers=headers_public_user(), json={})
    assert_status(rv, HTTPStatus.OK)
    assert rv.get_json()["header"]["status"] == AppModel.Status.PAID.value


def test_get_payment_receipt_ok_patched(
    client, session, headers_public_user, serializable_host_registration, integration_account_id
):
    num = generate_application_number()
    seed_listable_application(
        session,
        account_id=integration_account_id,
        submitter_user_id=serializable_host_registration["user_id"],
        registration_id=serializable_host_registration["registration_id"],
        application_number=num,
        status=AppModel.Status.PAID.value,
        application_json=load_mock_json("host_registration.json"),
        invoice_id=777,
        payment_status_code="COMPLETED",
    )

    def _fake_receipt(_jwt, _application):
        return Response(b"%PDF-1.4", mimetype="application/pdf", status=HTTPStatus.OK)

    with patch("strr_api.resources.application.strr_pay.get_payment_receipt", side_effect=_fake_receipt):
        rv = client.get(f"/applications/{num}/payment/receipt", headers=headers_public_user())
    assert_status(rv, HTTPStatus.OK)
    assert rv.data.startswith(b"%PDF")
