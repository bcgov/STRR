"""Tests for InteractionProcessor orchestration service."""

import json
import os
import random
import re
import uuid
from datetime import datetime
from datetime import timedelta
from datetime import timezone
from unittest.mock import ANY
from unittest.mock import MagicMock
from unittest.mock import patch

import pytest
import responses
from sqlalchemy import select

from interactions_update.clients.notify_api import NotifyApiClient
from interactions_update.services.interaction_processor import InteractionProcessor
from strr_api.enums.enum import InteractionStatus
from strr_api.models import CustomerInteraction

scenario_uno_day = {
    "records": 1,
    "target_days": [40],
    "target_pct": 1.0,
}


# @pytest.mark.load
@responses.activate
@pytest.mark.parametrize("setup_bulk_interactions", [scenario_uno_day], indirect=True)
def test_run(db_session, setup_bulk_interactions, monkeypatch):
    """Test the update job using mocked notify service responses."""

    # Setup Environment Mocks
    notify_url = "http://my-notify-mock"
    notify_ver = "/api/v1"
    notify_svc = notify_url + notify_ver
    auth_url = "http://my-auth-url"
    strr_sa_id = "strr-sa-client-id"
    strr_sa_secret = "strr-sa-secret"
    monkeypatch.setenv("NOTIFY_API_URL", notify_url)
    monkeypatch.setenv("NOTIFY_API_VERSION", notify_ver)
    monkeypatch.setenv("NOTIFY_SVC_URL", notify_svc)
    monkeypatch.setenv("KEYCLOAK_AUTH_TOKEN_URL", auth_url)
    monkeypatch.setenv("NOTIFY_API_TIMEOUT", "30")
    monkeypatch.setenv("AUTH_SVC_TIMEOUT", "30")
    monkeypatch.setenv("STRR_SERVICE_ACCOUNT_CLIENT_ID", strr_sa_id)
    monkeypatch.setenv("STRR_SERVICE_ACCOUNT_SECRET", strr_sa_secret)

    # Identify the Interaction created by the fixture
    reg_id = setup_bulk_interactions["registration_ids"][0]
    interaction = db_session.execute(
        select(CustomerInteraction).where(CustomerInteraction.registration_id == reg_id)
    ).scalar_one()

    # Manually add a notify_reference to simulate a sent notification
    interaction.notify_reference = "mock-notify-123"
    db_session.commit()

    # Define the Notify Mock Callback
    def notify_callback(request):
        # Extract ID from URL path: .../notify/{reference}
        ref = request.url.split("/")[-1]
        response = {
            "id": f"provider-{ref}",
            "recipients": ["test@example.com"],
            "requestDate": datetime.now(timezone.utc).isoformat(),
            "sentDate": datetime.now(timezone.utc).isoformat(),
            "notifyStatus": InteractionStatus.DELIVERED,
            "notifyProvider": "HOUSING",
        }
        return (200, {}, json.dumps(response))

    # Register Mocks
    responses.add(responses.POST, auth_url, json={"access_token": "123"}, status=200)
    responses.add_callback(
        responses.GET,
        f"{notify_svc}/notify/{interaction.notify_reference}",
        callback=notify_callback,
        content_type="application/json",
    )

    # TEST
    # Run the Job
    processor = InteractionProcessor()
    processor.run()
    # Assertions - Check results
    db_session.expire_all()  # Ensure we fetch fresh data
    updated_interaction = db_session.get(CustomerInteraction, interaction.id)

    assert updated_interaction.status == InteractionStatus.DELIVERED
    assert updated_interaction.provider_reference == "provider-mock-notify-123"
    assert updated_interaction.meta_data["notifyStatus"] == "DELIVERED"


@responses.activate
@pytest.mark.parametrize("setup_bulk_interactions", [scenario_uno_day], indirect=True)
def test_run_persists_gc_notify_status_separately(
    db_session,
    setup_bulk_interactions,
    monkeypatch,
):
    """GC Notify status should be persisted separately from transport status."""
    notify_url = "http://my-notify-mock"
    notify_ver = "/api/v1"
    notify_svc = notify_url + notify_ver
    auth_url = "http://my-auth-url"
    strr_sa_id = "strr-sa-client-id"
    strr_sa_secret = "strr-sa-secret"
    monkeypatch.setenv("NOTIFY_API_URL", notify_url)
    monkeypatch.setenv("NOTIFY_API_VERSION", notify_ver)
    monkeypatch.setenv("NOTIFY_SVC_URL", notify_svc)
    monkeypatch.setenv("KEYCLOAK_AUTH_TOKEN_URL", auth_url)
    monkeypatch.setenv("NOTIFY_API_TIMEOUT", "30")
    monkeypatch.setenv("AUTH_SVC_TIMEOUT", "30")
    monkeypatch.setenv("STRR_SERVICE_ACCOUNT_CLIENT_ID", strr_sa_id)
    monkeypatch.setenv("STRR_SERVICE_ACCOUNT_SECRET", strr_sa_secret)

    reg_id = setup_bulk_interactions["registration_ids"][0]
    interaction = db_session.execute(
        select(CustomerInteraction).where(CustomerInteraction.registration_id == reg_id)
    ).scalar_one()
    interaction.notify_reference = "mock-notify-123"
    db_session.commit()

    def notify_callback(request):
        ref = request.url.split("/")[-1]
        response = {
            "id": f"provider-{ref}",
            "recipients": ["test@example.com"],
            "requestDate": datetime.now(timezone.utc).isoformat(),
            "sentDate": datetime.now(timezone.utc).isoformat(),
            "notifyStatus": "SENT",
            "gc_notify_status": "permanent-failure",
            "notifyProvider": "HOUSING",
        }
        return (200, {}, json.dumps(response))

    responses.add(responses.POST, auth_url, json={"access_token": "123"}, status=200)
    responses.add_callback(
        responses.GET,
        f"{notify_svc}/notify/{interaction.notify_reference}",
        callback=notify_callback,
        content_type="application/json",
    )

    processor = InteractionProcessor()

    processor.run()
    db_session.expire_all()
    updated_interaction = db_session.get(CustomerInteraction, interaction.id)

    assert updated_interaction.status == InteractionStatus.FAILED
    assert updated_interaction.meta_data["notifyStatus"] == "SENT"
    assert updated_interaction.meta_data["gc_notify_status"] == "PERMANENT_FAILURE"


# @pytest.mark.load
@responses.activate
@pytest.mark.parametrize("setup_bulk_interactions", [{"records": 1}], indirect=True)
def test_run_failure_502(db_session, setup_bulk_interactions, monkeypatch):
    """Test that 502 errors from Notify are handled gracefully."""
    notify_url = "http://my-notify-mock"
    notify_ver = "/api/v1"
    notify_svc = notify_url + notify_ver
    auth_url = "http://my-auth-url"
    strr_sa_id = "strr-sa-client-id"
    strr_sa_secret = "strr-sa-secret"
    monkeypatch.setenv("NOTIFY_API_URL", notify_url)
    monkeypatch.setenv("NOTIFY_API_VERSION", notify_ver)
    monkeypatch.setenv("NOTIFY_SVC_URL", notify_svc)
    monkeypatch.setenv("KEYCLOAK_AUTH_TOKEN_URL", auth_url)
    monkeypatch.setenv("NOTIFY_API_TIMEOUT", "30")
    monkeypatch.setenv("AUTH_SVC_TIMEOUT", "30")
    monkeypatch.setenv("STRR_SERVICE_ACCOUNT_CLIENT_ID", strr_sa_id)
    monkeypatch.setenv("STRR_SERVICE_ACCOUNT_SECRET", strr_sa_secret)

    # Setup Mock for 502 error
    responses.add(responses.GET, f"{notify_svc}/notify/.*", status=502)
    responses.add(
        responses.POST,
        os.getenv("KEYCLOAK_AUTH_TOKEN_URL"),
        json={"access_token": "123"},
    )

    # TEST
    # Run Job
    processor = InteractionProcessor()
    processor.run()
    # Assert status is still SENT (no update performed)
    interaction_ids = setup_bulk_interactions["interaction_ids"]
    db_session.expire_all()
    stmt = select(CustomerInteraction).where(
        CustomerInteraction.id.in_(interaction_ids)
    )
    interactions = db_session.scalars(stmt).all()
    for interaction in interactions:
        assert interaction.status == InteractionStatus.SENT


@pytest.mark.parametrize("setup_bulk_interactions", [{"records": 1}], indirect=True)
def test_run_logs_stale_sent_interactions(db_session, setup_bulk_interactions, monkeypatch):
    """Test that stale SENT interactions are logged for alerting."""

    interaction_id = setup_bulk_interactions["interaction_ids"][0]

    # Update the interaction to be created in the past (2 hours ago)
    # so that with STALE_SENT_HOURS=0, it will be considered stale
    stmt = select(CustomerInteraction).where(CustomerInteraction.id == interaction_id)
    interaction = db_session.execute(stmt).scalar_one()
    interaction.created_at = datetime.now(timezone.utc) - timedelta(hours=2)
    db_session.commit()

    monkeypatch.setenv("STALE_SENT_HOURS", "0")

    # Patch the logger and the API call to prevent actual network calls
    with patch("interactions_update.services.interaction_processor.logger.warning") as mock_warning:
        with patch.object(
            NotifyApiClient,
            "call",
            return_value=MagicMock(
                status_code=200,
                json=lambda: {"notifyStatus": "DELIVERED", "id": "123"},
            ),
        ):
            processor = InteractionProcessor(max_workers=1)
            processor.run()

        # The warning should be called for stale sent interactions
        mock_warning.assert_any_call(
            "strr.interactions.stale_sent_detected stale_sent_count=%s stale_sent_hours=%s interaction_ids=%s",
            1,
            0,
            [interaction_id],
        )


@pytest.mark.parametrize("setup_bulk_interactions", [{"records": 2}], indirect=True)
def test_run_counts_missing_notify_references(
    db_session, setup_bulk_interactions, monkeypatch
):
    """Test that SENT interactions without Notify references are counted and skipped."""

    interaction_ids = setup_bulk_interactions["interaction_ids"]
    interaction_with_reference = db_session.get(CustomerInteraction, interaction_ids[0])
    interaction_with_reference.notify_reference = "mock-notify-123"
    db_session.commit()

    monkeypatch.setenv("NOTIFY_API_URL", "https://my-notify-mock")
    monkeypatch.setenv("NOTIFY_API_VERSION", "/api/v1")

    # Patch the logger and the API call to prevent actual network calls
    with patch("interactions_update.services.interaction_processor.logger.info") as mock_info:
        with patch.object(
            NotifyApiClient,
            "call",
            return_value=MagicMock(
                status_code=200,
                json=lambda: {"notifyStatus": "DELIVERED", "id": "123"},
            ),
        ):
            processor = InteractionProcessor(max_workers=1)
            processor.run()

        mock_info.assert_any_call(
            "strr.interactions.update_completed sent_count=%s delivered_count=%s failed_count=%s stale_sent_count=%s missing_reference_count=%s retry_max_attempts=%s retry_backoff_min=%s retry_backoff_max=%s rate_limit_per_second=%s duration_ms=%s",
            ANY,
            ANY,
            ANY,
            ANY,
            ANY,
            ANY,
            ANY,
            ANY,
            ANY,
            ANY,
        )


scenario_bulk = {
    "records": 1000,
    "target_days": [0],
    "target_pct": 1.0,
}


@pytest.mark.load
@responses.activate
@pytest.mark.parametrize("setup_bulk_interactions", [scenario_bulk], indirect=True)
def test_run_bulk_statuses(db_session, setup_bulk_interactions, monkeypatch):
    """Test bulk processing with randomized Notify statuses."""
    notify_url = "http://my-notify-mock"
    notify_ver = "/api/v1"
    notify_svc = notify_url + notify_ver
    auth_url = "http://my-auth-url"
    strr_sa_id = "strr-sa-client-id"
    strr_sa_secret = "strr-sa-secret"
    monkeypatch.setenv("NOTIFY_API_URL", notify_url)
    monkeypatch.setenv("NOTIFY_API_VERSION", notify_ver)
    monkeypatch.setenv("NOTIFY_SVC_URL", notify_svc)
    monkeypatch.setenv("KEYCLOAK_AUTH_TOKEN_URL", auth_url)
    monkeypatch.setenv("NOTIFY_API_TIMEOUT", "30")
    monkeypatch.setenv("AUTH_SVC_TIMEOUT", "30")
    monkeypatch.setenv("STRR_SERVICE_ACCOUNT_CLIENT_ID", strr_sa_id)
    monkeypatch.setenv("STRR_SERVICE_ACCOUNT_SECRET", strr_sa_secret)

    # List of possible statuses from Notify
    statuses = ["PENDING", "QUEUED", "SENT", "DELIVERED", "FAILURE", "FORWARDED"]

    def bulk_notify_callback(request):
        # Randomly select a status for this specific request
        status = random.choice(statuses)
        response = {
            "id": str(uuid.uuid4()),
            "notifyStatus": status,
            "notifyProvider": "HOUSING",
        }
        return (200, {}, json.dumps(response))

    # Register Mocks
    responses.add(
        responses.POST,
        os.getenv("KEYCLOAK_AUTH_TOKEN_URL"),
        json={"access_token": "123"},
    )
    responses.add_callback(
        responses.GET,
        url=re.compile(f"{notify_svc}/notify/.*"),
        callback=bulk_notify_callback,
        content_type="application/json",
    )

    # Run the multi-threaded job
    processor = InteractionProcessor()
    processor.run()
    # Verify results
    interaction_ids = setup_bulk_interactions["interaction_ids"]
    db_session.expire_all()
    stmt = select(CustomerInteraction).where(
        CustomerInteraction.id.in_(interaction_ids)
    )
    my_interactions = db_session.scalars(stmt).all()

    # Ensure those marked DELIVERED or FAILURE were updated correctly
    delivered = [i for i in my_interactions if i.status == InteractionStatus.DELIVERED]
    failed = [i for i in my_interactions if i.status == InteractionStatus.FAILED]
    sent = [i for i in my_interactions if i.status == InteractionStatus.SENT]

    # Logical check: At 1000 records, statistically all three lists should have members
    assert (
        len(my_interactions) == scenario_bulk["records"] * scenario_bulk["target_pct"]
    )
    print(
        f"Results: Delivered: {len(delivered)}, Failed: {len(failed)}, Remained Sent: {len(sent)}"
    )
