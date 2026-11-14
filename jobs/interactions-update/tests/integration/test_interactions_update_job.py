# pylint: disable=C0114, C0116
"""Integration tests for interactions-update job (Postgres + migrations via strr-test-utils)."""

import json

import pytest
import responses
from sqlalchemy import select
from sqlalchemy import update

from interactions_update.database import get_session
from interactions_update.services.interaction_processor import InteractionProcessor
from strr_api.enums.enum import InteractionStatus
from strr_api.models import CustomerInteraction
from strr_api.models import User

pytestmark = pytest.mark.integration


def test_db_session_smoke(session):
    """Docker Postgres, migrations, and the transactional ``session`` fixture work."""
    user = User()
    session.add(user)
    session.flush()
    assert user.id


@responses.activate
@pytest.mark.parametrize("setup_bulk_interactions", [{"records": 20}], indirect=True)
def test_full_job_roundtrip_pooled(
    db_session, setup_bulk_interactions, notify_job_integration_env, monkeypatch
):
    """
    End-to-end: seed -> multi-threaded job -> Notify mock -> assertions via pooled session.
    """
    notify_svc = notify_job_integration_env["notify_svc"]
    auth_url = notify_job_integration_env["auth_url"]
    monkeypatch.setenv("STRR_SERVICE_ACCOUNT_CLIENT_ID", "123")
    monkeypatch.setenv("STRR_SERVICE_ACCOUNT_SECRET", "secret")
    monkeypatch.setenv("MAX_WORKERS", "5")

    interaction_ids = setup_bulk_interactions["interaction_ids"]

    db_session.execute(
        update(CustomerInteraction)
        .where(CustomerInteraction.id.in_(interaction_ids))
        .values(notify_reference="test-ref-xyz")
    )
    db_session.commit()

    responses.add(
        responses.POST, auth_url, json={"access_token": "mock-token"}, status=200
    )

    def notify_callback(request):
        return (
            200,
            {},
            json.dumps(
                {
                    "id": "provider-id-123",
                    "gc_notify_status": "delivered",
                    "notifyStatus": "DELIVERED",
                    "notifyProvider": "GC_NOTIFY",
                }
            ),
        )

    responses.add_callback(
        responses.GET,
        url=f"{notify_svc}/notify/test-ref-xyz",
        callback=notify_callback,
        content_type="application/json",
    )

    processor = InteractionProcessor(max_workers=5)

    processor.run()
    session_gen = get_session()
    verify_session = next(session_gen)

    try:
        stmt = select(CustomerInteraction).where(
            CustomerInteraction.id.in_(interaction_ids)
        )
        updated_records = verify_session.scalars(stmt).all()

        assert len(updated_records) == 20
        for record in updated_records:
            assert record.status == InteractionStatus.DELIVERED
            assert record.provider_reference == "provider-id-123"
            assert record.meta_data["notifyStatus"] == "DELIVERED"

    finally:
        verify_session.close()


@responses.activate
@pytest.mark.parametrize("setup_bulk_interactions", [{"records": 1}], indirect=True)
def test_updates_when_primary_notify_reference_missing_but_metadata_present(
    db_session, setup_bulk_interactions, notify_job_integration_env, monkeypatch
):
    """Process SENT rows with metadata-only notify references."""
    notify_svc = notify_job_integration_env["notify_svc"]
    auth_url = notify_job_integration_env["auth_url"]
    monkeypatch.setenv("STRR_SERVICE_ACCOUNT_CLIENT_ID", "123")
    monkeypatch.setenv("STRR_SERVICE_ACCOUNT_SECRET", "secret")

    interaction_id = setup_bulk_interactions["interaction_ids"][0]
    interaction = db_session.get(CustomerInteraction, interaction_id)
    interaction.notify_reference = None
    interaction.meta_data = {
        "notify_references": "ref-meta-only",
        "notify_response": {"ids": "ref-meta-only"},
    }
    db_session.commit()

    responses.add(
        responses.POST, auth_url, json={"access_token": "mock-token"}, status=200
    )
    responses.add(
        responses.GET,
        f"{notify_svc}/notify/ref-meta-only",
        json={
            "id": "provider-id-meta",
            "gc_notify_status": "delivered",
            "notifyStatus": "delivered",
            "status_description": "DELIVERED",
            "recipients": "meta@example.com",
            "sentDate": "2026-07-07T10:00:00Z",
            "requestDate": "2026-07-07T09:59:00Z",
        },
        status=200,
    )

    processor = InteractionProcessor(max_workers=1)

    processor.run()
    session_gen = get_session()
    verify_session = next(session_gen)
    try:
        updated = verify_session.get(CustomerInteraction, interaction_id)
        assert updated.status == InteractionStatus.DELIVERED
        assert (
            updated.meta_data["notify_delivery"]["recipient_statuses"]["ref-meta-only"][
                "status"
            ]
            == "DELIVERED"
        )
    finally:
        verify_session.close()


@responses.activate
@pytest.mark.parametrize("setup_bulk_interactions", [{"records": 1}], indirect=True)
def test_updates_all_notify_references_and_failure_metadata(
    db_session, setup_bulk_interactions, notify_job_integration_env, monkeypatch
):
    """Poll all split-recipient notify refs and persist structured failure metadata."""
    notify_svc = notify_job_integration_env["notify_svc"]
    auth_url = notify_job_integration_env["auth_url"]
    monkeypatch.setenv("STRR_SERVICE_ACCOUNT_CLIENT_ID", "123")
    monkeypatch.setenv("STRR_SERVICE_ACCOUNT_SECRET", "secret")

    interaction_id = setup_bulk_interactions["interaction_ids"][0]
    interaction = db_session.get(CustomerInteraction, interaction_id)
    interaction.notify_reference = None
    interaction.meta_data = {
        "notify_references": "ref-meta-primary,ref-meta-secondary",
        "notify_response": {"ids": "ref-meta-primary,ref-meta-secondary"},
    }
    db_session.commit()

    responses.add(
        responses.POST, auth_url, json={"access_token": "mock-token"}, status=200
    )
    responses.add(
        responses.GET,
        f"{notify_svc}/notify/ref-meta-primary",
        json={
            "id": "provider-id-primary",
            "gc_notify_status": "delivered",
            "notifyStatus": "delivered",
            "status_description": "Delivered",
            "recipients": "primary@example.com",
            "sentDate": "2026-07-07T10:00:00Z",
            "requestDate": "2026-07-07T09:59:00Z",
        },
        status=200,
    )
    responses.add(
        responses.GET,
        f"{notify_svc}/notify/ref-meta-secondary",
        json={
            "id": "provider-id-secondary",
            "gc_notify_status": "technical-failure",
            "notifyStatus": "technical-failure",
            "status_description": "Tech issue",
            "provider_response": "Mailbox provider unavailable",
            "recipients": "secondary@example.com",
            "sentDate": "2026-07-07T10:01:00Z",
            "requestDate": "2026-07-07T10:00:00Z",
        },
        status=200,
    )

    processor = InteractionProcessor(max_workers=1)

    processor.run()
    session_gen = get_session()
    verify_session = next(session_gen)
    try:
        updated = verify_session.get(CustomerInteraction, interaction_id)

        assert updated.status == InteractionStatus.FAILED
        assert updated.provider_reference == "provider-id-primary"

        notify_delivery = updated.meta_data["notify_delivery"]
        recipient_statuses = notify_delivery["recipient_statuses"]

        assert set(recipient_statuses.keys()) == {
            "ref-meta-primary",
            "ref-meta-secondary",
        }
        assert recipient_statuses["ref-meta-primary"]["status"] == "DELIVERED"
        assert recipient_statuses["ref-meta-secondary"]["status"] == "TECHNICAL_FAILURE"
        assert recipient_statuses["ref-meta-secondary"]["failure_type"] in (
            "GATEWAY_ERROR",
            "TECHNICAL_FAILURE",
        )
        assert (
            recipient_statuses["ref-meta-secondary"]["failure_reason"]
            == "Mailbox provider unavailable"
        )
        assert (
            recipient_statuses["ref-meta-secondary"]["email_address"]
            == "secondary@example.com"
        )
        assert (
            recipient_statuses["ref-meta-secondary"]["sent_date"]
            == "2026-07-07T10:01:00Z"
        )
    finally:
        verify_session.close()


@responses.activate
@pytest.mark.parametrize("setup_bulk_interactions", [{"records": 1}], indirect=True)
def test_preserves_failed_recipients_and_marks_failed_on_partial_dispatch_failure(
    db_session, setup_bulk_interactions, notify_job_integration_env, monkeypatch
):
    """Preserve initial dispatch failed_recipients in notify_response and resolve to FAILED."""
    notify_svc = notify_job_integration_env["notify_svc"]
    auth_url = notify_job_integration_env["auth_url"]
    monkeypatch.setenv("STRR_SERVICE_ACCOUNT_CLIENT_ID", "123")
    monkeypatch.setenv("STRR_SERVICE_ACCOUNT_SECRET", "secret")

    interaction_id = setup_bulk_interactions["interaction_ids"][0]
    interaction = db_session.get(CustomerInteraction, interaction_id)
    interaction.notify_reference = "ref-partial-primary"
    interaction.meta_data = {
        "notify_references": "ref-partial-primary",
        "notify_response": {
            "id": "ref-partial-primary",
            "ids": "ref-partial-primary",
            "recipients": "primary@example.com",
            "failed_recipients": [
                {
                    "email_address": "invalid@example.com.ca",
                    "status_code": 400,
                    "error": {"message": "Invalid email address"},
                }
            ],
        },
    }
    db_session.commit()

    responses.add(
        responses.POST, auth_url, json={"access_token": "mock-token"}, status=200
    )
    responses.add(
        responses.GET,
        f"{notify_svc}/notify/ref-partial-primary",
        json={
            "id": "provider-id-partial-primary",
            "gc_notify_status": "delivered",
            "notifyStatus": "delivered",
            "status_description": "Delivered",
            "recipients": "primary@example.com",
            "sentDate": "2026-07-07T10:00:00Z",
            "requestDate": "2026-07-07T09:59:00Z",
        },
        status=200,
    )

    processor = InteractionProcessor(max_workers=1)
    processor.run()

    session_gen = get_session()
    verify_session = next(session_gen)
    try:
        updated = verify_session.get(CustomerInteraction, interaction_id)

        # Because an initial recipient failed, interaction should resolve to FAILED
        assert updated.status == InteractionStatus.FAILED

        # Verify failed_recipients was preserved in notify_response
        assert updated.meta_data["notify_response"]["failed_recipients"] == [
            {
                "email_address": "invalid@example.com.ca",
                "status_code": 400,
                "error": {"message": "Invalid email address"},
            }
        ]
        assert updated.meta_data["notify_response"]["ids"] == "ref-partial-primary"

        # Verify notify_delivery contains the polled reference
        recipient_statuses = updated.meta_data["notify_delivery"]["recipient_statuses"]
        assert "ref-partial-primary" in recipient_statuses
        assert recipient_statuses["ref-partial-primary"]["status"] == "DELIVERED"
    finally:
        verify_session.close()


@responses.activate
@pytest.mark.parametrize("setup_bulk_interactions", [{"records": 1}], indirect=True)
def test_job_updates_normalized_interaction_recipients_table(
    db_session, setup_bulk_interactions, notify_job_integration_env, monkeypatch
):
    """Worker should populate and update interaction_recipients relational rows."""
    from strr_api.enums.enum import DeliveryStatus
    from strr_api.models import InteractionRecipient

    notify_svc = notify_job_integration_env["notify_svc"]
    auth_url = notify_job_integration_env["auth_url"]
    monkeypatch.setenv("STRR_SERVICE_ACCOUNT_CLIENT_ID", "123")
    monkeypatch.setenv("STRR_SERVICE_ACCOUNT_SECRET", "secret")

    interaction_id = setup_bulk_interactions["interaction_ids"][0]
    interaction = db_session.get(CustomerInteraction, interaction_id)
    interaction.notify_reference = "ref-norm-1"
    interaction.meta_data = {
        "notify_references": "ref-norm-1",
        "notify_response": {"ids": "ref-norm-1"},
    }
    db_session.commit()

    responses.add(
        responses.POST, auth_url, json={"access_token": "mock-token"}, status=200
    )
    responses.add(
        responses.GET,
        f"{notify_svc}/notify/ref-norm-1",
        json={
            "id": "provider-id-norm",
            "notify_status": "completed",
            "notifyStatus": "delivered",
            "status_description": "Delivered",
            "recipients": "normalized-host@example.com",
            "sentDate": "2026-07-07T10:00:00Z",
            "requestDate": "2026-07-07T09:59:00Z",
        },
        status=200,
    )

    processor = InteractionProcessor(max_workers=1)
    processor.run()

    session_gen = get_session()
    verify_session = next(session_gen)
    try:
        updated = verify_session.get(CustomerInteraction, interaction_id)
        assert updated.status == InteractionStatus.DELIVERED

        recipients = (
            verify_session.query(InteractionRecipient)
            .filter_by(interaction_id=interaction_id)
            .all()
        )
        assert len(recipients) == 1
        rec = recipients[0]
        assert rec.email_address == "normalized-host@example.com"
        assert rec.status == DeliveryStatus.DELIVERED
        assert rec.notify_reference == "ref-norm-1"
        assert rec.provider_reference == "provider-id-norm"
    finally:
        verify_session.close()


@responses.activate
@pytest.mark.parametrize("setup_bulk_interactions", [{"records": 1}], indirect=True)
def test_job_skips_stale_records_older_than_24h(
    db_session, setup_bulk_interactions, notify_job_integration_env, monkeypatch
):
    """Worker should skip querying Notify API for interactions created > 24 hours ago."""
    from datetime import datetime
    from datetime import timedelta
    from datetime import timezone

    notify_svc = notify_job_integration_env["notify_svc"]
    auth_url = notify_job_integration_env["auth_url"]
    monkeypatch.setenv("STRR_SERVICE_ACCOUNT_CLIENT_ID", "123")
    monkeypatch.setenv("STRR_SERVICE_ACCOUNT_SECRET", "secret")
    monkeypatch.setenv("STALE_SENT_HOURS", "24")

    interaction_id = setup_bulk_interactions["interaction_ids"][0]
    interaction = db_session.get(CustomerInteraction, interaction_id)
    interaction.notify_reference = "ref-stale-skip"
    interaction.created_at = datetime.now(timezone.utc) - timedelta(hours=30)
    interaction.meta_data = {
        "notify_references": "ref-stale-skip",
        "notify_response": {"ids": "ref-stale-skip"},
    }
    db_session.commit()

    responses.add(
        responses.POST, auth_url, json={"access_token": "mock-token"}, status=200
    )
    # Intentionally do not mock GET notify endpoint; if called, test will fail!

    processor = InteractionProcessor(max_workers=1)
    processor.run()

    session_gen = get_session()
    verify_session = next(session_gen)
    try:
        interaction_after = verify_session.get(CustomerInteraction, interaction_id)
        # Should stay in SENT and NOT fail or call API
        assert interaction_after.status == InteractionStatus.SENT
    finally:
        verify_session.close()


@responses.activate
@pytest.mark.parametrize("setup_bulk_interactions", [{"records": 1}], indirect=True)
def test_job_updates_recipients_with_bc_notify_permanent_failure(
    db_session, setup_bulk_interactions, notify_job_integration_env, monkeypatch
):
    """Worker should handle BC Notify notify_status payload and mark recipient/interaction as failed."""
    from strr_api.enums.enum import DeliveryStatus
    from strr_api.enums.enum import FailureType
    from strr_api.models import InteractionRecipient

    notify_svc = notify_job_integration_env["notify_svc"]
    auth_url = notify_job_integration_env["auth_url"]
    monkeypatch.setenv("STRR_SERVICE_ACCOUNT_CLIENT_ID", "123")
    monkeypatch.setenv("STRR_SERVICE_ACCOUNT_SECRET", "secret")

    interaction_id = setup_bulk_interactions["interaction_ids"][0]
    interaction = db_session.get(CustomerInteraction, interaction_id)
    interaction.notify_reference = "ref-bc-fail-1"
    interaction.meta_data = {
        "notify_references": "ref-bc-fail-1",
        "notify_response": {"ids": "ref-bc-fail-1"},
    }
    db_session.commit()

    responses.add(
        responses.POST, auth_url, json={"access_token": "mock-token"}, status=200
    )
    # BC Notify returns notify_status (no gc_notify_status)
    responses.add(
        responses.GET,
        f"{notify_svc}/notify/ref-bc-fail-1",
        json={
            "id": "provider-id-bc-fail",
            "notify_status": "permanent-failure",
            "status_description": "Permanent failure",
            "provider_response": "550 5.1.1 Recipient mailbox not found",
            "recipients": "bc-bounced@example.com",
            "sentDate": "2026-07-07T10:00:00Z",
            "requestDate": "2026-07-07T09:59:00Z",
        },
        status=200,
    )

    processor = InteractionProcessor(max_workers=1)
    processor.run()

    session_gen = get_session()
    verify_session = next(session_gen)
    try:
        updated = verify_session.get(CustomerInteraction, interaction_id)
        assert updated.status == InteractionStatus.FAILED

        recipients = (
            verify_session.query(InteractionRecipient)
            .filter_by(interaction_id=interaction_id)
            .all()
        )
        assert len(recipients) == 1
        rec = recipients[0]
        assert rec.email_address == "bc-bounced@example.com"
        assert rec.status == DeliveryStatus.PERMANENT_FAILURE
        assert rec.notify_reference == "ref-bc-fail-1"
        assert rec.provider_reference == "provider-id-bc-fail"
        assert rec.failure_type == FailureType.PERMANENT_BOUNCE.value
        assert "Recipient mailbox not found" in rec.failure_reason

        # Verify dual-write to metadata
        meta = updated.meta_data
        rec_status = meta["notify_delivery"]["recipient_statuses"]["ref-bc-fail-1"]
        assert rec_status["status"] == DeliveryStatus.PERMANENT_FAILURE.value
        assert rec_status["failure_type"] == FailureType.PERMANENT_BOUNCE.value
    finally:
        verify_session.close()
