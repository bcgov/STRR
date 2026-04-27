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
import uuid
from dataclasses import dataclass
from http import HTTPStatus
from typing import overload

import requests
from flask import current_app, jsonify

from strr_api.enums.enum import ChannelType, InteractionStatus
from strr_api.exceptions import ExternalServiceException, ValidationException
from strr_api.models import CustomerInteraction, Events
from strr_api.services import AuthService
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

    email_event_mapper = {
        "HOST_RENEWAL_REMINDER": Events.EventName.RENEWAL_REMINDER_SENT,
        "STRATA_HOTEL_RENEWAL_REMINDER": Events.EventName.RENEWAL_REMINDER_SENT,
        "PLATFORM_RENEWAL_REMINDER": Events.EventName.RENEWAL_REMINDER_SENT,
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
        the_type = type(payload)
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
            or not (notify_id := notify_json.get("id"))
            or (isinstance(notify_id, (int, float)) and notify_id < 1)
        ):
            raise ExternalServiceException(error="Email not sent", status_code=HTTPStatus.BAD_REQUEST)

        if not (interaction := CustomerInteraction.find_by_uuid(interaction_uuid)):
            interaction = CustomerInteraction()
        interaction.channel = channel_type
        interaction.status = InteractionStatus.SENT
        interaction.application_id = application_id
        interaction.registration_id = registration_id
        interaction.customer_id = customer_id
        interaction.user_id = user_id
        interaction.notify_reference = notify_json.get("ids") or notify_id
        interaction.idempotency_key = idempotency_key
        interaction.save()

        event_type = (
            Events.EventType.REGISTRATION
            if registration_id
            else Events.EventType.APPLICATION
            if application_id
            else Events.EventType.USER
        )
        event_name = InteractionService.email_event_mapper[payload.email_type]

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
        )
        interaction.save()
        return interaction.interaction_uuid

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
            return InteractionService._post_email_to_notify(email_info.email)

        success_ids: list = []
        last_result: dict = {"id": -1}
        for recipient in recipients:
            single_email = {**email, "recipients": recipient}
            result = InteractionService._post_email_to_notify(single_email)
            notify_id = result.get("id") if isinstance(result, dict) else None
            if notify_id and not (isinstance(notify_id, (int, float)) and notify_id < 1):
                success_ids.append(notify_id)
                last_result = result

        if not success_ids:
            return {"id": -1}

        combined_ids = ",".join(str(i) for i in success_ids)[:100]
        return {**last_result, "id": success_ids[0], "ids": combined_ids}

    @staticmethod
    def _post_email_to_notify(email_payload):
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
            current_app.logger.error(f"Email error, {err}")
            return {"id": -1}

        if resp.status_code not in [HTTPStatus.OK, HTTPStatus.ACCEPTED, HTTPStatus.CREATED]:
            current_app.logger.info(f"Error {resp.status_code} - {str(resp.json())}")
            return {"id": -1}

        return resp.json()
