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
from sqlalchemy import select

from strr_api import create_app
from strr_api.enums.enum import InteractionStatus
from strr_api.models import Application, CustomerInteraction, Registration, User
from strr_api.services import ApplicationService
from strr_api.services.email_service import EmailService

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


@pytest.mark.conf(GCP_EMAIL_TOPIC="test")
def test_send_renewal_reminder_queues_interaction_and_publishes_payload(
    session, setup_parents_committed, inject_config
):
    """Test that renewal reminders preserve the queued interaction key in the event."""
    registration = session.get(Registration, setup_parents_committed["registration_id"])
    job_key = "2026:RENEWAL_REMINDER:40"

    with patch("strr_api.services.email_service.gcp_queue_publisher.publish_to_queue") as mock_publish:
        EmailService.send_renewal_reminder_for_registration(registration=registration, interaction=job_key)

    mock_publish.assert_called_once()
    queue_message = mock_publish.call_args.args[0]
    payload = queue_message.payload

    assert queue_message.topic == "test"
    assert payload["registrationNumber"] == registration.registration_number
    assert payload["emailType"] == "HOST_RENEWAL_REMINDER"
    assert payload["interaction"] == job_key
    assert payload["interaction_uuid"]

    stored = session.scalar(
        select(CustomerInteraction).where(CustomerInteraction.interaction_uuid == payload["interaction_uuid"])
    )

    assert stored.registration_id == registration.id
    assert stored.idempotency_key == job_key
    assert stored.status == InteractionStatus.QUEUED


@pytest.mark.conf(GCP_EMAIL_TOPIC="test")
def test_send_renewal_reminder_logs_publish_failure(session, setup_parents_committed, inject_config):
    """Test that renewal reminder publish failures are logged without changing queued tracking."""
    registration = session.get(Registration, setup_parents_committed["registration_id"])
    job_key = "2026:RENEWAL_REMINDER:41"

    with (
        patch(
            "strr_api.services.email_service.gcp_queue_publisher.publish_to_queue",
            side_effect=RuntimeError("publish failed"),
        ),
        patch("strr_api.services.email_service.logger.error") as mock_logger,
    ):
        EmailService.send_renewal_reminder_for_registration(registration=registration, interaction=job_key)

    stored = session.scalar(select(CustomerInteraction).where(CustomerInteraction.idempotency_key == job_key))

    assert stored.registration_id == registration.id
    assert stored.status == InteractionStatus.QUEUED
    mock_logger.assert_called_once()
    assert mock_logger.call_args.args[0] == "Failed to publish email notification: %s"
    assert str(mock_logger.call_args.args[1]) == "publish failed"


@pytest.mark.parametrize(
    ("status", "expected_email_type"),
    [
        (Application.Status.PROVISIONAL_REVIEW_NOC_PENDING, "PROVISIONAL_REVIEW_NOC"),
        (Application.Status.AUTO_APPROVED, "NOC"),
    ],
)
@pytest.mark.conf(GCP_EMAIL_TOPIC="test")
def test_send_notice_of_consideration_for_application_publishes_payload(
    app, status, expected_email_type, inject_config
):
    """Test that application notice-of-consideration emails publish the expected payload."""
    application = Application()
    application.application_number = "A-123456"
    application.status = status

    with app.app_context():
        with patch("strr_api.services.email_service.gcp_queue_publisher.publish_to_queue") as mock_publish:
            EmailService.send_notice_of_consideration_for_application(application)

    mock_publish.assert_called_once()
    queue_message = mock_publish.call_args.args[0]

    assert queue_message.topic == "test"
    assert queue_message.payload == {
        "applicationNumber": "A-123456",
        "emailType": expected_email_type,
    }


@pytest.mark.conf(GCP_EMAIL_TOPIC="test")
def test_send_registration_status_update_email_publishes_payload(session, setup_parents, inject_config):
    """Test that registration status emails publish the expected payload."""
    registration = session.get(Registration, setup_parents["registration_id"])
    interaction = "2026:REGISTRATION_STATUS:41"

    with patch("strr_api.services.email_service.gcp_queue_publisher.publish_to_queue") as mock_publish:
        EmailService.send_registration_status_update_email(
            registration=registration,
            email_content="message body",
            interaction=interaction,
        )

    mock_publish.assert_called_once()
    queue_message = mock_publish.call_args.args[0]

    assert queue_message.topic == "test"
    assert queue_message.payload == {
        "registrationNumber": registration.registration_number,
        "emailType": "HOST_REGISTRATION_ACTIVE",
        "customContent": "message body",
        "interaction": interaction,
    }


@pytest.mark.conf(GCP_EMAIL_TOPIC="test")
def test_send_registration_status_update_email_skips_non_notifiable_status(session, setup_parents, inject_config):
    """Test that non-notifiable registration statuses do not publish emails."""
    registration = session.get(Registration, setup_parents["registration_id"])
    registration.status = "EXPIRED"

    with patch("strr_api.services.email_service.gcp_queue_publisher.publish_to_queue") as mock_publish:
        EmailService.send_registration_status_update_email(registration=registration)

    mock_publish.assert_not_called()


@pytest.mark.conf(GCP_EMAIL_TOPIC="test")
def test_send_notice_of_consideration_for_registration_publishes_payload(session, setup_parents, inject_config):
    """Test that registration NOC emails publish the expected payload."""
    registration = session.get(Registration, setup_parents["registration_id"])

    with patch("strr_api.services.email_service.gcp_queue_publisher.publish_to_queue") as mock_publish:
        EmailService.send_notice_of_consideration_for_registration(registration=registration)

    mock_publish.assert_called_once()
    queue_message = mock_publish.call_args.args[0]

    assert queue_message.topic == "test"
    assert queue_message.payload == {
        "registrationNumber": registration.registration_number,
        "emailType": "REGISTRATION_NOC",
    }


@pytest.mark.conf(GCP_EMAIL_TOPIC="test")
def test_send_notice_of_consideration_for_application_logs_publish_failure(app, inject_config):
    """Test that application NOC publish failures are logged."""
    application = Application()
    application.application_number = "A-999991"
    application.status = Application.Status.AUTO_APPROVED

    with app.app_context():
        with (
            patch(
                "strr_api.services.email_service.gcp_queue_publisher.publish_to_queue",
                side_effect=RuntimeError("publish failed"),
            ),
            patch("strr_api.services.email_service.logger.error") as mock_logger,
        ):
            EmailService.send_notice_of_consideration_for_application(application)

    mock_logger.assert_called_once()
    assert mock_logger.call_args.args[0] == "Failed to publish email notification: %s"
    assert str(mock_logger.call_args.args[1]) == "publish failed"


@pytest.mark.conf(GCP_EMAIL_TOPIC="test")
def test_send_notice_of_consideration_for_registration_logs_publish_failure(session, setup_parents, inject_config):
    """Test that registration NOC publish failures are logged."""
    registration = session.get(Registration, setup_parents["registration_id"])

    with (
        patch(
            "strr_api.services.email_service.gcp_queue_publisher.publish_to_queue",
            side_effect=RuntimeError("publish failed"),
        ),
        patch("strr_api.services.email_service.logger.error") as mock_logger,
    ):
        EmailService.send_notice_of_consideration_for_registration(registration=registration)

    mock_logger.assert_called_once()
    assert mock_logger.call_args.args[0] == "Failed to publish email notification: %s"
    assert str(mock_logger.call_args.args[1]) == "publish failed"


@pytest.mark.conf(GCP_EMAIL_TOPIC="test")
def test_send_set_aside_email_publishes_payload(app, inject_config):
    """Test that set-aside emails publish the expected payload."""
    application = Application()
    application.application_number = "A-654321"

    with app.app_context():
        with patch("strr_api.services.email_service.gcp_queue_publisher.publish_to_queue") as mock_publish:
            EmailService.send_set_aside_email(application, email_content="set aside body")

    mock_publish.assert_called_once()
    queue_message = mock_publish.call_args.args[0]

    assert queue_message.topic == "test"
    assert queue_message.payload == {
        "applicationNumber": "A-654321",
        "emailType": "SET_ASIDE",
        "message": "set aside body",
    }


@pytest.mark.conf(GCP_EMAIL_TOPIC="test")
def test_send_set_aside_email_logs_publish_failure(app, inject_config):
    """Test that set-aside publish failures are logged."""
    application = Application()
    application.application_number = "A-999992"

    with app.app_context():
        with (
            patch(
                "strr_api.services.email_service.gcp_queue_publisher.publish_to_queue",
                side_effect=RuntimeError("publish failed"),
            ),
            patch("strr_api.services.email_service.logger.error") as mock_logger,
        ):
            EmailService.send_set_aside_email(application, email_content="set aside body")

    mock_logger.assert_called_once()
    assert mock_logger.call_args.args[0] == "Failed to publish email notification: %s"
    assert str(mock_logger.call_args.args[1]) == "publish failed"


@pytest.mark.conf(GCP_EMAIL_TOPIC="test")
def test_send_application_status_update_email_includes_custom_content(app, inject_config):
    """Test that declined application status emails include custom content."""
    application = Application()
    application.registration_type = Registration.RegistrationType.HOST
    application.status = Application.Status.DECLINED
    application.application_number = "A-777777"

    with app.app_context():
        with patch("strr_api.services.email_service.gcp_queue_publisher.publish_to_queue") as mock_publish:
            EmailService.send_application_status_update_email(application, custom_content="decline details")

    mock_publish.assert_called_once()
    queue_message = mock_publish.call_args.args[0]

    assert queue_message.topic == "test"
    assert queue_message.payload == {
        "applicationNumber": "A-777777",
        "emailType": "HOST_DECLINED",
        "customContent": "decline details",
    }


@pytest.mark.conf(GCP_EMAIL_TOPIC="test")
def test_send_application_status_update_email_logs_publish_failure(app, inject_config):
    """Test that application status email publish failures are logged."""
    application = Application()
    application.registration_type = Registration.RegistrationType.HOST
    application.status = Application.Status.AUTO_APPROVED
    application.application_number = "A-888888"

    with app.app_context():
        with (
            patch(
                "strr_api.services.email_service.gcp_queue_publisher.publish_to_queue",
                side_effect=RuntimeError("publish failed"),
            ),
            patch("strr_api.services.email_service.logger.error") as mock_logger,
        ):
            EmailService.send_application_status_update_email(application)

    mock_logger.assert_called_once()
    assert mock_logger.call_args.args[0] == "Failed to publish email notification: %s"
    assert str(mock_logger.call_args.args[1]) == "publish failed"
