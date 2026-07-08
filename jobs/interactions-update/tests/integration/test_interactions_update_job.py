# pylint: disable=C0114, C0116
"""Integration tests for interactions-update job (Postgres + migrations via strr-test-utils)."""

import json

import pytest
import responses
from interactions_update.database import get_session
from interactions_update.job import run
from sqlalchemy import select, update

from strr_api.enums.enum import InteractionStatus
from strr_api.models import CustomerInteraction, User

pytestmark = pytest.mark.integration


def test_db_session_smoke(session):
    """Docker Postgres, migrations, and the transactional ``session`` fixture work."""
    user = User()
    session.add(user)
    session.flush()
    assert user.id


@responses.activate
@pytest.mark.parametrize("setup_bulk_interactions", [{"records": 20}], indirect=True)
def test_full_job_roundtrip_pooled(db_session, setup_bulk_interactions, notify_job_integration_env, monkeypatch):
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

    responses.add(responses.POST, auth_url, json={"access_token": "mock-token"}, status=200)

    def notify_callback(request):
        return (
            200,
            {},
            json.dumps(
                {
                    "id": "provider-id-123",
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

    run(max_workers=5)

    session_gen = get_session()
    verify_session = next(session_gen)

    try:
        stmt = select(CustomerInteraction).where(CustomerInteraction.id.in_(interaction_ids))
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

    responses.add(responses.POST, auth_url, json={"access_token": "mock-token"}, status=200)
    responses.add(
        responses.GET,
        f"{notify_svc}/notify/ref-meta-only",
        json={
            "id": "provider-id-meta",
            "notifyStatus": "sent",
            "status_description": "Sent",
            "recipients": "meta@example.com",
            "sentDate": "2026-07-07T10:00:00Z",
            "requestDate": "2026-07-07T09:59:00Z",
        },
        status=200,
    )

    run(max_workers=1)

    session_gen = get_session()
    verify_session = next(session_gen)
    try:
        updated = verify_session.get(CustomerInteraction, interaction_id)
        assert updated.status == InteractionStatus.DELIVERED
        assert updated.meta_data["notify_delivery"]["recipient_statuses"]["ref-meta-only"]["status"] == "SENT"
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

    responses.add(responses.POST, auth_url, json={"access_token": "mock-token"}, status=200)
    responses.add(
        responses.GET,
        f"{notify_svc}/notify/ref-meta-primary",
        json={
            "id": "provider-id-primary",
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
            "notifyStatus": "technical-failure",
            "status_description": "Tech issue",
            "provider_response": "Mailbox provider unavailable",
            "recipients": "secondary@example.com",
            "sentDate": "2026-07-07T10:01:00Z",
            "requestDate": "2026-07-07T10:00:00Z",
        },
        status=200,
    )

    run(max_workers=1)

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
        assert recipient_statuses["ref-meta-secondary"]["failure_type"] == "TECHNICAL_FAILURE"
        assert recipient_statuses["ref-meta-secondary"]["failure_reason"] == "Mailbox provider unavailable"
        assert recipient_statuses["ref-meta-secondary"]["email_address"] == "secondary@example.com"
        assert recipient_statuses["ref-meta-secondary"]["sent_date"] == "2026-07-07T10:01:00Z"
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

    responses.add(responses.POST, auth_url, json={"access_token": "mock-token"}, status=200)
    responses.add(
        responses.GET,
        f"{notify_svc}/notify/ref-meta-only",
        json={
            "id": "provider-id-meta",
            "notifyStatus": "sent",
            "status_description": "Sent",
            "recipients": "meta@example.com",
            "sentDate": "2026-07-07T10:00:00Z",
            "requestDate": "2026-07-07T09:59:00Z",
        },
        status=200,
    )

    run(max_workers=1)

    session_gen = get_session()
    verify_session = next(session_gen)
    try:
        updated = verify_session.get(CustomerInteraction, interaction_id)
        assert updated.status == InteractionStatus.DELIVERED
        assert updated.meta_data["notify_delivery"]["recipient_statuses"]["ref-meta-only"]["status"] == "SENT"
    finally:
        verify_session.close()
