# Copyright © 2025 Province of British Columbia
#
# Licensed under the BSD 3 Clause License, (the "License");
# you may not use this file except in compliance with the License.
# The template for the license can be found here
#    https://opensource.org/license/bsd-3-clause/
#
# Redistribution and use in source and binary forms,
# with or without modification, are permitted provided that the
# following conditions are met:
#
# 1. Redistributions of source code must retain the above copyright notice,
#    this list of conditions and the following disclaimer.
#
# 2. Redistributions in binary form must reproduce the above copyright notice,
#    this list of conditions and the following disclaimer in the documentation
#    and/or other materials provided with the distribution.
#
# 3. Neither the name of the copyright holder nor the names of its contributors
#    may be used to endorse or promote products derived from this software
#    without specific prior written permission.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS”
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
# THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
# ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
# LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
# CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
# SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
# INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
# CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
# ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
# POSSIBILITY OF SUCH DAMAGE.
import json
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from http import HTTPStatus
from typing import Any, overload

import requests
from flask import current_app

from strr_api.common.utils import normalize_to_list
from strr_api.enums.enum import ChannelType, DeliveryStatus, InteractionStatus, RecipientRole
from strr_api.exceptions import ExternalServiceException, ValidationException
from strr_api.models import CustomerInteraction, Events, InteractionRecipient, db
from strr_api.services.auth_service import AuthService
from strr_api.services.delivery_status_adapter import DeliveryStatusAdapter
from strr_api.services.events_service import EventsService
from strr_api.utils.validate_calls import validate_mutex

logger = logging.getLogger(__name__)


@dataclass
class EmailInfo:
    """Email Info class"""

    application_number: str | None = None
    email_type: str | None = None
    custom_content: str | None = None
    registration_number: str | None = None
    email: dict | None = None
    interaction: str | None = None
    interaction_uuid: str | None = None


class InteractionService:
    """Service to handle interaction logic."""

    DELIVERY_EVENT_NAME_BY_STATUS = {
        InteractionStatus.QUEUED.value: "EMAIL_QUEUED",
        InteractionStatus.SENT.value: "EMAIL_SENT",
        InteractionStatus.DELIVERED.value: "EMAIL_DELIVERED",
        InteractionStatus.FAILED.value: "EMAIL_FAILED",
        InteractionStatus.OPENED.value: "EMAIL_OPENED",
    }

    RECIPIENT_DELIVERY_STATUS_MAP = {
        "CREATED": "CREATED",
        "QUEUED": "PENDING",
        "SENDING": "IN_TRANSIT",
        "IN_TRANSIT": "IN_TRANSIT",
        "PROCESSING": "IN_TRANSIT",
        "SENT": "SENT",
        "PENDING": "PENDING",
        "DELIVERED": "DELIVERED",
        "COMPLETED": "DELIVERED",
        "PENDING_VIRUS_CHECK": "PENDING",
        "PERMANENT_FAILURE": "FAILED",
        "TEMPORARY_FAILURE": "FAILED",
        "TECHNICAL_FAILURE": "FAILED",
        "VIRUS_SCAN_FAILED": "FAILED",
        "BLOCKED": "FAILED",
        "QUARANTINED": "FAILED",
        "PARTIALLY_COMPLETED": "FAILED",
        "FAILED": "FAILED",
        "FAILURE": "FAILED",
    }

    email_event_mapper = {
        "HOST_RENEWAL_REMINDER": Events.EventName.RENEWAL_REMINDER_SENT,
        "STRATA_HOTEL_RENEWAL_REMINDER": Events.EventName.RENEWAL_REMINDER_SENT,
        "PLATFORM_RENEWAL_REMINDER": Events.EventName.RENEWAL_REMINDER_SENT,
    }

    @classmethod
    def filing_history_rows_for_application(cls, application_id: int) -> list[dict]:
        """Build filing-history rows from interaction delivery metadata for an application."""
        interactions = CustomerInteraction.fetch_application_interactions(application_id)
        return cls._build_delivery_rows(interactions, Events.EventType.APPLICATION.value)

    @classmethod
    def filing_history_rows_for_registration(cls, registration_id: int) -> list[dict]:
        """Build filing-history rows from interaction delivery metadata for a registration."""
        interactions = CustomerInteraction.fetch_registration_interactions(registration_id)
        return cls._build_delivery_rows(interactions, Events.EventType.REGISTRATION.value)

    @classmethod
    def _build_delivery_rows(cls, interactions: list[CustomerInteraction], event_type: str) -> list[dict]:
        return [row for interaction in interactions if (row := cls._build_delivery_row(interaction, event_type))]

    @staticmethod
    def _message_for_delivery_status(channel: str, status: str) -> str:
        """Create a readable filing-history message for interaction delivery rows."""
        return f"{channel.capitalize()} delivery status updated ({status.capitalize()})."

    @classmethod
    def _event_name_for_status(cls, status: str) -> str:
        """Map persisted interaction status to filing-history event name."""
        return cls.DELIVERY_EVENT_NAME_BY_STATUS.get(status, "EMAIL_SENT")

    @classmethod
    def _map_recipient_delivery_status(cls, status: str | None) -> str:
        """Map provider delivery outcomes to internal recipient statuses."""
        normalized = str(status).strip().upper().replace("-", "_") if status else ""
        return cls.RECIPIENT_DELIVERY_STATUS_MAP.get(normalized, "UNKNOWN")

    @staticmethod
    def _recipient_status_row(
        email_address: str | None,
        status: str,
        provider_status: str | None = None,
        *,
        failure_reason: str | None = None,
        failure_type: str | None = None,
        notify_reference: str | None = None,
        provider_reference: str | None = None,
        request_date: str | None = None,
        sent_date: str | None = None,
        recipient_role: str | None = None,
    ) -> dict:
        """Build a standardized recipient status entry for filing-history events."""
        row = {
            "email_address": email_address,
            "failure_reason": failure_reason,
            "failure_type": failure_type,
            "notify_reference": notify_reference,
            "provider_reference": provider_reference,
            "request_date": request_date,
            "sent_date": sent_date,
            "status": status,
            "provider_status": provider_status,
        }
        if recipient_role is not None:
            row["recipient_role"] = recipient_role
        return row

    @classmethod
    def _normalize_recipient_statuses(cls, recipient_statuses: dict | None) -> list[dict]:
        """Normalize stored recipient statuses to API response array shape."""
        if not isinstance(recipient_statuses, dict):
            return []

        return [
            cls._recipient_status_row(
                email_address=row.get("email_address"),
                status=cls._map_recipient_delivery_status(row.get("status")),
                provider_status=row.get("status"),
                failure_reason=row.get("failure_reason"),
                failure_type=row.get("failure_type"),
                notify_reference=row.get("notify_reference") or str(notify_reference),
                provider_reference=row.get("provider_reference"),
                request_date=row.get("request_date"),
                sent_date=row.get("sent_date"),
                recipient_role=row.get("recipient_role"),
            )
            for notify_reference, payload in recipient_statuses.items()
            if (row := payload if isinstance(payload, dict) else {}) is not None
        ]

    @classmethod
    def _fallback_recipient_statuses(
        cls, meta_data: dict, default_status: str, default_created_at: str | None
    ) -> list[dict]:
        """Construct recipient status fallback rows from notify_response metadata when notify_delivery is missing."""
        notify_response = meta_data.get("notify_response")
        if not isinstance(notify_response, dict):
            return []

        recipients = normalize_to_list(notify_response.get("recipients"))
        if not recipients:
            return []

        ref_list = normalize_to_list(
            notify_response.get("ids") or meta_data.get("notify_references") or notify_response.get("id")
        )

        sent_date = notify_response.get("sentDate") or notify_response.get("requestDate") or default_created_at
        request_date = notify_response.get("requestDate")
        provider_status = notify_response.get("notifyStatus")
        mapped_status = cls._map_recipient_delivery_status(provider_status or default_status)

        default_ref = ref_list[0] if ref_list else None

        return [
            cls._recipient_status_row(
                email_address=recipient,
                status=mapped_status,
                provider_status=provider_status,
                notify_reference=ref_list[i] if i < len(ref_list) else default_ref,
                request_date=request_date,
                sent_date=sent_date,
            )
            for i, recipient in enumerate(recipients)
        ]

    @classmethod
    def _failed_recipient_statuses(cls, notify_response: dict, default_request_date: str | None) -> list[dict]:
        """Construct recipient status rows for recipients that failed during initial dispatch."""
        failed_recipients = notify_response.get("failed_recipients")
        if not isinstance(failed_recipients, list):
            return []

        request_date = notify_response.get("requestDate") or default_request_date
        return [
            cls._recipient_status_row(
                email_address=failed.get("email_address"),
                status="FAILED",
                provider_status="PERMANENT_FAILURE",
                failure_reason=cls._extract_failure_reason(failed.get("error"), failed.get("status_code")),
                failure_type="PERMANENT_FAILURE",
                request_date=request_date,
            )
            for failed in failed_recipients
            if isinstance(failed, dict)
        ]

    @classmethod
    def _recipient_statuses_from_models(cls, recipients: list[InteractionRecipient]) -> list[dict]:
        """Convert normalized InteractionRecipient rows into filing-history recipient status dicts."""
        result: list[dict] = []
        for rec in recipients:
            raw_payload = rec.raw_payload if isinstance(rec.raw_payload, dict) else {}
            provider_status = raw_payload.get("provider_status") or (rec.status.value if rec.status else None)
            mapped_status = DeliveryStatusAdapter.map_to_filing_history_status(rec.status, provider_status)
            request_date_str = raw_payload.get("request_date_str") or (
                rec.request_date.isoformat() if rec.request_date else None
            )
            sent_date_str = raw_payload.get("sent_date_str") or (rec.sent_date.isoformat() if rec.sent_date else None)
            result.append(
                cls._recipient_status_row(
                    email_address=rec.email_address,
                    status=mapped_status,
                    provider_status=provider_status,
                    failure_reason=rec.failure_reason,
                    failure_type=rec.failure_type,
                    notify_reference=rec.notify_reference,
                    provider_reference=rec.provider_reference,
                    request_date=request_date_str,
                    sent_date=sent_date_str,
                    recipient_role=rec.recipient_role,
                )
            )
        return result

    @classmethod
    def _build_delivery_row(cls, interaction: CustomerInteraction, event_type: str) -> dict | None:
        """Convert a single interaction row into filing-history event shape."""
        channel = interaction.channel.value if interaction.channel else ""
        if channel != ChannelType.EMAIL.value:
            return None

        meta_data = interaction.meta_data if isinstance(interaction.meta_data, dict) else {}
        notify_delivery = meta_data.get("notify_delivery") if isinstance(meta_data.get("notify_delivery"), dict) else {}
        notify_response = meta_data.get("notify_response") if isinstance(meta_data.get("notify_response"), dict) else {}
        status = interaction.status.value if interaction.status else ""
        created_at_iso = interaction.created_at.isoformat() if interaction.created_at else None

        if interaction.recipients:
            recipient_statuses = cls._recipient_statuses_from_models(interaction.recipients)
        else:
            recipient_statuses = cls._normalize_recipient_statuses(
                notify_delivery.get("recipient_statuses")
            ) or cls._fallback_recipient_statuses(meta_data, status, created_at_iso)
            recipient_statuses.extend(cls._failed_recipient_statuses(notify_response, created_at_iso))

        latest_recipient_update = None
        if interaction.recipients:
            updated_times = [r.updated_at.isoformat() for r in interaction.recipients if r.updated_at]
            if updated_times:
                latest_recipient_update = max(updated_times)

        recipient_status_updated_at = (
            notify_delivery.get("updated_at")
            or notify_response.get("sentDate")
            or notify_response.get("requestDate")
            or latest_recipient_update
            or created_at_iso
        )

        return {
            "eventType": event_type,
            "eventName": cls._event_name_for_status(status),
            "message": cls._message_for_delivery_status(channel, status),
            "createdDate": created_at_iso,
            "details": None,
            "structuredDetails": {
                "channel": channel,
                "emailType": meta_data.get("email_type"),
                "interactionStatus": status,
                "recipientStatusUpdatedAt": recipient_status_updated_at,
                "recipientStatuses": recipient_statuses,
            },
            "idir": None,
        }

    @overload
    def dispatch(*, application_id: int) -> None:
        ...

    @overload
    def dispatch(*, registration_id: int) -> None:
        ...

    @overload
    def dispatch(*, customer_id: int) -> None:
        ...

    @staticmethod
    @validate_mutex("application_id", "registration_id", "customer_id", min_count=1, max_count=1)
    def dispatch(
        channel_type: ChannelType,
        payload: dict | str | EmailInfo,
        idempotency_key: str | None = None,
        interaction_uuid: str | None = None,
        user_id: int | None = None,
        application_id: int | None = None,
        registration_id: int | None = None,
        customer_id: int | None = None,
    ) -> CustomerInteraction:
        """Dispatch interaction."""
        match channel_type:
            case ChannelType.EMAIL:
                if not isinstance(payload, EmailInfo):
                    raise ValidationException(error="Invalid EmailInfo", status_code=HTTPStatus.BAD_REQUEST)
                payload.interaction_uuid = payload.interaction_uuid or interaction_uuid
                notify_json = InteractionService._send_email_to_notify_service(payload)

            case _:
                raise ExternalServiceException(error="Unsupported channel type", status_code=HTTPStatus.BAD_REQUEST)

        is_sent = InteractionService._valid_notify_id(notify_json.get("id"))
        interaction = InteractionService._save_interaction(
            channel_type=channel_type,
            payload=payload,
            status=InteractionStatus.SENT if is_sent else InteractionStatus.FAILED,
            idempotency_key=idempotency_key,
            interaction_uuid=interaction_uuid,
            user_id=user_id,
            application_id=application_id,
            registration_id=registration_id,
            customer_id=customer_id,
            notify_json=notify_json,
        )
        if not is_sent:
            raise ExternalServiceException(error="Email not sent", status_code=HTTPStatus.BAD_REQUEST)

        if event_name := InteractionService.email_event_mapper.get(payload.email_type):
            if registration_id:
                event_type = Events.EventType.REGISTRATION
            elif application_id:
                event_type = Events.EventType.APPLICATION
            else:
                event_type = Events.EventType.USER
            EventsService.save_event(
                event_type=event_type,
                event_name=event_name,
                details=f"Interaction sent via {channel_type.value}",
                application_id=application_id,
                registration_id=registration_id,
                user_id=user_id,
            )

        return interaction

    @staticmethod
    @validate_mutex("application_id", "registration_id", "customer_id", min_count=1, max_count=1)
    def queued(
        channel_type: ChannelType,
        payload: dict | str | EmailInfo,
        idempotency_key: str | None = None,
        user_id: int | None = None,
        application_id: int | None = None,
        registration_id: int | None = None,
        customer_id: int | None = None,
    ) -> str:
        return InteractionService._save_interaction(
            channel_type=channel_type,
            payload=payload,
            status=InteractionStatus.QUEUED,
            idempotency_key=idempotency_key,
            user_id=user_id,
            application_id=application_id,
            registration_id=registration_id,
            customer_id=customer_id,
        ).interaction_uuid

    @staticmethod
    def _parse_iso_datetime(value: Any) -> datetime | None:
        """Parse an ISO-8601 timestamp string into a timezone-aware datetime."""
        if isinstance(value, datetime):
            return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        if not isinstance(value, str) or not value.strip():
            return None
        cleaned = value.strip()
        if cleaned.endswith("Z"):
            cleaned = cleaned[:-1] + "+00:00"
        try:
            dt = datetime.fromisoformat(cleaned)
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except ValueError:
            return None

    @staticmethod
    def _find_role_in_map(role_map: Any, normalized_email: str) -> str | None:
        if isinstance(role_map, dict):
            for addr, role in role_map.items():
                if str(addr).strip().lower() == normalized_email and role:
                    return str(role)
        return None

    @classmethod
    def _resolve_recipient_role(
        cls,
        email_address: str | None,
        payload: dict | str | EmailInfo | None = None,
        meta_data: dict | None = None,
    ) -> str | None:
        """Determine the canonical RecipientRole for an email address when context is available."""
        if not email_address:
            return None
        normalized = email_address.strip().lower()
        if isinstance(payload, EmailInfo) and isinstance(payload.email, dict):
            if role := cls._find_role_in_map(payload.email.get("recipient_roles"), normalized):
                return role
        if isinstance(meta_data, dict):
            if role := cls._find_role_in_map(meta_data.get("recipient_roles"), normalized):
                return role
        if normalized.endswith("@gov.bc.ca") and "strregistry" in normalized:
            return RecipientRole.REGISTRY_COPY.value
        return RecipientRole.HOST.value

    @classmethod
    def _build_recipient_status_spec(
        cls, ref_key: str, rec_payload: dict, meta_data: dict, payload: Any
    ) -> dict | None:
        if not isinstance(rec_payload, dict):
            return None
        email_addr = rec_payload.get("email_address")
        if not email_addr:
            return None

        raw_status = rec_payload.get("status")
        raw_reason = rec_payload.get("failure_reason")
        raw_type = rec_payload.get("failure_type")
        delivery_status = DeliveryStatusAdapter.map_provider_status(raw_status, error_detail=raw_reason)

        failure_type = raw_type
        failure_reason = raw_reason
        if DeliveryStatusAdapter.is_failure_status(delivery_status):
            classified_type, classified_reason = DeliveryStatusAdapter.classify_failure(
                raw_status, error_detail=raw_reason
            )
            if classified_type and not failure_type:
                failure_type = classified_type.value
            failure_reason = classified_reason or failure_reason

        notify_ref = str(rec_payload.get("notify_reference") or ref_key).strip() or None
        req_str = rec_payload.get("request_date")
        sent_str = rec_payload.get("sent_date")
        provider_ref = (
            str(rec_payload.get("provider_reference")).strip() if rec_payload.get("provider_reference") else None
        )

        return {
            "email_address": str(email_addr).strip(),
            "recipient_role": rec_payload.get("recipient_role")
            or cls._resolve_recipient_role(email_addr, payload, meta_data),
            "status": delivery_status,
            "failure_type": failure_type,
            "failure_reason": failure_reason,
            "notify_reference": notify_ref,
            "provider_reference": provider_ref,
            "request_date": cls._parse_iso_datetime(req_str),
            "sent_date": cls._parse_iso_datetime(sent_str),
            "raw_payload": {
                **rec_payload,
                "provider_status": raw_status,
                "request_date_str": req_str,
                "sent_date_str": sent_str,
            },
        }

    @classmethod
    def _specs_from_recipient_statuses(cls, recipient_statuses: dict, meta_data: dict, payload: Any) -> list[dict]:
        specs = []
        for ref_key, rec_payload in recipient_statuses.items():
            spec = cls._build_recipient_status_spec(ref_key, rec_payload, meta_data, payload)
            if spec:
                specs.append(spec)
        return specs

    @classmethod
    def _specs_for_failed_dispatch(
        cls,
        recipients: list[str],
        notify_response: dict,
        meta_data: dict,
        payload: Any,
        default_created_iso: str | None,
    ) -> list[dict]:
        specs = []
        err = notify_response.get("error")
        status_code = notify_response.get("status_code")
        delivery_status = DeliveryStatusAdapter.map_provider_status("failed", error_detail=err, status_code=status_code)
        failure_type_enum, sanitized_reason = DeliveryStatusAdapter.classify_failure(
            "failed", error_detail=err, status_code=status_code
        )
        failure_reason = sanitized_reason or cls._extract_failure_reason(err, status_code)
        req_str = notify_response.get("requestDate") or default_created_iso
        for email_addr in recipients:
            specs.append(
                {
                    "email_address": str(email_addr).strip(),
                    "recipient_role": cls._resolve_recipient_role(email_addr, payload, meta_data),
                    "status": delivery_status,
                    "failure_type": (
                        failure_type_enum.value if failure_type_enum else DeliveryStatus.PERMANENT_FAILURE.value
                    ),
                    "failure_reason": failure_reason,
                    "notify_reference": None,
                    "provider_reference": None,
                    "request_date": cls._parse_iso_datetime(req_str),
                    "sent_date": None,
                    "raw_payload": {
                        "provider_status": "PERMANENT_FAILURE",
                        "status_code": status_code,
                        "error": err,
                        "request_date_str": req_str,
                    },
                }
            )
        return specs

    @classmethod
    def _specs_for_success_dispatch(
        cls,
        recipients: list[str],
        failed_emails: set[str],
        notify_response: dict,
        meta_data: dict,
        payload: Any,
        interaction_status: InteractionStatus | None,
        default_created_iso: str | None,
    ) -> list[dict]:
        ref_list = normalize_to_list(
            notify_response.get("ids") or meta_data.get("notify_references") or notify_response.get("id")
        )
        ref_list = [r for r in ref_list if cls._valid_notify_id(r)]
        default_ref = ref_list[0] if ref_list else None
        req_str = notify_response.get("requestDate")
        sent_str = notify_response.get("sentDate") or req_str or default_created_iso
        provider_status = notify_response.get("notifyStatus") or (
            interaction_status.value if interaction_status else "PENDING"
        )
        delivery_status = DeliveryStatusAdapter.map_provider_status(provider_status)

        success_recipients = [
            r for r in recipients if not notify_response.get("recipients") and r not in failed_emails
        ] or (recipients if notify_response.get("recipients") else [])

        specs = []
        for idx, email_addr in enumerate(success_recipients):
            ref_val = ref_list[idx] if idx < len(ref_list) else default_ref
            specs.append(
                {
                    "email_address": str(email_addr).strip(),
                    "recipient_role": cls._resolve_recipient_role(email_addr, payload, meta_data),
                    "status": delivery_status,
                    "failure_type": None,
                    "failure_reason": None,
                    "notify_reference": str(ref_val).strip() if ref_val else None,
                    "provider_reference": None,
                    "request_date": cls._parse_iso_datetime(req_str),
                    "sent_date": cls._parse_iso_datetime(sent_str),
                    "raw_payload": {
                        "provider_status": provider_status,
                        "request_date_str": req_str,
                        "sent_date_str": sent_str,
                    },
                }
            )
        return specs

    @classmethod
    def _specs_from_notify_response(
        cls,
        notify_response: dict,
        meta_data: dict,
        payload: Any,
        interaction_status: InteractionStatus | None,
        default_created_iso: str | None,
    ) -> list[dict]:
        email_dict = payload.email if isinstance(payload, EmailInfo) and isinstance(payload.email, dict) else {}
        recipients = normalize_to_list(notify_response.get("recipients") or email_dict.get("recipients"))
        failed_list = (
            notify_response.get("failed_recipients")
            if isinstance(notify_response.get("failed_recipients"), list)
            else []
        )
        failed_emails = {
            str(f.get("email_address")).strip() for f in failed_list if isinstance(f, dict) and f.get("email_address")
        }

        if (
            interaction_status == InteractionStatus.FAILED
            and not failed_list
            and recipients
            and not cls._valid_notify_id(notify_response.get("id"))
        ):
            return cls._specs_for_failed_dispatch(recipients, notify_response, meta_data, payload, default_created_iso)

        return cls._specs_for_success_dispatch(
            recipients, failed_emails, notify_response, meta_data, payload, interaction_status, default_created_iso
        )

    @classmethod
    def _specs_from_failed_recipients(
        cls, failed_recipients: list, meta_data: dict, payload: Any, default_created_iso: str | None
    ) -> list[dict]:
        specs = []
        req_str = default_created_iso
        for failed in failed_recipients:
            if not isinstance(failed, dict) or not failed.get("email_address"):
                continue
            email_addr = str(failed.get("email_address")).strip()
            err = failed.get("error")
            status_code = failed.get("status_code")
            delivery_status = DeliveryStatusAdapter.map_provider_status(
                "failed", error_detail=err, status_code=status_code
            )
            classified_type, sanitized_reason = DeliveryStatusAdapter.classify_failure(
                "failed", error_detail=err, status_code=status_code
            )
            raw_failure_reason = cls._extract_failure_reason(err, status_code)
            failure_reason = (
                DeliveryStatusAdapter.sanitize_failure_reason(raw_failure_reason, classified_type) or sanitized_reason
            )
            specs.append(
                {
                    "email_address": email_addr,
                    "recipient_role": cls._resolve_recipient_role(email_addr, payload, meta_data),
                    "status": delivery_status,
                    "failure_type": classified_type.value if classified_type else "PERMANENT_FAILURE",
                    "failure_reason": failure_reason,
                    "notify_reference": None,
                    "provider_reference": None,
                    "request_date": cls._parse_iso_datetime(req_str),
                    "sent_date": None,
                    "raw_payload": {
                        "provider_status": "PERMANENT_FAILURE",
                        "status_code": status_code,
                        "error": err,
                        "request_date_str": req_str,
                    },
                }
            )
        return specs

    @classmethod
    def _extract_recipient_specs(
        cls,
        meta_data: dict,
        payload: dict | str | EmailInfo | None = None,
        interaction_status: InteractionStatus | None = None,
        default_created_at: datetime | None = None,
    ) -> list[dict]:
        """Extract normalized recipient specification dicts from interaction metadata and payload."""
        specs: list[dict] = []
        notify_delivery = meta_data.get("notify_delivery") if isinstance(meta_data.get("notify_delivery"), dict) else {}
        notify_response = meta_data.get("notify_response") if isinstance(meta_data.get("notify_response"), dict) else {}
        recipient_statuses = notify_delivery.get("recipient_statuses") or meta_data.get("recipient_statuses")
        default_created_iso = default_created_at.isoformat() if isinstance(default_created_at, datetime) else None

        if isinstance(recipient_statuses, dict) and recipient_statuses:
            specs.extend(cls._specs_from_recipient_statuses(recipient_statuses, meta_data, payload))
        else:
            specs.extend(
                cls._specs_from_notify_response(
                    notify_response, meta_data, payload, interaction_status, default_created_iso
                )
            )

        failed_recipients = (
            notify_response.get("failed_recipients")
            if isinstance(notify_response.get("failed_recipients"), list)
            else []
        )
        req_fallback = notify_response.get("requestDate") or default_created_iso
        specs.extend(cls._specs_from_failed_recipients(failed_recipients, meta_data, payload, req_fallback))

        return specs

    @classmethod
    def _claim_unique_notify_ref(
        cls, notify_ref: str | None, interaction_id: int | None, seen_refs_in_batch: set[str]
    ) -> str | None:
        if not notify_ref:
            return None
        if notify_ref in seen_refs_in_batch:
            return None
        query = db.session.query(InteractionRecipient).filter(InteractionRecipient.notify_reference == notify_ref)
        if interaction_id:
            query = query.filter(InteractionRecipient.interaction_id != interaction_id)
        if query.first() is not None:
            return None
        seen_refs_in_batch.add(notify_ref)
        return notify_ref

    @classmethod
    def _apply_recipient_spec(
        cls, target_rec: InteractionRecipient, spec: dict, notify_ref: str | None, email_addr: str
    ) -> None:
        target_rec.email_address = email_addr
        target_rec.recipient_role = spec.get("recipient_role") or target_rec.recipient_role
        target_rec.status = spec["status"]
        target_rec.failure_type = spec.get("failure_type")
        target_rec.failure_reason = spec.get("failure_reason")
        if notify_ref:
            target_rec.notify_reference = notify_ref
        if spec.get("provider_reference"):
            target_rec.provider_reference = spec.get("provider_reference")
        if spec.get("request_date"):
            target_rec.request_date = spec.get("request_date")
        if spec.get("sent_date"):
            target_rec.sent_date = spec.get("sent_date")
        if spec.get("raw_payload") is not None:
            target_rec.raw_payload = cls._json_safe(spec.get("raw_payload"))

    @staticmethod
    def _index_recipients(
        recipients: list[InteractionRecipient],
    ) -> tuple[dict[str, InteractionRecipient], dict[str, InteractionRecipient]]:
        by_ref: dict[str, InteractionRecipient] = {}
        by_email: dict[str, InteractionRecipient] = {}
        for rec in recipients:
            if rec.notify_reference:
                by_ref[rec.notify_reference] = rec
            if rec.email_address:
                by_email[rec.email_address.lower()] = rec
        return by_ref, by_email

    @classmethod
    def _sync_single_spec(
        cls,
        interaction: CustomerInteraction,
        spec: dict,
        existing_by_ref: dict[str, InteractionRecipient],
        existing_by_email: dict[str, InteractionRecipient],
        seen_refs_in_batch: set[str],
    ) -> bool:
        """Returns True if a new recipient was created, False if updated."""
        notify_ref = cls._claim_unique_notify_ref(spec.get("notify_reference"), interaction.id, seen_refs_in_batch)
        email_addr = spec["email_address"]
        target_rec = existing_by_ref.get(notify_ref) if notify_ref else None
        if not target_rec:
            target_rec = existing_by_email.get(email_addr.lower())

        if target_rec is None:
            new_rec = InteractionRecipient(
                email_address=email_addr,
                recipient_role=spec.get("recipient_role"),
                status=spec["status"],
                failure_type=spec.get("failure_type"),
                failure_reason=spec.get("failure_reason"),
                notify_reference=notify_ref,
                provider_reference=spec.get("provider_reference"),
                request_date=spec.get("request_date"),
                sent_date=spec.get("sent_date"),
                raw_payload=cls._json_safe(spec.get("raw_payload")),
            )
            interaction.recipients.append(new_rec)
            if notify_ref:
                existing_by_ref[notify_ref] = new_rec
            existing_by_email[email_addr.lower()] = new_rec
            return True

        cls._apply_recipient_spec(target_rec, spec, notify_ref, email_addr)
        return False

    @classmethod
    def _sync_interaction_recipients(
        cls,
        interaction: CustomerInteraction,
        payload: dict | str | EmailInfo | None = None,
        status: InteractionStatus | None = None,
    ) -> tuple[int, int]:
        """Synchronize InteractionRecipient child rows for an interaction within the current session."""
        if interaction.channel != ChannelType.EMAIL:
            return 0, 0

        meta_data = interaction.meta_data if isinstance(interaction.meta_data, dict) else {}
        specs = cls._extract_recipient_specs(
            meta_data=meta_data,
            payload=payload,
            interaction_status=status or interaction.status,
            default_created_at=interaction.created_at,
        )
        if not specs:
            return 0, 0

        existing_by_ref, existing_by_email = cls._index_recipients(interaction.recipients)
        seen_refs_in_batch: set[str] = set()
        created_count = 0
        updated_count = 0

        for spec in specs:
            if cls._sync_single_spec(interaction, spec, existing_by_ref, existing_by_email, seen_refs_in_batch):
                created_count += 1
            else:
                updated_count += 1

        return created_count, updated_count

    @staticmethod
    def _save_interaction(
        channel_type: ChannelType,
        payload: dict | str | EmailInfo,
        status: InteractionStatus,
        idempotency_key: str | None = None,
        interaction_uuid: str | None = None,
        user_id: int | None = None,
        application_id: int | None = None,
        registration_id: int | None = None,
        customer_id: int | None = None,
        notify_json: dict | None = None,
    ) -> CustomerInteraction:
        """Create or update the tracked interaction row and recipient rows in a single atomic transaction."""
        interaction = CustomerInteraction.find_by_uuid(interaction_uuid) if interaction_uuid else None
        if not interaction:
            interaction = CustomerInteraction()

        interaction.channel = channel_type
        interaction.status = status
        interaction.application_id = application_id
        interaction.registration_id = registration_id
        interaction.customer_id = customer_id
        interaction.user_id = user_id
        interaction.idempotency_key = idempotency_key

        notify_id = notify_json.get("id") if notify_json else None
        if InteractionService._valid_notify_id(notify_id):
            interaction.notify_reference = str(notify_id)

        if body_content := InteractionService._body_content(payload):
            interaction.body_content = body_content

        meta_data = interaction.meta_data.copy() if interaction.meta_data else {}
        meta_data.update(
            InteractionService._interaction_metadata(
                payload=payload,
                status=status,
                application_id=application_id,
                registration_id=registration_id,
                customer_id=customer_id,
                notify_json=notify_json,
            )
        )
        interaction.meta_data = meta_data
        db.session.add(interaction)
        db.session.flush()
        InteractionService._sync_interaction_recipients(interaction, payload=payload, status=status)
        interaction.save()
        notify_dict = notify_json if isinstance(notify_json, dict) else {}
        if status == InteractionStatus.FAILED or notify_dict.get("failed_recipients"):
            current_app.logger.warning(
                "strr.interactions.failed_detected interaction_status=%s interaction_uuid=%s email_type=%s "
                "target_entity=%s target_id=%s application_number=%s registration_number=%s "
                "notify_status_code=%s notify_error=%s failed_recipients=%s",
                status.value,
                interaction.interaction_uuid,
                meta_data.get("email_type"),
                meta_data.get("target_entity"),
                meta_data.get("target_id"),
                meta_data.get("application_number"),
                meta_data.get("registration_number"),
                notify_dict.get("status_code"),
                notify_dict.get("error"),
                notify_dict.get("failed_recipients"),
            )
        return interaction

    @staticmethod
    def _valid_notify_id(notify_id) -> bool:
        """Return true when Notify returned a usable reference."""
        if notify_id is None or isinstance(notify_id, bool):
            return False
        if isinstance(notify_id, (int, float)):
            return notify_id > 0
        return str(notify_id).strip() not in {"", "0", "-1"}

    @staticmethod
    def _body_content(payload: dict | str | EmailInfo) -> str | None:
        """Extract a non-sensitive body summary for interaction audit rows."""
        if not isinstance(payload, EmailInfo) or not payload.email:
            return None
        return payload.email.get("content", {}).get("subject")

    @staticmethod
    def _interaction_metadata(
        payload: dict | str | EmailInfo,
        status: InteractionStatus,
        application_id: int | None = None,
        registration_id: int | None = None,
        customer_id: int | None = None,
        notify_json: dict | None = None,
    ) -> dict:
        """Build searchable metadata for dashboards, alerts, and audit support."""
        if application_id:
            target_entity = "application"
        elif registration_id:
            target_entity = "registration"
        else:
            target_entity = "customer"
        target_id = application_id or registration_id or customer_id
        metadata = {
            "status": status.value,
            "target_entity": target_entity,
            "target_id": str(target_id) if target_id is not None else None,
        }
        if isinstance(payload, EmailInfo):
            metadata.update(
                {
                    "email_type": payload.email_type,
                    "application_number": payload.application_number,
                    "registration_number": payload.registration_number,
                }
            )
            if payload.email:
                metadata["notify_request"] = {
                    "requestBy": payload.email.get("requestBy"),
                    "subject": payload.email.get("content", {}).get("subject"),
                }
        if isinstance(notify_json, dict) and notify_json:
            metadata["notify_response"] = InteractionService._json_safe(notify_json)
            if notify_ids := notify_json.get("ids"):
                metadata["notify_references"] = notify_ids
        return {key: value for key, value in metadata.items() if value is not None}

    @staticmethod
    def _json_safe(value):
        """Return metadata that can be stored in a JSONB column."""
        try:
            json.dumps(value)
            return value
        except TypeError:
            return str(value)

    @staticmethod
    def _extract_failure_reason(error, status_code: int | None = None) -> str:
        """Extract a readable failure reason from a Notify error payload."""
        if isinstance(error, dict):
            return str(error.get("message") or error.get("error") or json.dumps(error))
        if error:
            return str(error)
        return f"HTTP error {status_code}" if status_code else "Failed to send email via notify service"

    @staticmethod
    def _send_email_to_notify_service(email_info: EmailInfo) -> dict:
        """Send an email via the notify-api.

        When the email has multiple recipients, dispatch a separate notify request
        per recipient so a single malformed address cannot block delivery to the
        rest of the recipients.
        """
        email = email_info.email if isinstance(email_info.email, dict) else None
        recipients = normalize_to_list((email or {}).get("recipients"))
        if len(recipients) <= 1:
            return InteractionService._post_email_to_notify(email_info.email, email_info)

        success_ids: list = []
        success_recipients: list[str] = []
        failed_recipients: list[dict] = []
        last_success_result: dict = {}
        last_failure_result: dict = {"id": -1}

        for recipient in recipients:
            result = InteractionService._post_email_to_notify({**email, "recipients": recipient}, email_info)
            notify_id = result.get("id")

            if InteractionService._valid_notify_id(notify_id):
                success_ids.append(notify_id)
                success_recipients.append(recipient)
                last_success_result = result
                continue

            last_failure_result = result
            failed_recipients.append(
                {
                    "email_address": recipient,
                    "status_code": result.get("status_code"),
                    "error": result.get("error"),
                }
            )

        if not success_ids:
            return {**last_failure_result, "id": -1, "failed_recipients": failed_recipients}

        response = {
            **last_success_result,
            "id": success_ids[0],
            "ids": ",".join(str(i) for i in success_ids)[:100],
            "recipients": ",".join(success_recipients),
        }
        if failed_recipients:
            response["failed_recipients"] = failed_recipients
        return response

    @staticmethod
    def _post_email_to_notify(email_payload: dict | None, email_info: EmailInfo | None = None) -> dict:
        """Post a single email payload to the notify-api."""
        token = AuthService.get_service_client_token()
        recipients = email_payload.get("recipients") if isinstance(email_payload, dict) else None
        log_context = (
            getattr(email_info, "email_type", None),
            getattr(email_info, "application_number", None),
            getattr(email_info, "registration_number", None),
            getattr(email_info, "interaction_uuid", None),
            recipients,
        )
        try:
            resp = requests.post(
                current_app.config["NOTIFY_SVC_URL"],
                json=email_payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {token}",
                },
                timeout=current_app.config["NOTIFY_API_TIMEOUT"],
            )
        except Exception as err:
            current_app.logger.exception(
                "strr.email.notify.failed Error posting email to notify-api "
                "email_type=%s application_number=%s registration_number=%s interaction_uuid=%s recipients=%s",
                *log_context,
            )
            return {"id": -1, "error": str(err)}

        if resp.status_code not in [HTTPStatus.OK, HTTPStatus.ACCEPTED, HTTPStatus.CREATED]:
            try:
                response_body = resp.json()
            except Exception:  # pragma: no cover - defensive for malformed downstream responses
                response_body = getattr(resp, "text", "")
            current_app.logger.error(
                "strr.email.notify.failed Error posting email to notify-api "
                "email_type=%s application_number=%s registration_number=%s interaction_uuid=%s recipients=%s "
                "status_code=%s notify_error=%s",
                *log_context,
                resp.status_code,
                response_body,
            )
            return {"id": -1, "status_code": resp.status_code, "error": response_body}

        return resp.json()

    @classmethod
    def _create_backfill_recipient(cls, interaction_id: int, spec: dict) -> InteractionRecipient | None:
        email_addr = spec.get("email_address")
        if not email_addr:
            return None

        ref_val = str(spec["notify_reference"]).strip() if spec.get("notify_reference") else None
        if ref_val and InteractionRecipient.query.filter_by(notify_reference=ref_val).first():
            ref_val = None

        return InteractionRecipient(
            interaction_id=interaction_id,
            recipient_role=spec.get("recipient_role"),
            email_address=str(email_addr).strip(),
            status=spec["status"],
            failure_type=spec.get("failure_type"),
            failure_reason=spec.get("failure_reason"),
            notify_reference=ref_val,
            provider_reference=spec.get("provider_reference"),
            request_date=spec.get("request_date"),
            sent_date=spec.get("sent_date"),
            raw_payload=spec.get("raw_payload"),
        )

    @classmethod
    def _backfill_single_interaction(cls, interaction: CustomerInteraction, stats: dict[str, int]) -> None:
        meta_data = interaction.meta_data if isinstance(interaction.meta_data, dict) else {}
        specs = cls._extract_recipient_specs(
            meta_data=meta_data,
            payload=None,
            interaction_status=interaction.status,
            default_created_at=interaction.created_at,
        )
        if not specs:
            stats["total_skipped"] += 1
            return

        for spec in specs:
            recipient = cls._create_backfill_recipient(interaction.id, spec)
            if recipient:
                db.session.add(recipient)
                stats["total_recipients_created"] += 1

    @classmethod
    def backfill_interaction_recipients(cls, batch_size: int = 1000) -> dict:
        """Decompose historical interactions.meta_data JSONB blobs into interaction_recipients rows.

        Uses cursor pagination on CustomerInteraction.id to process records in chunked batches,
        skipping any interaction that already has rows in interaction_recipients.

        Args:
            batch_size: Number of interactions to process per commit batch (default: 1000)

        Returns:
            dict: Summary metrics containing total_processed, total_recipients_created,
                  total_skipped, and total_errors.
        """
        stats = {
            "total_processed": 0,
            "total_recipients_created": 0,
            "total_skipped": 0,
            "total_errors": 0,
        }

        last_id = 0
        while True:
            batch = (
                CustomerInteraction.query.filter(CustomerInteraction.id > last_id)
                .order_by(CustomerInteraction.id.asc())
                .limit(batch_size)
                .all()
            )
            if not batch:
                break

            last_id = batch[-1].id
            batch_ids = [interaction.id for interaction in batch]

            # Fetch existing interaction_ids in this batch that already have recipient rows
            existing_ids = {
                row[0]
                for row in db.session.query(InteractionRecipient.interaction_id)
                .filter(InteractionRecipient.interaction_id.in_(batch_ids))
                .distinct()
                .all()
            }

            for interaction in batch:
                stats["total_processed"] += 1
                if interaction.id in existing_ids:
                    stats["total_skipped"] += 1
                    continue

                try:
                    cls._backfill_single_interaction(interaction, stats)
                except Exception:
                    logger.exception("Error backfilling interaction %s", interaction.id)
                    stats["total_errors"] += 1

            db.session.commit()
            logger.info(
                "strr.interactions.backfill_batch_committed processed=%s recipients_created=%s skipped=%s errors=%s",
                stats["total_processed"],
                stats["total_recipients_created"],
                stats["total_skipped"],
                stats["total_errors"],
            )

        return stats
