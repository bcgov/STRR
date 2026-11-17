# Copyright © 2026 Province of British Columbia
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""Unit tests for DeliveryStatusAdapter, interaction_recipients dual-write, backfill, and dashboard queries."""

import pytest

from strr_api.enums.enum import ChannelType, DeliveryStatus, FailureType, InteractionStatus
from strr_api.models import Application, CustomerInteraction, InteractionRecipient, Registration
from strr_api.models.application import ApplicationSerializer
from strr_api.models.dataclass import ApplicationSearch, RegistrationSearch
from strr_api.responses.RegistrationSerializer import RegistrationSerializer
from strr_api.services.delivery_status_adapter import DeliveryStatusAdapter, classify_failure
from strr_api.services.interaction import InteractionService


@pytest.mark.parametrize(
    "raw_status, expected_delivery_status, expected_interaction_status",
    [
        # GC Notify statuses
        ("created", DeliveryStatus.PENDING, InteractionStatus.SENT),
        ("sending", DeliveryStatus.SENDING, InteractionStatus.SENT),
        ("delivered", DeliveryStatus.DELIVERED, InteractionStatus.DELIVERED),
        ("permanent-failure", DeliveryStatus.PERMANENT_FAILURE, InteractionStatus.FAILED),
        ("temporary-failure", DeliveryStatus.TEMPORARY_FAILURE, InteractionStatus.FAILED),
        ("technical-failure", DeliveryStatus.TECHNICAL_FAILURE, InteractionStatus.FAILED),
        # BC Notify statuses
        ("QUEUED", DeliveryStatus.QUEUED, InteractionStatus.QUEUED),
        ("SENDING", DeliveryStatus.SENDING, InteractionStatus.SENT),
        ("SENT", DeliveryStatus.SENDING, InteractionStatus.SENT),
        ("DELIVERED", DeliveryStatus.DELIVERED, InteractionStatus.DELIVERED),
        ("FAILED", DeliveryStatus.PERMANENT_FAILURE, InteractionStatus.FAILED),
        ("FAILURE", DeliveryStatus.PERMANENT_FAILURE, InteractionStatus.FAILED),
        ("VIRUS_SCAN_FAILED", DeliveryStatus.BLOCKED, InteractionStatus.FAILED),
        ("BLOCKED", DeliveryStatus.BLOCKED, InteractionStatus.FAILED),
        ("SUPPRESSED", DeliveryStatus.BLOCKED, InteractionStatus.FAILED),
    ],
)
def test_delivery_status_adapter_provider_mappings(raw_status, expected_delivery_status, expected_interaction_status):
    """Verify canonical mapping for all GC Notify and BC Notify provider status strings."""
    delivery_status = DeliveryStatusAdapter.map_provider_status(raw_status)
    assert delivery_status == expected_delivery_status
    interaction_status = DeliveryStatusAdapter.map_to_interaction_status(delivery_status)
    assert interaction_status == expected_interaction_status


def test_classify_failure_categories_and_sanitization():
    """Verify classify_failure maps raw vendor errors into FailureType and sanitizes PII/traces."""
    # Suppression list / blocked
    ftype, reason = classify_failure(
        provider_status="BLOCKED",
        raw_error="Address bad@example.com is on the suppression list at 10.24.0.12",
    )
    assert ftype == FailureType.SUPPRESSION_LIST
    assert "bad@example.com" not in reason
    assert "10.24.0.12" not in reason

    # Mailbox full / quota
    ftype, reason = classify_failure(
        provider_status="temporary-failure",
        raw_error="452 4.2.2 The email account that you tried to reach is over quota / mailbox full",
    )
    assert ftype == FailureType.MAILBOX_FULL
    assert "quota" in reason

    # Permanent bounce
    ftype, reason = classify_failure(
        provider_status="permanent-failure",
        raw_error="550 5.1.1 No such user host@invalid.domain",
    )
    assert ftype == FailureType.PERMANENT_BOUNCE
    assert "host@invalid.domain" not in reason

    # Gateway / technical error with stack trace
    ftype, reason = classify_failure(
        provider_status="technical-failure",
        raw_error="SMTP timeout error\nTraceback (most recent call last):\n  File 'app.py', line 10",
    )
    assert ftype == FailureType.GATEWAY_ERROR
    assert "Traceback" not in reason


def test_dual_write_interaction_recipients(session, setup_parents):
    """Verify _save_interaction dual-writes to interaction_recipients."""
    from strr_api.services.interaction import EmailInfo

    application_id = setup_parents["application_id"]

    email_info = EmailInfo(
        application_number="APP-101",
        email_type="HOST_FULL_REVIEW_APPROVED",
        email={
            "recipients": "host@example.com",
            "recipient_roles": {
                "host@example.com": "HOST",
                "pm@example.com": "PROPERTY_MANAGER",
            },
        },
    )
    notify_json = {
        "id": "ref-dual-1",
        "ids": "ref-dual-1",
        "recipients": "host@example.com",
        "notifyStatus": "DELIVERED",
        "requestDate": "2026-11-05T10:00:00+00:00",
        "sentDate": "2026-11-05T10:01:00+00:00",
        "failed_recipients": [
            {
                "email_address": "pm@example.com",
                "status_code": 400,
                "error": "550 Invalid mailbox pm@example.com",
            }
        ],
    }

    interaction = InteractionService._save_interaction(
        channel_type=ChannelType.EMAIL,
        payload=email_info,
        status=InteractionStatus.FAILED,
        idempotency_key="dual-write-test-1",
        user_id=setup_parents["user_id"],
        application_id=application_id,
        registration_id=None,
        customer_id=None,
        notify_json=notify_json,
    )

    recipients = (
        session.query(InteractionRecipient)
        .filter(InteractionRecipient.interaction_id == interaction.id)
        .order_by(InteractionRecipient.email_address.asc())
        .all()
    )
    assert len(recipients) == 2

    host_rec = next(r for r in recipients if r.email_address == "host@example.com")
    pm_rec = next(r for r in recipients if r.email_address == "pm@example.com")

    assert host_rec.status == DeliveryStatus.DELIVERED
    assert host_rec.recipient_role == "HOST"
    assert host_rec.notify_reference == "ref-dual-1"

    assert pm_rec.status == DeliveryStatus.PERMANENT_FAILURE
    assert pm_rec.recipient_role == "PROPERTY_MANAGER"
    assert pm_rec.failure_type == FailureType.PERMANENT_BOUNCE.value
    assert pm_rec.failure_reason is not None
    assert "pm@example.com" not in pm_rec.failure_reason

    # Verify delivery history row reads from normalized recipients
    row = InteractionService._build_delivery_row(interaction, "APPLICATION")
    assert row is not None
    assert len(row["structuredDetails"]["recipientStatuses"]) == 2


def test_dashboard_has_email_delivery_failure_flag_and_filter(session, setup_parents):
    """Verify Application and Registration expose hasEmailDeliveryFailure and filter by hasEmailFailure."""
    from strr_api.services.interaction import EmailInfo

    application_id = setup_parents["application_id"]
    registration_id = setup_parents["registration_id"]

    app = session.get(Application, application_id)
    app.status = Application.Status.FULL_REVIEW
    reg = session.get(Registration, registration_id)

    # Clear any prior interactions on these fixtures
    session.query(CustomerInteraction).filter(
        (CustomerInteraction.application_id == application_id)
        | (CustomerInteraction.registration_id == registration_id)
    ).delete(synchronize_session=False)
    session.commit()

    assert app.has_email_delivery_failure is False
    assert reg.has_email_delivery_failure is False

    # Create a failed recipient on the application interaction
    InteractionService._save_interaction(
        channel_type=ChannelType.EMAIL,
        payload=EmailInfo(
            application_number=app.application_number,
            email_type="NOC",
            email={"recipients": "bounced@example.com"},
        ),
        status=InteractionStatus.FAILED,
        idempotency_key="app-fail-key-1",
        user_id=setup_parents["user_id"],
        application_id=application_id,
        registration_id=None,
        customer_id=None,
        notify_json={
            "id": "app-fail-ref-1",
            "recipients": "bounced@example.com",
            "notifyStatus": "permanent-failure",
            "failed_recipients": [
                {
                    "email_address": "bounced@example.com",
                    "status_code": 400,
                    "error": "550 User unknown",
                }
            ],
        },
    )

    assert app.has_email_delivery_failure is True
    serialized_app = ApplicationSerializer.to_dict(app)
    assert serialized_app["hasEmailDeliveryFailure"] is True
    assert serialized_app["has_email_delivery_failure"] is True
    assert serialized_app["header"]["hasEmailDeliveryFailure"] is True

    # Test Application.search_applications with has_email_failure=True / False
    found_with_failure = Application.search_applications(
        ApplicationSearch(page=1, limit=10, has_email_failure=True, record_number=app.application_number)
    )
    assert any(item.id == app.id for item in found_with_failure.items)

    found_without_failure = Application.search_applications(
        ApplicationSearch(page=1, limit=10, has_email_failure=False, record_number=app.application_number)
    )
    assert all(item.id != app.id for item in found_without_failure.items)

    # Create a failed recipient on the registration interaction
    InteractionService._save_interaction(
        channel_type=ChannelType.EMAIL,
        payload=EmailInfo(
            registration_number=reg.registration_number,
            email_type="HOST_RENEWAL_REMINDER",
            email={"recipients": "bounced-reg@example.com"},
        ),
        status=InteractionStatus.FAILED,
        idempotency_key="reg-fail-key-1",
        user_id=setup_parents["user_id"],
        application_id=None,
        registration_id=registration_id,
        customer_id=None,
        notify_json={
            "id": "reg-fail-ref-1",
            "recipients": "bounced-reg@example.com",
            "notifyStatus": "BLOCKED",
            "failed_recipients": [
                {
                    "email_address": "bounced-reg@example.com",
                    "status_code": 400,
                    "error": "Suppression list",
                }
            ],
        },
    )

    assert reg.has_email_delivery_failure is True
    from unittest.mock import patch

    with patch.object(RegistrationSerializer, "populate_host_registration_details"):
        serialized_reg = RegistrationSerializer.serialize(reg)
    assert serialized_reg["hasEmailDeliveryFailure"] is True
    assert serialized_reg["has_email_delivery_failure"] is True
    assert serialized_reg["header"]["hasEmailDeliveryFailure"] is True

    # Test Registration.search_registrations with has_email_failure=True / False
    reg_with_failure = Registration.search_registrations(
        RegistrationSearch(page=1, limit=10, has_email_failure=True, record_number=reg.registration_number)
    )
    assert any(item.id == reg.id for item in reg_with_failure.items)

    reg_without_failure = Registration.search_registrations(
        RegistrationSearch(page=1, limit=10, has_email_failure=False, record_number=reg.registration_number)
    )
    assert all(item.id != reg.id for item in reg_without_failure.items)


def test_backfill_interaction_recipients_idempotent(session, setup_parents):
    """Verify backfill_interaction_recipients extracts historical metadata and is idempotent."""
    application_id = setup_parents["application_id"]

    # Create interaction directly without dual-writing recipient rows (simulate historical pre-migration record)
    historical_interaction = CustomerInteraction(
        channel=ChannelType.EMAIL,
        status=InteractionStatus.DELIVERED,
        user_id=setup_parents["user_id"],
        application_id=application_id,
        notify_reference="hist-ref-100",
        meta_data={
            "notify_response": {
                "id": "hist-ref-100",
                "recipients": "historical-host@example.com",
                "notifyStatus": "DELIVERED",
                "requestDate": "2026-10-01T10:00:00+00:00",
                "sentDate": "2026-10-01T10:01:00+00:00",
            },
            "recipient_roles": {
                "historical-host@example.com": "HOST",
            },
        },
    )
    session.add(historical_interaction)
    session.commit()

    # Verify no recipient row exists initially
    initial_recipients = session.query(InteractionRecipient).filter_by(interaction_id=historical_interaction.id).all()
    assert len(initial_recipients) == 0

    # Run 1: Backfill should process and create the recipient row
    stats1 = InteractionService.backfill_interaction_recipients(batch_size=10)
    assert stats1["total_processed"] >= 1
    assert stats1["total_recipients_created"] >= 1
    assert stats1["total_errors"] == 0

    recipients_after = session.query(InteractionRecipient).filter_by(interaction_id=historical_interaction.id).all()
    assert len(recipients_after) == 1
    rec = recipients_after[0]
    assert rec.email_address == "historical-host@example.com"
    assert rec.status == DeliveryStatus.DELIVERED
    assert rec.recipient_role == "HOST"
    assert rec.notify_reference == "hist-ref-100"

    # Run 2: Re-running backfill should be completely idempotent (skip existing rows)
    stats2 = InteractionService.backfill_interaction_recipients(batch_size=10)
    assert stats2["total_recipients_created"] == 0
    assert stats2["total_errors"] == 0
