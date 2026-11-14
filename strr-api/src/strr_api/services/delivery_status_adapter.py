# Copyright © 2026 Province of British Columbia
#
# Licensed under the BSD 3 Clause License, (the "License");
# you may not use this file except in compliance with the License.
# The template for the license can be found here
#    https://opensource.org/license/bsd-3-clause/
"""Canonical provider abstraction for GC Notify and BC Notify delivery statuses."""

from __future__ import annotations

import re
from typing import Any

from strr_api.enums.enum import DeliveryStatus, FailureType, InteractionStatus

FAILURE_DELIVERY_STATUS_SET = frozenset(
    {
        DeliveryStatus.PERMANENT_FAILURE,
        DeliveryStatus.TEMPORARY_FAILURE,
        DeliveryStatus.TECHNICAL_FAILURE,
        DeliveryStatus.BLOCKED,
    }
)


class DeliveryStatusAdapter:
    """Adapter that maps GC Notify and BC Notify statuses and errors into STRR canonical types."""

    # Canonical DeliveryStatus mapping for GC Notify (Canada.ca) and BC Notify (Gov.bc.ca)
    _STATUS_MAP: dict[str, DeliveryStatus] = {
        # GC Notify statuses
        "created": DeliveryStatus.PENDING,
        "pending": DeliveryStatus.PENDING,
        "pending-virus-check": DeliveryStatus.PENDING,
        "pending_virus_check": DeliveryStatus.PENDING,
        "sending": DeliveryStatus.SENDING,
        "in-transit": DeliveryStatus.SENDING,
        "in_transit": DeliveryStatus.SENDING,
        "sent": DeliveryStatus.SENDING,
        "delivered": DeliveryStatus.DELIVERED,
        "permanent-failure": DeliveryStatus.PERMANENT_FAILURE,
        "permanent_failure": DeliveryStatus.PERMANENT_FAILURE,
        "temporary-failure": DeliveryStatus.TEMPORARY_FAILURE,
        "temporary_failure": DeliveryStatus.TEMPORARY_FAILURE,
        "technical-failure": DeliveryStatus.TECHNICAL_FAILURE,
        "technical_failure": DeliveryStatus.TECHNICAL_FAILURE,
        "virus-scan-failed": DeliveryStatus.BLOCKED,
        "virus_scan_failed": DeliveryStatus.BLOCKED,
        # BC Notify statuses
        "queued": DeliveryStatus.QUEUED,
        "processing": DeliveryStatus.SENDING,
        "completed": DeliveryStatus.DELIVERED,
        "partially_completed": DeliveryStatus.TEMPORARY_FAILURE,
        "partially-completed": DeliveryStatus.TEMPORARY_FAILURE,
        "failed": DeliveryStatus.PERMANENT_FAILURE,
        "failure": DeliveryStatus.PERMANENT_FAILURE,
        "quarantined": DeliveryStatus.BLOCKED,
        "blocked": DeliveryStatus.BLOCKED,
        "suppressed": DeliveryStatus.BLOCKED,
        "cancelled": DeliveryStatus.TECHNICAL_FAILURE,
        "canceled": DeliveryStatus.TECHNICAL_FAILURE,
    }

    # Filing-history display status mapping (preserves backward compatibility for timeline UI)
    _FILING_HISTORY_STATUS_MAP: dict[str, str] = {
        "created": "CREATED",
        "sending": "IN_TRANSIT",
        "in-transit": "IN_TRANSIT",
        "in_transit": "IN_TRANSIT",
        "processing": "IN_TRANSIT",
        "pending": "PENDING",
        "pending-virus-check": "PENDING",
        "pending_virus_check": "PENDING",
        "queued": "PENDING",
        "delivered": "DELIVERED",
        "completed": "DELIVERED",
        "sent": "SENT",
        "permanent-failure": "FAILED",
        "permanent_failure": "FAILED",
        "temporary-failure": "FAILED",
        "temporary_failure": "FAILED",
        "technical-failure": "FAILED",
        "technical_failure": "FAILED",
        "virus-scan-failed": "FAILED",
        "virus_scan_failed": "FAILED",
        "failed": "FAILED",
        "failure": "FAILED",
        "quarantined": "FAILED",
        "blocked": "FAILED",
        "partially_completed": "FAILED",
        "partially-completed": "FAILED",
        "cancelled": "FAILED",
        "canceled": "FAILED",
    }

    _DEFAULT_FAILURE_REASONS: dict[FailureType, str] = {
        FailureType.PERMANENT_BOUNCE: "Invalid or non-existent email address",
        FailureType.MAILBOX_FULL: "Recipient mailbox is full or temporarily unavailable",
        FailureType.GATEWAY_ERROR: "Email gateway or technical delivery error",
        FailureType.SUPPRESSION_LIST: "Email address is blocked or on the suppression list",
    }

    @classmethod
    def normalize_status_token(cls, raw_status: Any) -> str:
        """Normalize a raw provider status string or enum to a lowercase lookup key."""
        if isinstance(raw_status, DeliveryStatus):
            return raw_status.value.lower()
        if not isinstance(raw_status, str):
            return ""
        return raw_status.strip().lower()

    @classmethod
    def _status_from_http_code(cls, status_code: int | None) -> DeliveryStatus:
        if status_code is not None:
            if status_code >= 500:
                return DeliveryStatus.TECHNICAL_FAILURE
            if status_code >= 400:
                return DeliveryStatus.PERMANENT_FAILURE
        return DeliveryStatus.PENDING

    @classmethod
    def _refine_failed_status(
        cls,
        raw_status: Any,
        error_detail: Any,
        status_code: int | None,
        default_status: DeliveryStatus,
    ) -> DeliveryStatus:
        failure_type, _ = cls.classify_failure(raw_status, error_detail=error_detail, status_code=status_code)
        _REFINEMENTS = {
            FailureType.MAILBOX_FULL: DeliveryStatus.TEMPORARY_FAILURE,
            FailureType.GATEWAY_ERROR: DeliveryStatus.TECHNICAL_FAILURE,
            FailureType.SUPPRESSION_LIST: DeliveryStatus.BLOCKED,
        }
        return _REFINEMENTS.get(failure_type, default_status)

    @classmethod
    def map_provider_status(
        cls,
        raw_status: Any,
        error_detail: Any = None,
        status_code: int | None = None,
    ) -> DeliveryStatus:
        """Map an upstream GC Notify or BC Notify status to a canonical DeliveryStatus."""
        if isinstance(raw_status, DeliveryStatus):
            return raw_status

        normalized = cls.normalize_status_token(raw_status)
        if not normalized:
            return cls._status_from_http_code(status_code)

        # Check direct DeliveryStatus enum match first
        upper_val = normalized.upper().replace("-", "_")
        if upper_val in DeliveryStatus.__members__:
            return DeliveryStatus[upper_val]

        mapped = cls._STATUS_MAP.get(normalized)
        if mapped is not None:
            if normalized in ("failed", "failure") and (error_detail is not None or status_code is not None):
                return cls._refine_failed_status(raw_status, error_detail, status_code, mapped)
            return mapped

        return DeliveryStatus.PENDING

    @classmethod
    def map_to_interaction_status(cls, raw_or_delivery_status: Any) -> InteractionStatus | None:
        """Map a provider or canonical DeliveryStatus to the parent InteractionStatus enum."""
        if isinstance(raw_or_delivery_status, InteractionStatus):
            return raw_or_delivery_status

        normalized = cls.normalize_status_token(raw_or_delivery_status)
        if not normalized:
            return None

        if normalized == "queued":
            return InteractionStatus.QUEUED
        if normalized in (
            "sent",
            "sending",
            "in-transit",
            "in_transit",
            "processing",
            "created",
            "pending",
            "pending-virus-check",
            "pending_virus_check",
        ):
            return InteractionStatus.SENT
        if normalized in ("delivered", "completed"):
            return InteractionStatus.DELIVERED
        if normalized in (
            "permanent-failure",
            "permanent_failure",
            "temporary-failure",
            "temporary_failure",
            "technical-failure",
            "technical_failure",
            "virus-scan-failed",
            "virus_scan_failed",
            "failed",
            "failure",
            "quarantined",
            "blocked",
            "partially_completed",
            "partially-completed",
            "cancelled",
            "canceled",
        ):
            return InteractionStatus.FAILED

        delivery_status = cls.map_provider_status(raw_or_delivery_status)
        if delivery_status == DeliveryStatus.QUEUED:
            return InteractionStatus.QUEUED
        if delivery_status in (DeliveryStatus.PENDING, DeliveryStatus.SENDING):
            return InteractionStatus.SENT
        if delivery_status == DeliveryStatus.DELIVERED:
            return InteractionStatus.DELIVERED
        if delivery_status in FAILURE_DELIVERY_STATUS_SET:
            return InteractionStatus.FAILED
        return None

    _CANONICAL_DELIVERY_UI_MAP = {
        DeliveryStatus.DELIVERED: "DELIVERED",
        DeliveryStatus.SENDING: "SENT",
        DeliveryStatus.PENDING: "PENDING",
        DeliveryStatus.QUEUED: "PENDING",
        DeliveryStatus.PERMANENT_FAILURE: "FAILED",
        DeliveryStatus.TEMPORARY_FAILURE: "FAILED",
        DeliveryStatus.TECHNICAL_FAILURE: "FAILED",
        DeliveryStatus.BLOCKED: "FAILED",
    }

    _UPPER_FALLBACK_UI_MAP = {
        "QUEUED": "PENDING",
        "SENDING": "SENT",
        "PERMANENT_FAILURE": "FAILED",
        "TEMPORARY_FAILURE": "FAILED",
        "TECHNICAL_FAILURE": "FAILED",
        "BLOCKED": "FAILED",
        "CREATED": "CREATED",
        "IN_TRANSIT": "IN_TRANSIT",
        "PENDING": "PENDING",
        "SENT": "SENT",
        "DELIVERED": "DELIVERED",
        "FAILED": "FAILED",
    }

    @classmethod
    def map_to_filing_history_status(cls, raw_status: Any, provider_status: Any = None) -> str:
        """Map a canonical or provider status to the filing history UI status string."""
        # If provider_status is given (e.g. 'sent' vs 'sending' vs 'created'), check it first for fine-grained UI label
        if isinstance(provider_status, str) and provider_status.strip():
            prov_norm = provider_status.strip().lower()
            if prov_norm in cls._FILING_HISTORY_STATUS_MAP:
                return cls._FILING_HISTORY_STATUS_MAP[prov_norm]

        if isinstance(raw_status, DeliveryStatus):
            return cls._CANONICAL_DELIVERY_UI_MAP.get(
                raw_status, "FAILED" if raw_status in FAILURE_DELIVERY_STATUS_SET else "UNKNOWN"
            )

        normalized = cls.normalize_status_token(raw_status)
        if not normalized:
            return "UNKNOWN"
        if normalized in cls._FILING_HISTORY_STATUS_MAP:
            return cls._FILING_HISTORY_STATUS_MAP[normalized]

        upper_val = normalized.upper().replace("-", "_")
        return cls._UPPER_FALLBACK_UI_MAP.get(upper_val, upper_val)

    @classmethod
    def is_failure_status(cls, status: Any) -> bool:
        """Return True if the given status represents a delivery failure."""
        if isinstance(status, DeliveryStatus):
            return status in FAILURE_DELIVERY_STATUS_SET
        mapped = cls.map_provider_status(status)
        return mapped in FAILURE_DELIVERY_STATUS_SET

    @classmethod
    def _extract_from_value(cls, val: Any) -> str | None:
        if isinstance(val, str) and val.strip():
            return val.strip()
        if isinstance(val, (dict, list)):
            target = val[0] if isinstance(val, list) and val else val
            return cls.extract_raw_error_message(target)
        return None

    @classmethod
    def extract_raw_error_message(cls, error_detail: Any, status_code: int | None = None) -> str | None:
        """Extract a raw error message string from vendor payload dicts or strings."""
        if isinstance(error_detail, str) and error_detail.strip():
            return error_detail.strip()
        if isinstance(error_detail, dict):
            for key in ("status_description", "failure_reason", "message", "error", "description", "detail"):
                if res := cls._extract_from_value(error_detail.get(key)):
                    return res
        if status_code:
            return f"HTTP error {status_code}"
        return None

    @classmethod
    def sanitize_failure_reason(cls, raw_reason: str | None, failure_type: FailureType | None = None) -> str | None:
        """Sanitize diagnostic error strings to be safe for UI display."""
        if not raw_reason or not isinstance(raw_reason, str) or not raw_reason.strip():
            if failure_type and failure_type in cls._DEFAULT_FAILURE_REASONS:
                return cls._DEFAULT_FAILURE_REASONS[failure_type]
            return None

        cleaned = raw_reason.strip()
        # Take only the first line if a stack trace is present
        if "Traceback (most recent call last)" in cleaned or "\n  File " in cleaned:
            cleaned = cleaned.splitlines()[0].strip()
        else:
            cleaned = " ".join(cleaned.splitlines()).strip()

        # Strip HTML tags if any
        cleaned = re.sub(r"<[^>]+>", "", cleaned).strip()
        # Redact Bearer tokens or API keys if accidentally echoed
        cleaned = re.sub(r"(?i)(bearer\s+)[a-z0-9\-_\.]+", r"\1[REDACTED]", cleaned)
        # Redact raw email addresses and internal IPv4 addresses from diagnostic strings
        cleaned = re.sub(
            r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b", "[REDACTED_EMAIL]", cleaned
        )
        cleaned = re.sub(r"\b\d{1,3}(?:\.\d{1,3}){3}\b", "[REDACTED_IP]", cleaned)

        if len(cleaned) > 300:
            cleaned = cleaned[:297] + "..."

        if not cleaned and failure_type and failure_type in cls._DEFAULT_FAILURE_REASONS:
            return cls._DEFAULT_FAILURE_REASONS[failure_type]
        return cleaned or None

    @classmethod
    def classify_failure(
        cls,
        raw_status: Any = None,
        error_detail: Any = None,
        status_code: int | None = None,
    ) -> tuple[FailureType | None, str | None]:
        """Classify a delivery failure into a canonical FailureType and sanitized reason."""
        normalized_status = cls.normalize_status_token(raw_status)
        raw_message = cls.extract_raw_error_message(error_detail, status_code=status_code)
        lower_msg = (raw_message or "").lower()

        # Check if not actually a failure when raw_status is non-failure and no error is present
        if (
            normalized_status
            and normalized_status
            in (
                "created",
                "pending",
                "queued",
                "sending",
                "in-transit",
                "in_transit",
                "processing",
                "sent",
                "delivered",
                "completed",
            )
            and not raw_message
            and (status_code is None or status_code < 400)
        ):
            return None, None

        failure_type: FailureType
        # 1. Suppression / Blocked / Virus / Quarantine
        if normalized_status in ("blocked", "quarantined", "virus-scan-failed", "virus_scan_failed") or any(
            token in lower_msg
            for token in (
                "suppression",
                "suppressed",
                "quarantin",
                "blocked",
                "blacklist",
                "blocklist",
                "unsubscribe",
                "virus",
                "spam",
            )
        ):
            failure_type = FailureType.SUPPRESSION_LIST
        # 2. Mailbox full / Temporary failure
        elif normalized_status in (
            "temporary-failure",
            "temporary_failure",
            "partially_completed",
            "partially-completed",
        ) or any(
            token in lower_msg
            for token in (
                "mailbox full",
                "inbox is full",
                "inbox full",
                "quota",
                "temporarily",
                "temporary",
                "try again",
                "throttl",
                "452",
                "421",
            )
        ):
            failure_type = FailureType.MAILBOX_FULL
        # 3. Gateway / Technical failure
        elif (
            normalized_status in ("technical-failure", "technical_failure", "cancelled", "canceled")
            or (status_code is not None and status_code >= 500)
            or any(
                token in lower_msg
                for token in (
                    "technical",
                    "gateway",
                    "timeout",
                    "timed out",
                    "server error",
                    "internal error",
                    "service unavailable",
                    "connection",
                )
            )
        ):
            failure_type = FailureType.GATEWAY_ERROR
        # 4. Default to Permanent Bounce (e.g. permanent-failure, failed, 400 invalid email, unknown user)
        else:
            failure_type = FailureType.PERMANENT_BOUNCE

        sanitized_reason = cls.sanitize_failure_reason(raw_message, failure_type=failure_type)
        return failure_type, sanitized_reason


def classify_failure(
    raw_status: Any = None,
    error_detail: Any = None,
    status_code: int | None = None,
    provider_status: Any = None,
    raw_error: Any = None,
) -> tuple[FailureType | None, str | None]:
    """Module-level convenience wrapper around DeliveryStatusAdapter.classify_failure."""
    return DeliveryStatusAdapter.classify_failure(
        raw_status=raw_status if raw_status is not None else provider_status,
        error_detail=error_detail if error_detail is not None else raw_error,
        status_code=status_code,
    )
