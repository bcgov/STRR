"""Integration tests for staff / privileged ``/applications`` flows."""

from http import HTTPStatus
from io import BytesIO
from unittest.mock import patch

import pytest
from flask import Response

from strr_api.enums.enum import ChannelType, DeliveryStatus, InteractionStatus
from strr_api.models.application import Application as AppModel
from strr_api.models.interactions import CustomerInteraction, InteractionRecipient
from tests.integration.application_seed import generate_application_number, seed_listable_application
from tests.integration.helpers import assert_json_keys, assert_status, load_mock_json
from tests.shared_test_constants import MOCK_PAYMENT_COMPLETED_RESPONSE


@pytest.mark.parametrize("headers_fixture", ["headers_strr_examiner", "headers_strr_investigator"])
def test_applications_search_staff_roles_envelope(client, request, headers_fixture):
    headers_maker = request.getfixturevalue(headers_fixture)
    rv = client.get("/applications/search?text=abc", headers=headers_maker())
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
    response_json = rv.get_json()
    assert response_json["header"].get("nocStartDate") is not None
    assert response_json["header"].get("nocEndDate") is not None
    assert response_json["header"].get("nocSentDate") is not None


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
    app_model = AppModel.find_by_application_number(num)
    app_model.registration_id = None
    session.commit()
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


def test_put_payment_details_missing_account_id_bad_request(client, serializable_application, headers_public_user):
    num = serializable_application["application_number"]
    rv = client.put(
        f"/applications/{num}/payment-details",
        headers=headers_public_user(account_id=None),
        json={},
    )
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


def test_get_applications_filter_has_email_failure(
    client, session, headers_strr_examiner, serializable_host_registration, integration_account_id
):
    # Seed application with email failure
    num_fail = generate_application_number()
    app_fail = seed_listable_application(
        session,
        account_id=integration_account_id,
        submitter_user_id=serializable_host_registration["user_id"],
        registration_id=serializable_host_registration["registration_id"],
        application_number=num_fail,
        status=AppModel.Status.FULL_REVIEW.value,
    )
    interaction_fail = CustomerInteraction(
        channel=ChannelType.EMAIL,
        status=InteractionStatus.FAILED,
        application_id=app_fail["application_id"],
    )
    session.add(interaction_fail)
    session.flush()

    recipient_fail = InteractionRecipient(
        interaction_id=interaction_fail.id,
        recipient_role="PRIMARY_HOST",
        email_address="host_fail@test.com",
        status=DeliveryStatus.PERMANENT_FAILURE,
        failure_type="PERMANENT_FAILURE",
        failure_reason="Invalid recipient email",
        notify_reference="notify-app-fail-001",
    )
    session.add(recipient_fail)

    # Seed application with successful email delivery
    num_ok = generate_application_number()
    app_ok = seed_listable_application(
        session,
        account_id=integration_account_id,
        submitter_user_id=serializable_host_registration["user_id"],
        registration_id=serializable_host_registration["registration_id"],
        application_number=num_ok,
        status=AppModel.Status.FULL_REVIEW.value,
    )
    interaction_ok = CustomerInteraction(
        channel=ChannelType.EMAIL,
        status=InteractionStatus.DELIVERED,
        application_id=app_ok["application_id"],
    )
    session.add(interaction_ok)
    session.flush()

    recipient_ok = InteractionRecipient(
        interaction_id=interaction_ok.id,
        recipient_role="PRIMARY_HOST",
        email_address="host_ok@test.com",
        status=DeliveryStatus.DELIVERED,
        notify_reference="notify-app-ok-002",
    )
    session.add(recipient_ok)
    session.commit()

    # Query hasEmailFailure=true
    rv = client.get(f"/applications?hasEmailFailure=true&text={num_fail}", headers=headers_strr_examiner())
    assert_status(rv, HTTPStatus.OK)
    data = rv.get_json()
    matched = [a for a in data["applications"] if a["header"]["applicationNumber"] == num_fail]
    assert len(matched) == 1
    assert matched[0]["header"]["hasEmailDeliveryFailure"] is True
    assert matched[0]["hasEmailDeliveryFailure"] is True

    # Query hasEmailFailure=false should exclude the failed app
    rv = client.get(f"/applications?hasEmailFailure=false&text={num_fail}", headers=headers_strr_examiner())
    assert_status(rv, HTTPStatus.OK)
    data = rv.get_json()
    assert not any(a["header"]["applicationNumber"] == num_fail for a in data["applications"])

    # Query hasEmailFailure=false should include the successful app
    rv = client.get(f"/applications?hasEmailFailure=false&text={num_ok}", headers=headers_strr_examiner())
    assert_status(rv, HTTPStatus.OK)
    data = rv.get_json()
    matched_ok = [a for a in data["applications"] if a["header"]["applicationNumber"] == num_ok]
    assert len(matched_ok) == 1
    assert matched_ok[0]["header"]["hasEmailDeliveryFailure"] is False
    assert matched_ok[0]["hasEmailDeliveryFailure"] is False

    # Query hasEmailFailure=true should exclude the successful app
    rv = client.get(f"/applications?hasEmailFailure=true&text={num_ok}", headers=headers_strr_examiner())
    assert_status(rv, HTTPStatus.OK)
    data = rv.get_json()
    assert not any(a["header"]["applicationNumber"] == num_ok for a in data["applications"])

    # Applications search endpoint with hasEmailFailure
    rv_search_fail = client.get(
        f"/applications/search?text={num_fail}&hasEmailFailure=true", headers=headers_strr_examiner()
    )
    assert_status(rv_search_fail, HTTPStatus.OK)
    assert any(a["header"]["applicationNumber"] == num_fail for a in rv_search_fail.get_json()["applications"])

    rv_search_excl = client.get(
        f"/applications/search?text={num_fail}&hasEmailFailure=false", headers=headers_strr_examiner()
    )
    assert_status(rv_search_excl, HTTPStatus.OK)
    assert not any(a["header"]["applicationNumber"] == num_fail for a in rv_search_excl.get_json()["applications"])


def test_get_application_events_delivery_structured_details(
    client, session, headers_strr_examiner, serializable_application
):
    aid = serializable_application["application_id"]
    num = serializable_application["application_number"]

    interaction = CustomerInteraction(
        channel=ChannelType.EMAIL,
        status=InteractionStatus.FAILED,
        application_id=aid,
    )
    session.add(interaction)
    session.flush()

    recipient = InteractionRecipient(
        interaction_id=interaction.id,
        recipient_role="PRIMARY_HOST",
        email_address="examiner-target@test.com",
        status=DeliveryStatus.PERMANENT_FAILURE,
        failure_type="PERMANENT_FAILURE",
        failure_reason="Mailbox unavailable",
        notify_reference="notify-app-event-999",
        provider_reference="provider-app-event-999",
    )
    session.add(recipient)
    session.commit()

    rv = client.get(
        f"/applications/{num}/events?include_interaction_delivery=true",
        headers=headers_strr_examiner(),
    )
    assert_status(rv, HTTPStatus.OK)
    events = rv.get_json()
    email_event = next((e for e in events if e.get("eventName") == "EMAIL_FAILED"), None)
    assert email_event is not None
    assert email_event["structuredDetails"]["interactionStatus"] == "FAILED"
    recipients = email_event["structuredDetails"]["recipientStatuses"]
    assert isinstance(recipients, list)
    assert len(recipients) == 1
    assert recipients[0]["email_address"] == "examiner-target@test.com"
    assert recipients[0]["status"] == "FAILED"
    assert recipients[0]["failure_type"] == "PERMANENT_FAILURE"
    assert recipients[0]["failure_reason"] == "Mailbox unavailable"
    assert recipients[0]["notify_reference"] == "notify-app-event-999"
    assert recipients[0]["provider_reference"] == "provider-app-event-999"
    assert recipients[0]["recipient_role"] == "PRIMARY_HOST"


def test_get_application_partial_delivery_failure_multi_recipient(
    client, session, headers_strr_examiner, serializable_host_registration, integration_account_id
):
    """An interaction with 1 delivered and 1 failed recipient marks application as having email failure."""
    num = generate_application_number()
    app = seed_listable_application(
        session,
        account_id=integration_account_id,
        submitter_user_id=serializable_host_registration["user_id"],
        registration_id=serializable_host_registration["registration_id"],
        application_number=num,
        status=AppModel.Status.FULL_REVIEW.value,
    )
    interaction = CustomerInteraction(
        channel=ChannelType.EMAIL,
        status=InteractionStatus.FAILED,
        application_id=app["application_id"],
    )
    session.add(interaction)
    session.flush()

    rec_host = InteractionRecipient(
        interaction_id=interaction.id,
        recipient_role="PRIMARY_HOST",
        email_address="host-ok@test.com",
        status=DeliveryStatus.DELIVERED,
        notify_reference=f"notify-multi-host-{num}",
    )
    rec_pm = InteractionRecipient(
        interaction_id=interaction.id,
        recipient_role="PROPERTY_MANAGER",
        email_address="pm-fail@test.com",
        status=DeliveryStatus.TECHNICAL_FAILURE,
        failure_type="GATEWAY_ERROR",
        failure_reason="Mailbox provider unavailable",
        notify_reference=f"notify-multi-pm-{num}",
    )
    session.add_all([rec_host, rec_pm])
    session.commit()

    # Query hasEmailFailure=true
    rv = client.get(f"/applications?hasEmailFailure=true&text={num}", headers=headers_strr_examiner())
    assert_status(rv, HTTPStatus.OK)
    data = rv.get_json()
    matched = [a for a in data["applications"] if a["header"]["applicationNumber"] == num]
    assert len(matched) == 1
    assert matched[0]["header"]["hasEmailDeliveryFailure"] is True

    # Query events
    rv_events = client.get(
        f"/applications/{num}/events?include_interaction_delivery=true",
        headers=headers_strr_examiner(),
    )
    assert_status(rv_events, HTTPStatus.OK)
    events = rv_events.get_json()
    email_event = next((e for e in events if e.get("eventName") == "EMAIL_FAILED"), None)
    assert email_event is not None
    recipients = email_event["structuredDetails"]["recipientStatuses"]
    assert len(recipients) == 2
    r_host = next(r for r in recipients if r["recipient_role"] == "PRIMARY_HOST")
    assert r_host["status"] == "DELIVERED"
    r_pm = next(r for r in recipients if r["recipient_role"] == "PROPERTY_MANAGER")
    assert r_pm["status"] == "FAILED"
    assert r_pm["failure_type"] == "GATEWAY_ERROR"
    assert r_pm["failure_reason"] == "Mailbox provider unavailable"


def test_get_application_events_fallback_to_metadata_when_recipients_table_empty(
    client, session, headers_strr_examiner, serializable_application
):
    """Historical interactions before backfill (empty interaction_recipients) gracefully fallback to metadata JSON."""
    aid = serializable_application["application_id"]
    num = serializable_application["application_number"]

    interaction = CustomerInteraction(
        channel=ChannelType.EMAIL,
        status=InteractionStatus.FAILED,
        application_id=aid,
        meta_data={
            "notify_delivery": {
                "updated_at": "2026-07-08T20:53:21.399598+00:00",
                "recipient_statuses": {
                    "legacy-ref-123": {
                        "email_address": "legacy@gov.bc.ca",
                        "status": "FAILED",
                        "failure_type": "permanent",
                        "failure_reason": "Address not found",
                        "notify_reference": "legacy-ref-123",
                    }
                },
            }
        },
    )
    session.add(interaction)
    session.commit()

    rv = client.get(
        f"/applications/{num}/events?include_interaction_delivery=true",
        headers=headers_strr_examiner(),
    )
    assert_status(rv, HTTPStatus.OK)
    events = rv.get_json()
    email_event = next((e for e in events if e.get("eventName") == "EMAIL_FAILED"), None)
    assert email_event is not None
    recipients = email_event["structuredDetails"]["recipientStatuses"]
    assert len(recipients) == 1
    assert recipients[0]["email_address"] == "legacy@gov.bc.ca"
    assert recipients[0]["status"] == "FAILED"
    assert recipients[0]["failure_reason"] == "Address not found"
