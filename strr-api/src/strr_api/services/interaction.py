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
import uuid
from dataclasses import dataclass
from http import HTTPStatus
from typing import overload

import requests
from flask import current_app

from strr_api.enums.enum import ChannelType, InteractionStatus
from strr_api.exceptions import ExternalServiceException, ValidationException
from strr_api.models import CustomerInteraction, Events
from strr_api.services.auth_service import AuthService
from strr_api.services.events_service import EventsService
from strr_api.utils.validate_calls import validate_mutex


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
        "SENDING": "IN_TRANSIT",
        "SENT": "SENT",
        "PENDING": "PENDING",
        "DELIVERED": "DELIVERED",
        "PENDING_VIRUS_CHECK": "PENDING",
        "PERMANENT_FAILURE": "FAILED",
        "TEMPORARY_FAILURE": "FAILED",
        "TECHNICAL_FAILURE": "FAILED",
        "VIRUS_SCAN_FAILED": "FAILED",
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
        rows: list[dict] = []
        for interaction in interactions:
            if row := cls._build_delivery_row(interaction, event_type):
                rows.append(row)
        return rows

    @staticmethod
    def _message_for_delivery_status(channel: str, status: str) -> str:
        """Create a readable filing-history message for interaction delivery rows."""
        channel_label = channel.capitalize()
        status_label = status.capitalize()
        return f"{channel_label} delivery status updated ({status_label})."

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
    def _normalize_recipient_statuses(recipient_statuses: dict) -> list[dict]:
        """Normalize stored recipient statuses to API response array shape."""
        normalized = []
        for notify_reference, payload in recipient_statuses.items():
            row = payload if isinstance(payload, dict) else {}
            provider_status = row.get("status")
            normalized.append(
                {
                    "email_address": row.get("email_address"),
                    "failure_reason": row.get("failure_reason"),
                    "failure_type": row.get("failure_type"),
                    "notify_reference": row.get("notify_reference") or str(notify_reference),
                    "provider_reference": row.get("provider_reference"),
                    "request_date": row.get("request_date"),
                    "sent_date": row.get("sent_date"),
                    "status": InteractionService._map_recipient_delivery_status(provider_status),
                    "provider_status": provider_status,
                }
            )
        return normalized

    @classmethod
    def _build_delivery_row(cls, interaction: CustomerInteraction, event_type: str) -> dict | None:
        """Convert a single interaction row into filing-history event shape."""
        if not isinstance(interaction.meta_data, dict):
            return None

        notify_delivery = interaction.meta_data.get("notify_delivery")
        if not isinstance(notify_delivery, dict):
            return None

        recipient_statuses = notify_delivery.get("recipient_statuses")
        if not isinstance(recipient_statuses, dict) or not recipient_statuses:
            return None

        channel = interaction.channel.value if interaction.channel else ""
        if channel != ChannelType.EMAIL.value:
            return None
        status = interaction.status.value if interaction.status else ""

        return {
            "eventType": event_type,
            "eventName": cls._event_name_for_status(status),
            "message": cls._message_for_delivery_status(channel, status),
            "createdDate": interaction.created_at.isoformat() if interaction.created_at else None,
            "details": None,
            "structuredDetails": {
                "channel": channel,
                "emailType": interaction.meta_data.get("email_type"),
                "interactionStatus": status,
                "recipientStatusUpdatedAt": notify_delivery.get("updated_at"),
                "recipientStatuses": cls._normalize_recipient_statuses(recipient_statuses),
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
    ):
        """Dispatch interaction."""
        match channel_type:
            case ChannelType.EMAIL:
                if not isinstance(payload, EmailInfo):
                    raise ValidationException(error="Invalid EmailInfo", status_code=HTTPStatus.BAD_REQUEST)
                notify_json = InteractionService._send_email_to_notify_service(payload)

            case _:
                raise ExternalServiceException(error="Unsupported channel type", status_code=HTTPStatus.BAD_REQUEST)

        if (
            not notify_json
            or not isinstance(notify_json, dict)
            or not InteractionService._valid_notify_id(notify_json.get("id"))
        ):
            InteractionService._save_interaction(
                channel_type=channel_type,
                payload=payload,
                status=InteractionStatus.FAILED,
                idempotency_key=idempotency_key,
                interaction_uuid=interaction_uuid,
                user_id=user_id,
                application_id=application_id,
                registration_id=registration_id,
                customer_id=customer_id,
                notify_json=notify_json if isinstance(notify_json, dict) else None,
            )
            raise ExternalServiceException(error="Email not sent", status_code=HTTPStatus.BAD_REQUEST)

        interaction = InteractionService._save_interaction(
            channel_type=channel_type,
            payload=payload,
            status=InteractionStatus.SENT,
            idempotency_key=idempotency_key,
            interaction_uuid=interaction_uuid,
            user_id=user_id,
            application_id=application_id,
            registration_id=registration_id,
            customer_id=customer_id,
            notify_json=notify_json,
        )

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
    ):
        interaction = CustomerInteraction(
            channel=channel_type,
            status=InteractionStatus.QUEUED,
            application_id=application_id,
            registration_id=registration_id,
            customer_id=customer_id,
            user_id=user_id,
            idempotency_key=idempotency_key,
            body_content=InteractionService._body_content(payload),
            meta_data=InteractionService._interaction_metadata(
                payload=payload,
                status=InteractionStatus.QUEUED,
                application_id=application_id,
                registration_id=registration_id,
                customer_id=customer_id,
            ),
        )
        interaction.save()
        return interaction.interaction_uuid

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
    ):
        """Create or update the tracked interaction row for an outbound message."""
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
        interaction.save()
        if status == InteractionStatus.FAILED:
            notify_error = None
            notify_status_code = None
            if isinstance(notify_json, dict):
                notify_error = notify_json.get("error")
                notify_status_code = notify_json.get("status_code")
            current_app.logger.warning(
                "strr.interactions.failed_detected interaction_status=FAILED interaction_uuid=%s email_type=%s "
                "target_entity=%s target_id=%s application_number=%s registration_number=%s "
                "notify_status_code=%s notify_error=%s",
                interaction.interaction_uuid,
                meta_data.get("email_type"),
                meta_data.get("target_entity"),
                meta_data.get("target_id"),
                meta_data.get("application_number"),
                meta_data.get("registration_number"),
                notify_status_code,
                notify_error,
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
        if notify_json:
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
    def _send_email_to_notify_service(email_info):
        """Send an email via the notify-api.

        When the email has multiple recipients, dispatch a separate notify request
        per recipient so a single malformed address cannot block delivery to the
        rest of the recipients.
        """
        email = email_info.email if isinstance(email_info.email, dict) else None
        raw_recipients = (email or {}).get("recipients") if email else None
        recipients = [r.strip() for r in (raw_recipients or "").split(",") if r.strip()]

        if len(recipients) <= 1:
            return InteractionService._post_email_to_notify(email_info.email, email_info)

        success_ids: list = []
        last_result: dict = {"id": -1}
        for recipient in recipients:
            single_email = {**email, "recipients": recipient}
            result = InteractionService._post_email_to_notify(single_email, email_info)
            notify_id = result.get("id") if isinstance(result, dict) else None
            if InteractionService._valid_notify_id(notify_id):
                success_ids.append(notify_id)
                last_result = result

        if not success_ids:
            return {"id": -1}

        combined_ids = ",".join(str(i) for i in success_ids)[:100]
        return {**last_result, "id": success_ids[0], "ids": combined_ids}

    @staticmethod
    def _post_email_to_notify(email_payload, email_info: EmailInfo | None = None):
        """Post a single email payload to the notify-api."""
        token = AuthService.get_service_client_token()
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
                "email_type=%s application_number=%s registration_number=%s interaction_uuid=%s",
                getattr(email_info, "email_type", None),
                getattr(email_info, "application_number", None),
                getattr(email_info, "registration_number", None),
                getattr(email_info, "interaction_uuid", None),
            )
            return {"id": -1, "error": str(err)}

        if resp.status_code not in [HTTPStatus.OK, HTTPStatus.ACCEPTED, HTTPStatus.CREATED]:
            try:
                response_body = resp.json()
            except Exception:  # pragma: no cover - defensive for malformed downstream responses
                response_body = getattr(resp, "text", "")
            current_app.logger.info(f"Error {resp.status_code} - {str(response_body)}")
            current_app.logger.error(
                "strr.email.notify.failed Error posting email to notify-api "
                "email_type=%s application_number=%s registration_number=%s interaction_uuid=%s status_code=%s "
                "notify_error=%s",
                getattr(email_info, "email_type", None),
                getattr(email_info, "application_number", None),
                getattr(email_info, "registration_number", None),
                getattr(email_info, "interaction_uuid", None),
                resp.status_code,
                response_body,
            )
            return {"id": -1, "status_code": resp.status_code, "error": response_body}

        return resp.json()
