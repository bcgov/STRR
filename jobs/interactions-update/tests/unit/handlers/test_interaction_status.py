"""Unit tests for InteractionStatusHandler."""

from interactions_update.handlers.interaction_status import DeliveryStatus
from interactions_update.handlers.interaction_status import InteractionStatus
from interactions_update.handlers.interaction_status import InteractionStatusHandler


def test_normalize_notify_status_prefers_gc_notify_status():
    assert (
        InteractionStatusHandler.normalize_notify_status(
            {"gc_notify_status": "permanent-failure", "notify_status": "delivered"}
        )
        == "PERMANENT_FAILURE"
    )
    assert (
        InteractionStatusHandler.normalize_notify_status({"notify_status": "sending"})
        == "SENDING"
    )
    assert InteractionStatusHandler.normalize_notify_status({}) is None


def test_normalize_transport_and_gc_notify_status():
    assert (
        InteractionStatusHandler.normalize_transport_status({"notifyStatus": "queued"})
        == "QUEUED"
    )
    assert InteractionStatusHandler.normalize_transport_status({}) is None
    assert (
        InteractionStatusHandler.normalize_gc_notify_status(
            {"gc_notify_status": "temporary-failure"}
        )
        == "TEMPORARY_FAILURE"
    )
    assert InteractionStatusHandler.normalize_gc_notify_status({}) is None


def test_map_to_delivery_and_interaction_status():
    assert (
        InteractionStatusHandler.map_to_delivery_status("DELIVERED")
        == DeliveryStatus.DELIVERED
    )
    assert (
        InteractionStatusHandler.map_to_delivery_status(
            "PERMANENT_FAILURE", {"provider_response": "550 unknown"}
        )
        == DeliveryStatus.PERMANENT_FAILURE
    )
    assert (
        InteractionStatusHandler.map_to_interaction_status("DELIVERED")
        == InteractionStatus.DELIVERED
    )
    assert (
        InteractionStatusHandler.map_to_interaction_status("permanent-failure")
        == InteractionStatus.FAILED
    )
    assert InteractionStatusHandler.map_to_interaction_status("SENDING") is None
    assert InteractionStatusHandler.map_to_interaction_status(None) is None


def test_build_recipient_metadata_sanitizes_failure_reason():
    meta = InteractionStatusHandler.build_recipient_metadata(
        "ref-1",
        {
            "id": 99,
            "provider_response": "Invalid recipient: user@example.com",
            "recipients": "user@example.com",
            "sentDate": "2026-11-17T00:00:00Z",
            "requestDate": "2026-11-17T00:00:00Z",
        },
        "PERMANENT_FAILURE",
    )
    assert meta["delivery_status"] == DeliveryStatus.PERMANENT_FAILURE.value
    assert meta["failure_type"] == "PERMANENT_BOUNCE"
    assert "[REDACTED_EMAIL]" in meta["failure_reason"]
    assert "user@example.com" not in meta["failure_reason"]
    assert meta["provider_reference"] == "99"


def test_build_recipient_metadata_for_delivered():
    meta = InteractionStatusHandler.build_recipient_metadata(
        "ref-2",
        {"recipients": "host@example.com"},
        "DELIVERED",
    )
    assert meta["delivery_status"] == DeliveryStatus.DELIVERED.value
    assert meta["failure_type"] is None
    assert meta["failure_reason"] is None
