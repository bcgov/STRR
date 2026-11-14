"""Integration tests for interaction recipients backfill (Postgres + migrations)."""

import pytest

try:
    from strr_api.enums.enum import (
        ChannelType,
        DeliveryStatus,
        FailureType,
        InteractionStatus,
    )
    from strr_api.models import CustomerInteraction, InteractionRecipient
except ImportError:
    ChannelType = DeliveryStatus = FailureType = InteractionStatus = None
    CustomerInteraction = InteractionRecipient = None

from backfiller.job import backfill_interaction_recipients

pytestmark = pytest.mark.integration


def test_backfill_interaction_recipients_empty_db(session, app):
    """Smoke: backfill completes cleanly on empty database."""
    backfill_interaction_recipients(app, batch_size=10)
    assert session.query(InteractionRecipient).count() == 0


def test_backfill_interaction_recipients_creates_rows_and_is_idempotent(
    session, app, setup_parents
):
    """Verify batch historical backfill extracts multi-recipient metadata into normalized table."""
    application_id = setup_parents["application_id"]
    user_id = setup_parents["user_id"]

    # 1. Historical interaction 1: multi-recipient with delivered host and bounced property manager
    interaction_1 = CustomerInteraction(
        channel=ChannelType.EMAIL,
        status=InteractionStatus.FAILED,
        user_id=user_id,
        application_id=application_id,
        notify_reference="ref-multi-1",
        meta_data={
            "notify_response": {
                "id": "ref-multi-1",
                "ids": "ref-multi-1",
                "recipients": "host-user@example.com",
                "notifyStatus": "DELIVERED",
                "requestDate": "2026-10-01T10:00:00+00:00",
                "sentDate": "2026-10-01T10:01:00+00:00",
                "failed_recipients": [
                    {
                        "email_address": "pm-user@example.com",
                        "status_code": 400,
                        "error": "550 User unknown pm-user@example.com",
                    }
                ],
            },
            "recipient_roles": {
                "host-user@example.com": "HOST",
                "pm-user@example.com": "PROPERTY_MANAGER",
            },
        },
    )

    # 2. Historical interaction 2: delivered single recipient
    interaction_2 = CustomerInteraction(
        channel=ChannelType.EMAIL,
        status=InteractionStatus.DELIVERED,
        user_id=user_id,
        application_id=application_id,
        notify_reference="ref-single-2",
        meta_data={
            "notify_response": {
                "id": "ref-single-2",
                "recipients": "single-host@example.com",
                "notifyStatus": "DELIVERED",
                "requestDate": "2026-10-02T10:00:00+00:00",
                "sentDate": "2026-10-02T10:01:00+00:00",
            },
            "recipient_roles": {
                "single-host@example.com": "HOST",
            },
        },
    )

    session.add_all([interaction_1, interaction_2])
    session.commit()

    # Pre-condition: zero recipient rows exist
    assert session.query(InteractionRecipient).count() == 0

    # Execute backfill
    backfill_interaction_recipients(app, batch_size=10)

    # Assert rows created
    recipients_1 = (
        session.query(InteractionRecipient)
        .filter_by(interaction_id=interaction_1.id)
        .order_by(InteractionRecipient.email_address.asc())
        .all()
    )
    assert len(recipients_1) == 2

    host_rec = next(
        r for r in recipients_1 if r.email_address == "host-user@example.com"
    )
    assert host_rec.status == DeliveryStatus.DELIVERED
    assert host_rec.recipient_role == "HOST"
    assert host_rec.notify_reference == "ref-multi-1"

    pm_rec = next(r for r in recipients_1 if r.email_address == "pm-user@example.com")
    assert pm_rec.status == DeliveryStatus.PERMANENT_FAILURE
    assert pm_rec.recipient_role == "PROPERTY_MANAGER"
    assert pm_rec.failure_type == FailureType.PERMANENT_BOUNCE.value
    assert "pm-user@example.com" not in pm_rec.failure_reason

    recipients_2 = (
        session.query(InteractionRecipient)
        .filter_by(interaction_id=interaction_2.id)
        .all()
    )
    assert len(recipients_2) == 1
    assert recipients_2[0].email_address == "single-host@example.com"
    assert recipients_2[0].status == DeliveryStatus.DELIVERED

    # Re-run backfill: should be completely idempotent (count remains 3)
    backfill_interaction_recipients(app, batch_size=10)
    assert session.query(InteractionRecipient).count() == 3


def test_backfill_interaction_recipients_from_notify_delivery_metadata(
    session, app, setup_parents
):
    """Backfill extracts recipient statuses formatted under notify_delivery (e.g. from prior polling jobs)."""
    application_id = setup_parents["application_id"]
    user_id = setup_parents["user_id"]

    interaction = CustomerInteraction(
        channel=ChannelType.EMAIL,
        status=InteractionStatus.FAILED,
        user_id=user_id,
        application_id=application_id,
        meta_data={
            "notify_delivery": {
                "recipient_statuses": {
                    "ref-polled-1": {
                        "email_address": "polled-host@example.com",
                        "status": "FAILED",
                        "failure_type": "permanent",
                        "failure_reason": "Mailbox does not exist",
                        "notify_reference": "ref-polled-1",
                        "provider_reference": "prov-polled-1",
                    }
                }
            }
        },
    )
    session.add(interaction)
    session.commit()

    backfill_interaction_recipients(app, batch_size=10)

    recipients = (
        session.query(InteractionRecipient)
        .filter_by(interaction_id=interaction.id)
        .all()
    )
    assert len(recipients) == 1
    assert recipients[0].email_address == "polled-host@example.com"
    assert recipients[0].status == DeliveryStatus.PERMANENT_FAILURE
    assert recipients[0].notify_reference == "ref-polled-1"
    assert recipients[0].provider_reference == "prov-polled-1"
