"""Interaction status handler module."""

import logging

from strr_api.enums.enum import InteractionStatus

logger = logging.getLogger(__name__)


class InteractionStatusHandler:
    """Handles interaction status normalization and mapping.

    Normalizes delivery statuses from various API responses and maps them
    to standardized InteractionStatus values for consistent state management.
    """

    # Status constants for categorization
    FAILURE_STATUSES = {
        "FAILURE",
        "FAILED",
        "PERMANENT_FAILURE",
        "TEMPORARY_FAILURE",
        "TECHNICAL_FAILURE",
        "VIRUS_SCAN_FAILED",
    }

    DELIVERED_STATUSES = {"DELIVERED", "SENT"}

    @classmethod
    def normalize_notify_status(cls, data: dict) -> str | None:
        """Normalize status across notify-api and GC Notify response shapes.

        Prioritizes gc_notify_status over notifyStatus for GCP Cloud Notify
        outcomes when available.

        Args:
            data: Response data dictionary from Notify API

        Returns:
            str: Normalized status (uppercase, hyphen to underscore) or None
        """
        raw_status = data.get("gc_notify_status") or data.get("notifyStatus")
        if raw_status is None:
            return None
        return str(raw_status).strip().upper().replace("-", "_")

    @classmethod
    def normalize_transport_status(cls, data: dict) -> str | None:
        """Normalize the transport-level status field returned by notify-api.

        Args:
            data: Response data dictionary from Notify API

        Returns:
            str: Normalized transport status or None
        """
        raw_status = data.get("notifyStatus")
        if raw_status is None:
            return None
        return str(raw_status).strip().upper().replace("-", "_")

    @classmethod
    def normalize_gc_notify_status(cls, data: dict) -> str | None:
        """Normalize the downstream GC Notify delivery status when available.

        Args:
            data: Response data dictionary from Notify API

        Returns:
            str: Normalized GC Notify status or None
        """
        raw_status = data.get("gc_notify_status")
        if raw_status is None:
            return None
        return str(raw_status).strip().upper().replace("-", "_")

    @classmethod
    def map_to_interaction_status(cls, normalized_status: str | None) -> InteractionStatus | None:
        """Map Notify status values to interaction terminal statuses.

        Args:
            normalized_status: Normalized status string

        Returns:
            InteractionStatus: DELIVERED, FAILED, or None for unknown status
        """
        if normalized_status in cls.DELIVERED_STATUSES:
            return InteractionStatus.DELIVERED
        if normalized_status in cls.FAILURE_STATUSES:
            return InteractionStatus.FAILED
        return None

    @classmethod
    def build_recipient_metadata(
        cls, notify_reference: str, data: dict, normalized_status: str | None
    ) -> dict:
        """Build per-recipient delivery metadata for reporting and audit.

        Args:
            notify_reference: Notify reference ID
            data: Response data from Notify API
            normalized_status: Normalized status from API response

        Returns:
            dict: Metadata dictionary with delivery details
        """
        status_description = data.get("status_description")
        provider_response = data.get("provider_response")
        failure_type = normalized_status if normalized_status in cls.FAILURE_STATUSES else None

        return {
            "notify_reference": notify_reference,
            "provider_reference": (
                str(data.get("id")) if data.get("id") is not None else None
            ),
            "status": normalized_status,
            "failure_type": failure_type,
            "failure_reason": provider_response or status_description,
            "email_address": data.get("recipients"),
            "sent_date": data.get("sentDate"),
            "request_date": data.get("requestDate"),
        }
