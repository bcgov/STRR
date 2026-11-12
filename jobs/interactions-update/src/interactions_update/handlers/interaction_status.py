"""Interaction status handler module."""

import logging

from strr_api.enums.enum import DeliveryStatus
from strr_api.enums.enum import InteractionStatus
from strr_api.services.delivery_status_adapter import DeliveryStatusAdapter

logger = logging.getLogger(__name__)


class InteractionStatusHandler:
    """Handles interaction status normalization and mapping.

    Normalizes delivery statuses from GC Notify and BC Notify API responses and maps them
    to standardized DeliveryStatus and InteractionStatus values for consistent state management.
    """

    # Status constants for categorization
    FAILURE_STATUSES = {
        "FAILURE",
        "FAILED",
        "PERMANENT_FAILURE",
        "TEMPORARY_FAILURE",
        "TECHNICAL_FAILURE",
        "VIRUS_SCAN_FAILED",
        "BLOCKED",
        "QUARANTINED",
        "PARTIALLY_COMPLETED",
        "CANCELLED",
        "CANCELED",
    }

    DELIVERED_STATUS = "DELIVERED"
    DELIVERED_STATUSES = {"DELIVERED", "COMPLETED"}

    @classmethod
    def normalize_notify_status(cls, data: dict) -> str | None:
        """Normalize status across GC Notify and BC Notify vendor response parameters.

        Checks gc_notify_status for GC Notify and notify_status for BC Notify,
        which are the parameters vended by the wrapper service.

        Args:
            data: Response data dictionary from Notify API

        Returns:
            str: Normalized status (uppercase, hyphen to underscore) or None
        """
        raw_status = data.get("gc_notify_status") or data.get("notify_status")
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
        raw_status = data.get("notify_status") or data.get("notifyStatus")
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
    def map_to_delivery_status(
        cls, normalized_status: str | None, data: dict | None = None
    ) -> DeliveryStatus:
        """Map Notify status values to canonical DeliveryStatus via DeliveryStatusAdapter."""
        error_detail = None
        if isinstance(data, dict):
            error_detail = data.get("provider_response") or data.get(
                "status_description"
            )
        return DeliveryStatusAdapter.map_provider_status(
            normalized_status, error_detail=error_detail
        )

    @classmethod
    def map_to_interaction_status(
        cls, normalized_status: str | None
    ) -> InteractionStatus | None:
        """Map Notify status values to interaction terminal statuses.

        Args:
            normalized_status: Normalized status string

        Returns:
            InteractionStatus: DELIVERED, FAILED, or None for in-flight/unknown status
        """
        if not normalized_status:
            return None
        norm = str(normalized_status).strip().upper().replace("-", "_")
        if norm in cls.DELIVERED_STATUSES:
            return InteractionStatus.DELIVERED
        if norm in cls.FAILURE_STATUSES:
            return InteractionStatus.FAILED
        return None

    @classmethod
    def build_recipient_metadata(
        cls, notify_reference: str, data: dict, normalized_status: str | None
    ) -> dict:
        """Build per-recipient delivery metadata for reporting, atomic updates, and audit.

        Args:
            notify_reference: Notify reference ID
            data: Response data from Notify API
            normalized_status: Normalized status from API response

        Returns:
            dict: Metadata dictionary with delivery details
        """
        status_description = data.get("status_description")
        provider_response = data.get("provider_response")
        raw_reason = provider_response or status_description
        delivery_status = cls.map_to_delivery_status(normalized_status, data)

        failure_type = None
        failure_reason = raw_reason
        if DeliveryStatusAdapter.is_failure_status(delivery_status) or (
            normalized_status and normalized_status in cls.FAILURE_STATUSES
        ):
            classified_type, sanitized_reason = DeliveryStatusAdapter.classify_failure(
                normalized_status, error_detail=raw_reason
            )
            failure_type = (
                classified_type.value if classified_type else normalized_status
            )
            failure_reason = sanitized_reason or raw_reason

        return {
            "notify_reference": notify_reference,
            "provider_reference": (
                str(data.get("id")) if data.get("id") is not None else None
            ),
            "status": normalized_status,
            "delivery_status": delivery_status.value,
            "failure_type": failure_type,
            "failure_reason": failure_reason,
            "email_address": data.get("recipients"),
            "sent_date": data.get("sentDate"),
            "request_date": data.get("requestDate"),
        }
