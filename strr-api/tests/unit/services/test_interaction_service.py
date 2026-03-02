# Copyright © 2024 Province of British Columbia
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""Tests for the Interaction service.

Test suite to ensure that the Interaction service routines are working as expected.
"""
from http import HTTPStatus
from unittest.mock import patch

import pytest

from strr_api.exceptions import ExternalServiceException, ValidationException
from strr_api.models import CustomerInteraction
from strr_api.services import InteractionService
from strr_api.services.interaction import EmailInfo


def test_dispatch_valid_signature_mandatory():
    """Assert that mandatory parameters must be provided."""

    # missing channel_type, 1st parameter
    with pytest.raises(TypeError) as excinfo:
        InteractionService.dispatch()
    assert excinfo._excinfo[1].args[0] == "missing a required argument: 'channel_type'"

    # missing payload, 2nd paramter
    with pytest.raises(TypeError) as excinfo:
        InteractionService.dispatch(
            channel_type=CustomerInteraction.ChannelType.SMS,
        )
    assert excinfo._excinfo[1].args[0] == "missing a required argument: 'payload'"


def test_dispatch_valid_signature_optional(check):
    """Assert that mandatory parameters must be provided."""
    # Cannot have app/reg/customer
    with pytest.raises(ValueError) as excinfo:
        InteractionService.dispatch(
            channel_type=CustomerInteraction.ChannelType.SMS,
            payload={},
            customer_id=1,
            registration_id=1,
            application_id=1,
        )
    with check:
        assert (
            excinfo.value.args[0]
            == "Too many arguments provided. Allowed max: 1, Found: 3 (application_id, registration_id, customer_id)"
        )

    with pytest.raises(ValueError) as excinfo:
        InteractionService.dispatch(
            channel_type=CustomerInteraction.ChannelType.SMS,
            payload={},
            customer_id=1,
            registration_id=1,
            application_id=None,
        )
    with check:
        assert (
            excinfo.value.args[0]
            == "Too many arguments provided. Allowed max: 1, Found: 2 (application_id, registration_id, customer_id)"
        )

    with pytest.raises(ValueError) as excinfo:
        InteractionService.dispatch(
            channel_type=CustomerInteraction.ChannelType.SMS,
            payload={},
            customer_id=1,
            registration_id=None,
            application_id=1,
        )
    with check:
        assert (
            excinfo.value.args[0]
            == "Too many arguments provided. Allowed max: 1, Found: 2 (application_id, registration_id, customer_id)"
        )

    with pytest.raises(ValueError) as excinfo:
        InteractionService.dispatch(
            channel_type=CustomerInteraction.ChannelType.SMS,
            payload={},
            customer_id=None,
            registration_id=1,
            application_id=1,
        )
    with check:
        assert (
            excinfo.value.args[0]
            == "Too many arguments provided. Allowed max: 1, Found: 2 (application_id, registration_id, customer_id)"
        )


def test_dispatch_unsupported_channel():
    """Assert that an unsupported channel raises a ExternalServiceException."""
    with pytest.raises(ExternalServiceException) as excinfo:
        InteractionService.dispatch(
            registration_id=1,
            channel_type=CustomerInteraction.ChannelType.SMS,
            payload={},
        )
    assert excinfo.value.status_code == HTTPStatus.BAD_REQUEST
    assert excinfo.value.error == "'Unsupported channel type', 400"
    assert excinfo.value.message == "3rd party service error while processing request."


def test_dispatch_not_email_info():
    """Assert that an unsupported channel raises a ValidationException."""
    with pytest.raises(ValidationException) as excinfo:
        email_info = {}
        InteractionService.dispatch(
            registration_id=1,
            channel_type=CustomerInteraction.ChannelType.EMAIL,
            payload=email_info,
        )
    assert excinfo.value.status_code == HTTPStatus.BAD_REQUEST
    assert excinfo.value.error == "Validation Error"


@pytest.mark.conf(NOTIFY_SVC_URL="dummy", NOTIFY_API_TIMEOUT=30)
@patch("strr_api.services.auth_service.AuthService.get_service_client_token", return_value="dummy_token")
@patch("strr_api.services.interaction.requests.post")
def test_dispatch_email_interaction_success(mock_requests_post, mock_get_token, session, setup_parents, inject_config):
    """Assert that an email interaction can be dispatched successfully."""
    mock_requests_post.return_value.status_code = HTTPStatus.OK
    mock_requests_post.return_value.json.return_value = {"id": 123}

    email_info = EmailInfo(application_number="123", email_type="HOST_RENEWAL_REMINDER", custom_content="some content")
    application_id = setup_parents["application_id"]
    registration_id = None
    customer_id = None
    user_id = setup_parents["user_id"]

    interaction = InteractionService.dispatch(
        channel_type=CustomerInteraction.ChannelType.EMAIL,
        payload=email_info,
        application_id=application_id,
        registration_id=registration_id,
        customer_id=customer_id,
        user_id=user_id,
    )

    mock_get_token.assert_called_once()
    mock_requests_post.assert_called_once()
    assert interaction.application_id == application_id
    assert interaction.registration_id == registration_id
    assert interaction.customer_id == customer_id
    assert interaction.user_id == user_id
    assert interaction.channel == CustomerInteraction.ChannelType.EMAIL
    assert interaction.notify_reference == "123"

    # verify it's in the db
    db_interaction = session.query(CustomerInteraction).filter(CustomerInteraction.id == interaction.id).one_or_none()
    assert db_interaction is not None
    assert db_interaction.notify_reference == "123"


@pytest.mark.conf(NOTIFY_SVC_URL="dummy", NOTIFY_API_TIMEOUT=30)
@patch("strr_api.services.auth_service.AuthService.get_service_client_token", return_value="dummy_token")
@patch("strr_api.services.interaction.requests.post")
def test_dispatch_email_interaction_failure_zero_id(
    mock_requests_post, mock_get_token, app, session, setup_parents, inject_config
):
    """Assert that email interaction fails when notify_reference id is 0."""
    mock_requests_post.return_value.status_code = HTTPStatus.OK
    mock_requests_post.return_value.json.return_value = {"id": 0}  # Simulate failure with id = 0

    email_info = EmailInfo(application_number="123", email_type="TEST", custom_content="some content")

    with pytest.raises(ExternalServiceException) as excinfo:
        InteractionService.dispatch(
            registration_id=setup_parents["registration_id"],
            channel_type=CustomerInteraction.ChannelType.EMAIL,
            payload=email_info,
        )

    mock_get_token.assert_called_once()
    mock_requests_post.assert_called_once()
    assert excinfo.value.status_code == HTTPStatus.BAD_REQUEST
    assert excinfo.value.error == "'Email not sent', 400"


@pytest.mark.conf(NOTIFY_SVC_URL="dummy", NOTIFY_API_TIMEOUT=30)
@patch("strr_api.services.auth_service.AuthService.get_service_client_token", return_value="dummy_token")
@patch("strr_api.services.interaction.requests.post")
def test_dispatch_email_interaction_failure_none_id(
    mock_requests_post, mock_get_token, session, setup_parents, inject_config, authed_g
):
    """Assert that email interaction fails when notify_reference is None."""
    mock_requests_post.return_value.status_code = HTTPStatus.BAD_REQUEST
    mock_requests_post.return_value.json.return_value = {"message": "error"}  # Simulate http error

    email_info = EmailInfo(application_number="123", email_type="TEST", custom_content="some content")

    with pytest.raises(ExternalServiceException) as excinfo:
        InteractionService.dispatch(
            registration_id=setup_parents["registration_id"],
            channel_type=CustomerInteraction.ChannelType.EMAIL,
            payload=email_info,
        )

    mock_get_token.assert_called_once()
    mock_requests_post.assert_called_once()
    assert excinfo.value.status_code == HTTPStatus.BAD_REQUEST
    assert excinfo.value.error == "'Email not sent', 400"
