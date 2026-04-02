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
            or (notify_id < 1)
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
        interaction.notify_reference = notify_id
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
        try:
            token = AuthService.get_service_client_token()
        except requests.RequestException as err:
            current_app.logger.error(f"Email auth error, {err}")
            raise ExternalServiceException(
                error="Email service token unavailable",
                status_code=HTTPStatus.SERVICE_UNAVAILABLE,
            ) from err

        if not token:
            raise ExternalServiceException(
                error="Email service token unavailable",
                status_code=HTTPStatus.SERVICE_UNAVAILABLE,
            )

        try:
            resp = requests.post(
                current_app.config["NOTIFY_SVC_URL"],
                json=email_info.email,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {token}",
                },
                timeout=current_app.config["NOTIFY_API_TIMEOUT"],
            )
        except requests.RequestException as err:
            current_app.logger.error(f"Email error, {err}")
            raise ExternalServiceException(
                error="Email service unavailable",
                status_code=HTTPStatus.SERVICE_UNAVAILABLE,
            ) from err

        if resp.status_code not in [HTTPStatus.OK, HTTPStatus.ACCEPTED, HTTPStatus.CREATED]:
            current_app.logger.info(f"Error {resp.status_code} - {str(resp.json())}")
            raise ExternalServiceException(
                error="Email not sent",
                status_code=resp.status_code,
            )

        return resp.json()
