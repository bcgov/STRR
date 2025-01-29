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
"""Tests to assure the GCP service layer.

Test-Suite to ensure that the GCP Queue Service layer is working as expected.
"""
import json
import os
import random
from unittest.mock import ANY, MagicMock, patch

import pytest
from dotenv import load_dotenv
from gcp_queue.gcp_queue import GcpQueue

from strr_api import create_app
from strr_api.models import Application, Registration, User
from strr_api.services import ApplicationService
from strr_api.services.gcp_queue_publisher import QueueMessage, publish_to_queue

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


def test_publish_to_queue_success(app, mock_credentials, mock_publisher_client):
    """Test publishing to GCP PubSub Queue successfully."""
    with patch.object(GcpQueue, "publish") as mock_publisher:
        with app.app_context():
            queue_message = QueueMessage(
                source="test-source",
                message_type="test-message-type",
                payload={"key": "value"},
                topic="projects/project-id/topics/topic",
            )

            publish_to_queue(queue_message)
            mock_publisher.assert_called_once_with("projects/project-id/topics/topic", ANY)


def test_publish_to_queue_no_topic(app, mock_credentials, mock_publisher_client):
    """Test that publish_to_queue does not publish if no topic is set."""
    with patch.object(GcpQueue, "publish") as mock_publisher:
        with app.app_context():
            queue_message = QueueMessage(
                source="test-source",
                message_type="test-message-type",
                payload={"key": "value"},
                topic=None,
            )
            publish_to_queue(queue_message)
            mock_publisher.publish.assert_not_called()


@pytest.mark.parametrize(
    "registration_type, old_status, new_status, expect_email",
    [
        (
            Registration.RegistrationType.HOST,
            Application.Status.FULL_REVIEW,
            Application.Status.FULL_REVIEW_APPROVED,
            True,
        )
    ],
)
def test_gcp_publish_on_status_change(
    app, mock_credentials, mock_publisher_client, registration_type, old_status, new_status, expect_email
):
    """Test that application status updates trigger an email notification when necessary."""
    orig_topic = app.config["GCP_EMAIL_TOPIC"]
    app.config["GCP_EMAIL_TOPIC"] = "test"
    with patch.object(GcpQueue, "publish") as mock_publisher:
        with app.app_context():
            # FUTURE: when adding tests for other registration types update this based on registration_type
            with open(HOST_REGISTRATION_JSON) as f:
                # init fake staff user
                staff_user = User(
                    username="testUser",
                    firstname="Test",
                    lastname="User",
                    iss="test",
                    sub=f"subStaffEmail{random.randint(0, 99999)}",
                    idp_userid="testUserID",
                    login_source="testLogin",
                )
                staff_user.save()
                # init fake application
                application = Application()
                application.registration_type = registration_type
                application.status = old_status
                application.application_number = Application.generate_unique_application_number()
                application.application_json = json.load(f)
                application.submitter_id = staff_user.id
                application.payment_account = 1
                application.type = "registration"
                application.save()
                # update status and check email trigger
                ApplicationService.update_application_status(application, new_status, staff_user)
                if expect_email:
                    mock_publisher.assert_called_once_with("test", ANY)
                else:
                    mock_publisher.publish.assert_not_called()
    # set back to original topic
    app.config["GCP_EMAIL_TOPIC"] = orig_topic
