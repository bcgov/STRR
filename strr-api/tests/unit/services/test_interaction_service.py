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
from unittest.mock import MagicMock, patch

import pytest

from strr_api.enums.enum import ChannelType, InteractionStatus
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
            channel_type=ChannelType.SMS,
        )
    assert excinfo._excinfo[1].args[0] == "missing a required argument: 'payload'"


def test_dispatch_valid_signature_optional(check):
    """Assert that mandatory parameters must be provided."""
    # Cannot have app/reg/customer
    with pytest.raises(ValueError) as excinfo:
        InteractionService.dispatch(
            channel_type=ChannelType.SMS,
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
            channel_type=ChannelType.SMS,
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
            channel_type=ChannelType.SMS,
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
            channel_type=ChannelType.SMS,
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
            channel_type=ChannelType.SMS,
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
            channel_type=ChannelType.EMAIL,
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
    idempotency_key = "KEY"
    user_id = setup_parents["user_id"]

    interaction = InteractionService.dispatch(
        channel_type=ChannelType.EMAIL,
        payload=email_info,
        idempotency_key=idempotency_key,
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
    assert interaction.channel == ChannelType.EMAIL
    assert interaction.notify_reference == "123"
    assert interaction.idempotency_key == idempotency_key

    # verify it's in the db
    db_interaction = session.query(CustomerInteraction).filter(CustomerInteraction.id == interaction.id).one_or_none()
    assert db_interaction is not None
    assert db_interaction.notify_reference == "123"


def test_queued_email_interaction_records_metadata(session, setup_parents):
    """Assert queued email interactions include observability metadata."""
    email_info = EmailInfo(
        registration_number="REG-123",
        email_type="HOST_REGISTRATION_ACTIVE",
        custom_content="some content",
    )

    interaction_uuid = InteractionService.queued(
        channel_type=ChannelType.EMAIL,
        payload=email_info,
        registration_id=setup_parents["registration_id"],
        idempotency_key="status-update-1",
    )

    stored = CustomerInteraction.find_by_uuid(interaction_uuid)

    assert stored.status == InteractionStatus.QUEUED
    assert stored.meta_data["email_type"] == "HOST_REGISTRATION_ACTIVE"
    assert stored.meta_data["registration_number"] == "REG-123"
    assert stored.meta_data["target_entity"] == "registration"
    assert stored.meta_data["target_id"] == str(setup_parents["registration_id"])


@pytest.mark.conf(NOTIFY_SVC_URL="dummy", NOTIFY_API_TIMEOUT=30)
@patch("strr_api.services.auth_service.AuthService.get_service_client_token", return_value="dummy_token")
@patch("strr_api.services.interaction.requests.post")
def test_dispatch_updates_queued_interaction_with_notify_metadata(
    mock_requests_post, mock_get_token, session, setup_parents, inject_config
):
    """Assert dispatch updates the queued interaction instead of creating a disconnected row."""
    mock_requests_post.return_value.status_code = HTTPStatus.OK
    mock_requests_post.return_value.json.return_value = {"id": "notify-123", "notifyStatus": "QUEUED"}

    email_info = EmailInfo(
        registration_number="REG-123",
        email_type="HOST_REGISTRATION_ACTIVE",
        email={"requestBy": "STRR", "content": {"subject": "Subject", "body": "Body"}},
    )
    interaction_uuid = InteractionService.queued(
        channel_type=ChannelType.EMAIL,
        payload=email_info,
        registration_id=setup_parents["registration_id"],
    )

    interaction = InteractionService.dispatch(
        channel_type=ChannelType.EMAIL,
        payload=email_info,
        interaction_uuid=interaction_uuid,
        registration_id=setup_parents["registration_id"],
    )
    session.expire_all()
    stored = CustomerInteraction.find_by_uuid(interaction_uuid)

    mock_get_token.assert_called_once()
    mock_requests_post.assert_called_once()
    assert interaction.interaction_uuid == interaction_uuid
    assert stored.status == InteractionStatus.SENT
    assert stored.notify_reference == "notify-123"
    assert stored.body_content == "Subject"
    assert stored.meta_data["notify_request"]["subject"] == "Subject"
    assert stored.meta_data["notify_response"]["notifyStatus"] == "QUEUED"


@pytest.mark.conf(NOTIFY_SVC_URL="dummy", NOTIFY_API_TIMEOUT=30)
@patch("strr_api.services.auth_service.AuthService.get_service_client_token", return_value="dummy_token")
@patch("strr_api.services.interaction.requests.post")
def test_dispatch_marks_existing_interaction_failed_on_notify_error(
    mock_requests_post, mock_get_token, session, setup_parents, inject_config
):
    """Assert Notify failures update the interaction while preserving Pub/Sub retry behavior."""
    mock_requests_post.return_value.status_code = HTTPStatus.BAD_REQUEST
    mock_requests_post.return_value.json.return_value = {"message": "error"}

    email_info = EmailInfo(
        registration_number="REG-123",
        email_type="HOST_REGISTRATION_ACTIVE",
        email={"requestBy": "STRR", "content": {"subject": "Subject", "body": "Body"}},
    )
    interaction_uuid = InteractionService.queued(
        channel_type=ChannelType.EMAIL,
        payload=email_info,
        registration_id=setup_parents["registration_id"],
    )

    with pytest.raises(ExternalServiceException):
        InteractionService.dispatch(
            channel_type=ChannelType.EMAIL,
            payload=email_info,
            interaction_uuid=interaction_uuid,
            registration_id=setup_parents["registration_id"],
        )

    session.expire_all()
    stored = CustomerInteraction.find_by_uuid(interaction_uuid)

    mock_get_token.assert_called_once()
    mock_requests_post.assert_called_once()
    assert stored.status == InteractionStatus.FAILED
    assert stored.meta_data["notify_response"]["status_code"] == HTTPStatus.BAD_REQUEST
    assert stored.meta_data["notify_response"]["error"] == {"message": "error"}


@pytest.mark.parametrize(
    "response_status_code, response_json",
    [
        (HTTPStatus.OK, {"id": 0}),
        (HTTPStatus.BAD_REQUEST, {"message": "error"}),
    ],
)
@pytest.mark.conf(NOTIFY_SVC_URL="dummy", NOTIFY_API_TIMEOUT=30)
@patch("strr_api.services.auth_service.AuthService.get_service_client_token", return_value="dummy_token")
@patch("strr_api.services.interaction.requests.post")
def test_dispatch_email_interaction_failure(
    mock_requests_post,
    mock_get_token,
    session,
    setup_parents,
    inject_config,
    response_status_code,
    response_json,
):
    """Assert that email interaction raises ExternalServiceException when notify returns a failure response."""
    mock_requests_post.return_value.status_code = response_status_code
    mock_requests_post.return_value.json.return_value = response_json

    email_info = EmailInfo(application_number="123", email_type="TEST", custom_content="some content")

    with pytest.raises(ExternalServiceException) as excinfo:
        InteractionService.dispatch(
            registration_id=setup_parents["registration_id"],
            channel_type=ChannelType.EMAIL,
            payload=email_info,
        )

    mock_get_token.assert_called_once()
    mock_requests_post.assert_called_once()
    assert excinfo.value.status_code == HTTPStatus.BAD_REQUEST
    assert excinfo.value.error == "'Email not sent', 400"


@pytest.mark.conf(NOTIFY_SVC_URL="dummy", NOTIFY_API_TIMEOUT=30)
@patch("strr_api.services.auth_service.AuthService.get_service_client_token", return_value="dummy_token")
@patch("strr_api.services.interaction.requests.post")
def test_dispatch_email_splits_recipients(mock_requests_post, mock_get_token, session, setup_parents, inject_config):
    """Assert that each recipient is sent to notify-api as a separate request."""
    mock_responses = [
        MagicMock(status_code=HTTPStatus.OK, **{"json.return_value": {"id": 111}}),
        MagicMock(status_code=HTTPStatus.OK, **{"json.return_value": {"id": 222}}),
        MagicMock(status_code=HTTPStatus.OK, **{"json.return_value": {"id": 333}}),
    ]
    mock_requests_post.side_effect = mock_responses

    email_payload = {
        "recipients": "foo@foo.com,bar@bar.com,baz@baz.com",
        "requestBy": "STRR",
        "content": {"subject": "s", "body": "b"},
    }
    email_info = EmailInfo(application_number="123", email_type="HOST_RENEWAL_REMINDER", email=email_payload)

    interaction = InteractionService.dispatch(
        channel_type=ChannelType.EMAIL,
        payload=email_info,
        application_id=setup_parents["application_id"],
    )

    assert mock_requests_post.call_count == 3
    posted_recipients = [call.kwargs["json"]["recipients"] for call in mock_requests_post.call_args_list]
    assert posted_recipients == ["foo@foo.com", "bar@bar.com", "baz@baz.com"]
    assert interaction.notify_reference == "111"
    assert interaction.meta_data["notify_references"] == "111,222,333"
    assert interaction.meta_data["notify_response"]["ids"] == "111,222,333"


@pytest.mark.conf(NOTIFY_SVC_URL="dummy", NOTIFY_API_TIMEOUT=30)
@patch("strr_api.services.auth_service.AuthService.get_service_client_token", return_value="dummy_token")
@patch("strr_api.services.interaction.requests.post")
def test_dispatch_email_partial_recipient_failure(
    mock_requests_post, mock_get_token, session, setup_parents, inject_config
):
    """Assert that a malformed recipient does not block delivery to valid recipients."""
    mock_responses = [
        MagicMock(status_code=HTTPStatus.OK, **{"json.return_value": {"id": 111}}),
        MagicMock(status_code=HTTPStatus.BAD_REQUEST, **{"json.return_value": {"message": "bad email"}}),
        MagicMock(status_code=HTTPStatus.OK, **{"json.return_value": {"id": 333}}),
    ]
    mock_requests_post.side_effect = mock_responses

    email_payload = {
        "recipients": "foo@foo.com,bas@ba$.com,baz@baz.com",
        "requestBy": "STRR",
        "content": {"subject": "s", "body": "b"},
    }
    email_info = EmailInfo(application_number="123", email_type="HOST_RENEWAL_REMINDER", email=email_payload)

    interaction = InteractionService.dispatch(
        channel_type=ChannelType.EMAIL,
        payload=email_info,
        application_id=setup_parents["application_id"],
    )

    assert mock_requests_post.call_count == 3
    assert interaction.notify_reference == "111"
    assert interaction.meta_data["notify_references"] == "111,333"
    assert interaction.meta_data["notify_response"]["ids"] == "111,333"


@pytest.mark.conf(NOTIFY_SVC_URL="dummy", NOTIFY_API_TIMEOUT=30)
@patch("strr_api.services.auth_service.AuthService.get_service_client_token", return_value="dummy_token")
@patch("strr_api.services.interaction.requests.post")
def test_dispatch_email_all_recipients_fail(mock_requests_post, mock_get_token, session, setup_parents, inject_config):
    """Assert that if all recipient sends fail the dispatch raises an exception."""
    mock_responses = [
        MagicMock(status_code=HTTPStatus.BAD_REQUEST, **{"json.return_value": {"message": "bad email"}}),
        MagicMock(status_code=HTTPStatus.BAD_REQUEST, **{"json.return_value": {"message": "bad email"}}),
    ]
    mock_requests_post.side_effect = mock_responses

    email_payload = {
        "recipients": "bas@ba$.com,also$bad.com",
        "requestBy": "STRR",
        "content": {"subject": "s", "body": "b"},
    }
    email_info = EmailInfo(application_number="123", email_type="HOST_RENEWAL_REMINDER", email=email_payload)

    with pytest.raises(ExternalServiceException) as excinfo:
        InteractionService.dispatch(
            channel_type=ChannelType.EMAIL,
            payload=email_info,
            application_id=setup_parents["application_id"],
        )

    assert mock_requests_post.call_count == 2
    assert excinfo.value.status_code == HTTPStatus.BAD_REQUEST
    assert excinfo.value.error == "'Email not sent', 400"


@pytest.mark.parametrize(
    "interaction_status, expected_event_name",
    [
        (InteractionStatus.QUEUED, "EMAIL_QUEUED"),
        (InteractionStatus.SENT, "EMAIL_SENT"),
        (InteractionStatus.DELIVERED, "EMAIL_DELIVERED"),
        (InteractionStatus.FAILED, "EMAIL_FAILED"),
        (InteractionStatus.OPENED, "EMAIL_OPENED"),
    ],
)
def test_filing_history_rows_application_maps_status_to_event_name(
    session, setup_parents, interaction_status, expected_event_name
):
    interaction = CustomerInteraction(
        channel=ChannelType.EMAIL,
        status=interaction_status,
        application_id=setup_parents["application_id"],
        user_id=setup_parents["user_id"],
        notify_reference="notify-ref-status",
        provider_reference="provider-ref-status",
        meta_data={
            "email_type": "HOST_FULL_REVIEW_APPROVED",
            "notify_delivery": {
                "updated_at": "2026-07-08T20:53:21.399598+00:00",
                "recipient_statuses": {
                    "610066": {
                        "email_address": "karim.jazzar@gov.bc.ca",
                        "failure_reason": None,
                        "failure_type": None,
                        "notify_reference": "610066",
                        "provider_reference": "610522",
                        "request_date": "2026-06-09T22:23:11.634878",
                        "sent_date": "2026-06-09T22:23:11.714837",
                        "status": "SENT",
                    }
                },
            },
        },
    )
    interaction.save()

    rows = InteractionService.filing_history_rows_for_application(setup_parents["application_id"])
    assert len(rows) == 1
    row = rows[0]
    assert row["eventName"] == expected_event_name
    assert row["details"] is None
    assert row["structuredDetails"]["recipientStatusUpdatedAt"] == "2026-07-08T20:53:21.399598+00:00"
    assert isinstance(row["structuredDetails"]["recipientStatuses"], list)
    assert row["structuredDetails"]["recipientStatuses"][0]["notify_reference"] == "610066"
    assert row["structuredDetails"]["recipientStatuses"][0]["status"] == "SENT"


@pytest.mark.parametrize(
    "channel, meta_data, expected_count",
    [
        (
            ChannelType.SMS,
            {
                "email_type": "HOST_FULL_REVIEW_APPROVED",
                "notify_delivery": {
                    "updated_at": "2026-07-08T20:53:21.399598+00:00",
                    "recipient_statuses": {
                        "610066": {
                            "status": "SENT",
                        }
                    },
                },
            },
            0,
        ),
        (
            ChannelType.EMAIL,
            {
                "email_type": "HOST_FULL_REVIEW_APPROVED",
            },
            0,
        ),
        (
            ChannelType.EMAIL,
            {
                "email_type": "HOST_FULL_REVIEW_APPROVED",
                "notify_delivery": {
                    "updated_at": "2026-07-08T20:53:21.399598+00:00",
                    "recipient_statuses": {
                        "610066": "malformed",
                    },
                },
            },
            1,
        ),
    ],
)
def test_filing_history_rows_application_edge_cases(session, setup_parents, channel, meta_data, expected_count):
    interaction = CustomerInteraction(
        channel=channel,
        status=InteractionStatus.SENT,
        application_id=setup_parents["application_id"],
        meta_data=meta_data,
    )
    interaction.save()

    rows = InteractionService.filing_history_rows_for_application(setup_parents["application_id"])
    assert len(rows) == expected_count
    if expected_count:
        recipient = rows[0]["structuredDetails"]["recipientStatuses"][0]
        assert recipient["notify_reference"] == "610066"


@pytest.mark.parametrize(
    "provider_status, expected_status",
    [
        ("created", "CREATED"),
        ("sending", "IN_TRANSIT"),
        ("pending", "PENDING"),
        ("delivered", "DELIVERED"),
        ("sent", "SENT"),
        ("permanent-failure", "FAILED"),
        ("temporary-failure", "FAILED"),
        ("technical-failure", "FAILED"),
        ("pending-virus-check", "PENDING"),
        ("virus-scan-failed", "FAILED"),
    ],
)
def test_filing_history_rows_application_maps_provider_status_to_internal_status(
    session, setup_parents, provider_status, expected_status
):
    interaction = CustomerInteraction(
        channel=ChannelType.EMAIL,
        status=InteractionStatus.SENT,
        application_id=setup_parents["application_id"],
        meta_data={
            "email_type": "HOST_RENEWAL_REMINDER",
            "notify_delivery": {
                "updated_at": "2026-07-08T20:53:21.399598+00:00",
                "recipient_statuses": {
                    "610066": {
                        "email_address": "karim.jazzar@gov.bc.ca",
                        "notify_reference": "610066",
                        "provider_reference": "610522",
                        "status": provider_status,
                    }
                },
            },
        },
    )
    interaction.save()

    rows = InteractionService.filing_history_rows_for_application(setup_parents["application_id"])
    assert len(rows) == 1
    recipient = rows[0]["structuredDetails"]["recipientStatuses"][0]
    assert recipient["status"] == expected_status
    assert recipient["provider_status"] == provider_status
