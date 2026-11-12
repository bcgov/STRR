import sys
from types import ModuleType
from unittest.mock import MagicMock

try:
    import tenacity  # noqa: F401
except ModuleNotFoundError:
    _tenacity = ModuleType("tenacity")
    _tenacity.Retrying = MagicMock()
    _tenacity.retry_if_exception_type = MagicMock()
    _tenacity.stop_after_attempt = MagicMock()
    _tenacity.wait_exponential = MagicMock()
    sys.modules["tenacity"] = _tenacity

from interactions_update.handlers.interaction_status import InteractionStatusHandler
from interactions_update.services.interaction_processor import InteractionProcessor
from strr_api.enums.enum import DeliveryStatus
from strr_api.enums.enum import FailureType
from strr_api.enums.enum import InteractionStatus


def test_interaction_status_handler_maps_gc_and_bc_notify_statuses():
    handler = InteractionStatusHandler()
    assert handler.map_to_interaction_status("delivered") == InteractionStatus.DELIVERED
    assert (
        handler.map_to_interaction_status("permanent-failure")
        == InteractionStatus.FAILED
    )
    assert (
        handler.map_to_interaction_status("temporary-failure")
        == InteractionStatus.FAILED
    )
    assert (
        handler.map_to_interaction_status("technical-failure")
        == InteractionStatus.FAILED
    )
    assert handler.map_to_interaction_status("BLOCKED") == InteractionStatus.FAILED
    assert handler.map_to_interaction_status("sending") is None

    assert (
        handler.map_to_delivery_status("permanent-failure")
        == DeliveryStatus.PERMANENT_FAILURE
    )
    assert handler.map_to_delivery_status("BLOCKED") == DeliveryStatus.BLOCKED

    meta = handler.build_recipient_metadata(
        notify_reference="ref-101",
        data={
            "id": "prov-101",
            "recipients": "bounce@example.com",
            "status_description": "550 5.1.1 No such user bounce@example.com",
        },
        normalized_status="PERMANENT_FAILURE",
    )
    assert meta["delivery_status"] == DeliveryStatus.PERMANENT_FAILURE.value
    assert meta["failure_type"] == FailureType.PERMANENT_BOUNCE.value
    assert "bounce@example.com" not in meta["failure_reason"]


def test_atomic_upsert_recipient_row_executes_single_row_update():
    mock_session = MagicMock()
    mock_result = MagicMock()
    mock_result.rowcount = 1
    mock_session.execute.return_value = mock_result

    updated = InteractionProcessor._atomic_upsert_recipient_row(
        session=mock_session,
        interaction_id=42,
        notify_reference="ref-42",
        recipient_meta={
            "status": "PERMANENT_FAILURE",
            "delivery_status": "PERMANENT_FAILURE",
            "failure_type": "PERMANENT_BOUNCE",
            "failure_reason": "The recipient email address could not be reached.",
            "email_address": "host@example.com",
            "provider_reference": "prov-42",
            "request_date": "2026-11-05T10:00:00Z",
            "sent_date": None,
        },
        raw_payload={"id": "prov-42"},
    )

    assert updated is True
    mock_session.execute.assert_called_once()


def test_merge_primary_notify_metadata_preserves_initial_dispatch_fields():
    processor = InteractionProcessor()
    existing_meta_data = {
        "notify_references": "ref-1,ref-2",
        "notify_response": {
            "id": "ref-1",
            "ids": "ref-1,ref-2",
            "recipients": "good1@gov.bc.ca,good2@gov.bc.ca",
            "failed_recipients": [
                {
                    "email_address": "bad@gov.bc.ca.ca",
                    "status_code": 400,
                    "error": "Invalid email",
                }
            ],
        },
    }
    primary_payload = {
        "id": "ref-1",
        "recipients": "good1@gov.bc.ca",
        "notifyStatus": "delivered",
        "status_description": "Delivered",
        "sentDate": "2026-10-06T12:00:00Z",
    }

    processor._merge_primary_notify_metadata(existing_meta_data, primary_payload)

    notify_response = existing_meta_data["notify_response"]
    assert notify_response["failed_recipients"] == [
        {
            "email_address": "bad@gov.bc.ca.ca",
            "status_code": 400,
            "error": "Invalid email",
        }
    ]
    assert notify_response["ids"] == "ref-1,ref-2"
    assert notify_response["recipients"] == "good1@gov.bc.ca,good2@gov.bc.ca"
    assert notify_response["notifyStatus"] == "delivered"
    assert notify_response["sentDate"] == "2026-10-06T12:00:00Z"


def test_merge_primary_notify_metadata_none_payload():
    processor = InteractionProcessor()
    existing_meta_data = {"notify_response": {"id": "1"}}
    processor._merge_primary_notify_metadata(existing_meta_data, None)
    assert existing_meta_data == {"notify_response": {"id": "1"}}


def test_resolve_new_status_with_failed_mapped_status():
    status = InteractionProcessor._resolve_new_status(
        [InteractionStatus.DELIVERED, InteractionStatus.FAILED],
        reference_count=2,
        has_failed_recipients=False,
    )
    assert status == InteractionStatus.FAILED


def test_resolve_new_status_all_delivered_no_failed_recipients():
    status = InteractionProcessor._resolve_new_status(
        [InteractionStatus.DELIVERED, InteractionStatus.DELIVERED],
        reference_count=2,
        has_failed_recipients=False,
    )
    assert status == InteractionStatus.DELIVERED


def test_resolve_new_status_all_delivered_with_failed_recipients():
    status = InteractionProcessor._resolve_new_status(
        [InteractionStatus.DELIVERED, InteractionStatus.DELIVERED],
        reference_count=2,
        has_failed_recipients=True,
    )
    assert status == InteractionStatus.FAILED


def test_resolve_new_status_in_progress_returns_none_to_continue_polling():
    status = InteractionProcessor._resolve_new_status(
        [InteractionStatus.DELIVERED],
        reference_count=2,
        has_failed_recipients=True,
    )
    assert status is None


def test_strip_volatile_metadata_keys_removes_updated_at():
    data = {
        "notify_delivery": {
            "updated_at": "2026-11-05T12:00:00Z",
            "recipient_statuses": {
                "ref-1": {"status": "DELIVERED", "updated_at": "2026-11-05T12:00:00Z"}
            },
        },
        "updated_at": "2026-11-05T12:00:00Z",
    }
    stripped = InteractionProcessor._strip_volatile_metadata_keys(data)
    assert "updated_at" not in stripped
    assert "updated_at" not in stripped["notify_delivery"]
    assert (
        "updated_at" not in stripped["notify_delivery"]["recipient_statuses"]["ref-1"]
    )
    assert (
        stripped["notify_delivery"]["recipient_statuses"]["ref-1"]["status"]
        == "DELIVERED"
    )


def test_is_metadata_changed_ignores_volatile_updated_at():
    meta1 = {
        "notify_delivery": {
            "updated_at": "2026-11-05T12:00:00.000000+00:00",
            "recipient_statuses": {"ref-1": {"status": "DELIVERED"}},
        }
    }
    meta2 = {
        "notify_delivery": {
            "updated_at": "2026-11-05T12:05:00.123456+00:00",
            "recipient_statuses": {"ref-1": {"status": "DELIVERED"}},
        }
    }
    assert InteractionProcessor.is_metadata_changed(meta1, meta2) is False


def test_is_metadata_changed_detects_real_changes():
    meta1 = {
        "notify_delivery": {
            "updated_at": "2026-11-05T12:00:00Z",
            "recipient_statuses": {"ref-1": {"status": "SENDING"}},
        }
    }
    meta2 = {
        "notify_delivery": {
            "updated_at": "2026-11-05T12:00:00Z",
            "recipient_statuses": {"ref-1": {"status": "DELIVERED"}},
        }
    }
    assert InteractionProcessor.is_metadata_changed(meta1, meta2) is True


def test_apply_interaction_updates_not_dirty_when_only_updated_at_differs():
    mock_interaction = MagicMock()
    mock_interaction.status = InteractionStatus.SENT
    mock_interaction.provider_reference = "prov-1"
    mock_interaction.meta_data = {
        "notify_delivery": {
            "updated_at": "2026-11-05T12:00:00.000000Z",
            "recipient_statuses": {"ref-1": {"status": "SENDING"}},
        }
    }

    new_meta = {
        "notify_delivery": {
            "updated_at": "2026-11-05T12:01:00.999999Z",
            "recipient_statuses": {"ref-1": {"status": "SENDING"}},
        }
    }

    did_change = InteractionProcessor._apply_interaction_updates(
        interaction=mock_interaction,
        new_status=InteractionStatus.SENT,
        provider_reference="prov-1",
        existing_meta_data=new_meta,
    )
    assert did_change is False


def test_resolve_new_status_72_hour_sent_terminal_transition_rule():
    # In-progress email without timeout continues polling (returns None)
    status_active = InteractionProcessor._resolve_new_status(
        [InteractionStatus.DELIVERED],
        reference_count=2,
        has_failed_recipients=False,
        is_timed_out=False,
    )
    assert status_active is None

    # In-progress email with 72h timeout transitions to FAILED
    status_timed_out = InteractionProcessor._resolve_new_status(
        [InteractionStatus.DELIVERED],
        reference_count=2,
        has_failed_recipients=False,
        is_timed_out=True,
    )
    assert status_timed_out == InteractionStatus.FAILED

    # Fully delivered email with timeout still returns DELIVERED
    status_delivered = InteractionProcessor._resolve_new_status(
        [InteractionStatus.DELIVERED, InteractionStatus.DELIVERED],
        reference_count=2,
        has_failed_recipients=False,
        is_timed_out=True,
    )
    assert status_delivered == InteractionStatus.DELIVERED


def test_collect_processable_ids_includes_timed_out_missing_references():
    processor = InteractionProcessor()
    from datetime import datetime
    from datetime import timedelta
    from datetime import timezone

    now = datetime.now(timezone.utc)
    timeout_threshold = now - timedelta(hours=72)

    sent_interactions = [
        MagicMock(
            id="int-1",
            notify_reference="ref-1",
            meta_data={},
            created_at=now,
        ),
        MagicMock(
            id="int-2",
            notify_reference=None,
            meta_data={},
            created_at=now - timedelta(hours=10),  # Not timed out yet, missing ref
        ),
        MagicMock(
            id="int-3",
            notify_reference=None,
            meta_data={},
            created_at=now - timedelta(hours=75),  # Timed out and missing ref
        ),
    ]

    ids, missing = processor._collect_processable_ids(
        sent_interactions, timeout_threshold=timeout_threshold
    )
    assert "int-1" in ids
    assert "int-3" in ids
    assert "int-2" not in ids
    assert missing == 1


def test_collect_processable_ids_skips_stale_interactions_sent_over_a_day_ago():
    processor = InteractionProcessor()
    from datetime import datetime
    from datetime import timedelta
    from datetime import timezone

    now = datetime.now(timezone.utc)
    stale_threshold = now - timedelta(hours=24)
    timeout_threshold = now - timedelta(hours=72)

    sent_interactions = [
        MagicMock(
            id="int-fresh",
            notify_reference="ref-fresh",
            meta_data={},
            created_at=now - timedelta(hours=2),  # Sent 2h ago (< 24h)
        ),
        MagicMock(
            id="int-stale-day",
            notify_reference="ref-stale",
            meta_data={},
            created_at=now - timedelta(hours=26),  # Sent > 24h ago
        ),
        MagicMock(
            id="int-stale-old",
            notify_reference="ref-old",
            meta_data={},
            created_at=now - timedelta(hours=80),  # Sent > 72h ago
        ),
    ]

    ids, missing = processor._collect_processable_ids(
        sent_interactions,
        timeout_threshold=timeout_threshold,
        stale_threshold=stale_threshold,
    )
    # Only int-fresh is processable; emails sent over a day ago are skipped
    assert ids == ["int-fresh"]
    assert missing == 0


def test_process_interaction_skips_stale_records_and_only_logs():
    processor = InteractionProcessor()
    from datetime import datetime
    from datetime import timedelta
    from datetime import timezone

    now = datetime.now(timezone.utc)
    mock_session = MagicMock()
    mock_interaction = MagicMock()
    mock_interaction.id = 99
    mock_interaction.created_at = now - timedelta(hours=25)  # > 24h old (stale)
    mock_session.get.return_value = mock_interaction

    import unittest.mock as mock

    with mock.patch(
        "interactions_update.services.interaction_processor.get_session",
        return_value=iter([mock_session]),
    ), mock.patch.object(processor.notify_api_client, "call") as mock_call:
        result = processor.process_interaction("99", "http://notify", {})

        # Should skip checking status, return None, and NOT call Notify API
        assert result is None
        mock_call.assert_not_called()
        mock_session.commit.assert_not_called()
