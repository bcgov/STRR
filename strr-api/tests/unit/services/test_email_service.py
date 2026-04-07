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
"""Tests to assure the Email service.

Test-Suite to ensure that the Email Service is working as expected.
"""
import json
import os
import random
from unittest.mock import ANY, MagicMock, patch

import pytest
from dotenv import load_dotenv
from gcp_queue.gcp_queue import GcpQueue

from strr_api import create_app
from strr_api.enums.enum import ChannelType
from strr_api.models import Application, Registration, User
from strr_api.services import ApplicationService
from strr_api.services.email_service import EmailService
from strr_api.services.interaction import EmailInfo

HOST_REGISTRATION_JSON = os.path.join(
    os.path.dirname(os.path.realpath(__file__)), "../../mocks/json/host_registration.json"
)


@pytest.fixture()
def mock_publisher_client():
    """Mock the PublisherClient used in GcpQueue."""
    with patch("google.cloud.pubsub_v1.PublisherClient") as publisher:
        yield publisher.return_value


@pytest.fixture()
def mock_credentials():
    """Mock Credentials."""
    with patch("google.auth.jwt.Credentials") as mock:
        mock.from_service_account_info.return_value = MagicMock()
        yield mock


@pytest.mark.parametrize(
    "registration_type, status, expect_email",
    [
        (
            Registration.RegistrationType.HOST,
            Application.Status.FULL_REVIEW_APPROVED,
            True,
        ),
        (
            Registration.RegistrationType.HOST,
            Application.Status.AUTO_APPROVED,
            True,
        ),
        (
            Registration.RegistrationType.HOST,
            Application.Status.PROVISIONAL_REVIEW,
            True,
        ),
        (
            Registration.RegistrationType.HOST,
            Application.Status.DECLINED,
            True,
        ),
        (
            Registration.RegistrationType.HOST,
            Application.Status.FULL_REVIEW,
            False,
        ),
        (
            Registration.RegistrationType.PLATFORM,
            Application.Status.AUTO_APPROVED,
            True,
        ),
        (
            Registration.RegistrationType.PLATFORM,
            Application.Status.PAID,
            False,
        ),
        (
            Registration.RegistrationType.STRATA_HOTEL,
            Application.Status.FULL_REVIEW_APPROVED,
            False,
        ),
    ],
)
def test_email_queue_publish(app, mock_publisher_client, mock_credentials, registration_type, status, expect_email):
    """Test that the email service calls the publisher service as expected."""
    orig_topic = app.config["GCP_EMAIL_TOPIC"]
    app.config["GCP_EMAIL_TOPIC"] = "test"
    with patch.object(GcpQueue, "publish") as mock_publisher:
        with app.app_context():
            # init fake staff user
            user = User(
                username="testUser",
                firstname="Test",
                lastname="User",
                iss="test",
                sub=f"sub{random.randint(0, 99999)}",
                idp_userid="testUserID",
                login_source="testLogin",
            )
            user.save()
            # init fake application
            application = Application()
            application.registration_type = registration_type
            application.status = status
            application.application_number = Application.generate_unique_application_number()
            application.application_json = {"fake": "lala"}
            application.submitter_id = user.id
            application.payment_account = 1
            application.type = "registration"
            application.save()
            # update status and check email trigger
            EmailService.send_application_status_update_email(application)
            if expect_email:
                mock_publisher.assert_called_once_with("test", ANY)
            else:
                mock_publisher.publish.assert_not_called()

    # set back to original topic
    app.config["GCP_EMAIL_TOPIC"] = orig_topic


@patch("strr_api.services.email_service.gcp_queue_publisher.publish_to_queue")
@patch("strr_api.services.InteractionService.queued", return_value="queued-uuid")
def test_send_renewal_reminder_passes_job_key_to_queue(
    mock_queued,
    mock_publish,
    app,
):
    """Renewal reminders should keep the job key on the queued interaction and queue message."""
    original_topic = app.config["GCP_EMAIL_TOPIC"]
    app.config["GCP_EMAIL_TOPIC"] = "test-topic"
    registration = MagicMock(
        id=123,
        registration_number="H1234567",
        registration_type=Registration.RegistrationType.HOST,
    )
    job_key = "2026:RENEWAL_REMINDER:40"

    try:
        with app.app_context():
            EmailService.send_renewal_reminder_for_registration(
                registration=registration,
                interaction=job_key,
            )
    finally:
        app.config["GCP_EMAIL_TOPIC"] = original_topic

    mock_queued.assert_called_once()
    queued_kwargs = mock_queued.call_args.kwargs
    assert queued_kwargs["channel_type"] == ChannelType.EMAIL
    assert queued_kwargs["idempotency_key"] == job_key
    assert queued_kwargs["registration_id"] == registration.id
    assert isinstance(queued_kwargs["payload"], EmailInfo)
    assert queued_kwargs["payload"].email_type == "HOST_RENEWAL_REMINDER"
    assert queued_kwargs["payload"].registration_number == registration.registration_number
    assert queued_kwargs["payload"].interaction == job_key

    mock_publish.assert_called_once()
    queue_message = mock_publish.call_args.args[0]
    assert queue_message.topic == "test-topic"
    assert queue_message.payload["registrationNumber"] == registration.registration_number
    assert queue_message.payload["emailType"] == "HOST_RENEWAL_REMINDER"
    assert queue_message.payload["interaction"] == job_key
    assert queue_message.payload["interaction_uuid"] == "queued-uuid"


@patch("strr_api.services.email_service.gcp_queue_publisher.publish_to_queue", side_effect=RuntimeError("boom"))
@patch("strr_api.services.email_service.CustomerInteraction.find_by_uuid")
@patch("strr_api.services.InteractionService.queued", return_value="queued-uuid")
def test_send_renewal_reminder_removes_orphaned_queue_record(
    mock_queued,
    mock_find_by_uuid,
    mock_publish,
    app,
):
    """A failed queue publish should not leave a queued checkpoint behind."""
    original_topic = app.config["GCP_EMAIL_TOPIC"]
    app.config["GCP_EMAIL_TOPIC"] = "test-topic"
    registration = MagicMock(
        id=123,
        registration_number="H1234567",
        registration_type=Registration.RegistrationType.HOST,
    )
    queued_interaction = MagicMock()
    mock_find_by_uuid.return_value = queued_interaction

    try:
        with app.app_context():
            EmailService.send_renewal_reminder_for_registration(
                registration=registration,
                interaction="2026:RENEWAL_REMINDER:40",
            )
    finally:
        app.config["GCP_EMAIL_TOPIC"] = original_topic

    mock_queued.assert_called_once()
    mock_publish.assert_called_once()
    mock_find_by_uuid.assert_called_once_with("queued-uuid")
    queued_interaction.delete.assert_called_once()
