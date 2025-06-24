# Copyright © 2024 Province of British Columbia
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
"""This module provides Email type services."""
import logging
from typing import Optional

from flask import current_app

from strr_api.enums.enum import RegistrationStatus
from strr_api.models import Application, Registration
from strr_api.services import gcp_queue_publisher

logger = logging.getLogger("api")

APPLICATION_EMAIL_STATES = {
    Registration.RegistrationType.HOST: [
        Application.Status.AUTO_APPROVED,
        Application.Status.FULL_REVIEW_APPROVED,
        Application.Status.PROVISIONAL_REVIEW,
        Application.Status.PROVISIONALLY_APPROVED,
        Application.Status.PROVISIONALLY_DECLINED,
    ],
    Registration.RegistrationType.PLATFORM: [Application.Status.AUTO_APPROVED],
}

EMAIL_SOURCE = "strr-api"
EMAIL_TYPE = "strr.email"


class EmailService:
    """Service to handle email logic and to interact with the email queue."""

    @staticmethod
    def send_application_status_update_email(application: Application, custom_content: Optional[str] = None):
        """Send email notification for the application if applicable.

        Assumes the application.status has been changed."""
        if application.status in APPLICATION_EMAIL_STATES.get(application.registration_type, []):
            try:
                payload_data = {
                    "applicationNumber": application.application_number,
                    "emailType": f"{application.registration_type.value}_{application.status}",
                }
                if custom_content and application.status == Application.Status.PROVISIONALLY_DECLINED:
                    payload_data["customContent"] = custom_content
                gcp_queue_publisher.publish_to_queue(
                    # NOTE: if registrationType / status typing (str vs enum)
                    #       is updated in the model 'emailType' may need changes
                    gcp_queue_publisher.QueueMessage(
                        source=EMAIL_SOURCE,
                        message_type=EMAIL_TYPE,
                        payload=payload_data,
                        topic=current_app.config.get("GCP_EMAIL_TOPIC"),
                    )
                )
            except Exception as err:
                logger.error("Failed to publish email notification: %s", err.with_traceback(None))

    @staticmethod
    def send_notice_of_consideration_for_application(application: Application):
        """Send notice of consideration for the application."""
        try:
            gcp_queue_publisher.publish_to_queue(
                gcp_queue_publisher.QueueMessage(
                    source=EMAIL_SOURCE,
                    message_type=EMAIL_TYPE,
                    payload={
                        "applicationNumber": application.application_number,
                        "emailType": "PROVISIONAL_REVIEW_NOC"
                        if application.status == Application.Status.PROVISIONAL_REVIEW_NOC_PENDING
                        else "NOC",
                    },
                    topic=current_app.config.get("GCP_EMAIL_TOPIC"),
                )
            )
        except Exception as err:
            logger.error("Failed to publish email notification: %s", err.with_traceback(None))

    @staticmethod
    def send_set_aside_email(application: Application, email_content=None):
        """Send notice of consideration for the application."""
        try:
            gcp_queue_publisher.publish_to_queue(
                gcp_queue_publisher.QueueMessage(
                    source=EMAIL_SOURCE,
                    message_type=EMAIL_TYPE,
                    payload={
                        "applicationNumber": application.application_number,
                        "emailType": "SET_ASIDE",
                        "message": email_content,
                    },
                    topic=current_app.config.get("GCP_EMAIL_TOPIC"),
                )
            )
        except Exception as err:
            logger.error("Failed to publish email notification: %s", err.with_traceback(None))

    @staticmethod
    def send_registration_status_update_email(registration: Registration, email_content=None):
        """Send status update email for a registration."""
        if registration.status in [RegistrationStatus.CANCELLED] and email_content:
            try:
                gcp_queue_publisher.publish_to_queue(
                    gcp_queue_publisher.QueueMessage(
                        source=EMAIL_SOURCE,
                        message_type=EMAIL_TYPE,
                        payload={
                            "registrationNumber": registration.registration_number,
                            "emailType": f"{registration.registration_type}_REGISTRATION_{registration.status.name}",
                            "customContent": email_content,
                        },
                        topic=current_app.config.get("GCP_EMAIL_TOPIC"),
                    )
                )
            except Exception as err:
                logger.error("Failed to publish email notification: %s", err.with_traceback(None))
