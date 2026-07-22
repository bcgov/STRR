"""Tests for InteractionStatusHandler normalize functions."""

from interactions_update.handlers.interaction_status import InteractionStatusHandler


def testnormalize_notify_status_prefers_gc_notify_status():
    """GC Notify delivery outcomes should take precedence over transport-level status."""
    payload = {
        "gc_notify_status": "permanent-failure",
        "notifyStatus": "SENT",
        "status": "SENT",
    }

    assert (
        InteractionStatusHandler.normalize_notify_status(payload) == "PERMANENT_FAILURE"
    )


def testnormalize_notify_status_falls_back_to_notify_status():
    """Maintain compatibility with older payloads that only expose notifyStatus."""
    payload = {"notifyStatus": "DELIVERED"}

    assert InteractionStatusHandler.normalize_notify_status(payload) == "DELIVERED"
