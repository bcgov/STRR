"""Integration tests for examiner notes APIs."""

from http import HTTPStatus

import pytest

from strr_api.enums.enum import ErrorMessage
from strr_api.models.application import Application as AppModel
from tests.integration.application_seed import generate_application_number, seed_listable_application
from tests.integration.helpers import assert_status
from tests.utils.examiner_notes_helpers import (
    APPLICATION,
    REGISTRATION,
    application_notes_url,
    assert_application_notes_roundtrip,
    assert_message_contains,
    assert_notes_role_denied,
    assert_registration_notes_roundtrip,
    notes_url,
    request_notes,
)

STAFF_HEADER_FIXTURES = ("headers_strr_examiner", "headers_strr_investigator")
STAFF_ROLE_RESOURCE_CASES = [
    pytest.param(headers_fixture, resource, id=f"{headers_fixture}-{resource}")
    for headers_fixture in STAFF_HEADER_FIXTURES
    for resource in (APPLICATION, REGISTRATION)
]
DENIED_INTEGRATION_CASES = [
    pytest.param("headers_public_user", APPLICATION, "GET", id="public-application-get"),
    pytest.param("headers_system", APPLICATION, "GET", id="system-application-get"),
    pytest.param("headers_system", APPLICATION, "POST", id="system-application-post"),
    pytest.param("headers_system", REGISTRATION, "GET", id="system-registration-get"),
]

POST_REJECTION_CASES = [
    pytest.param(
        "serializable_application",
        "Should fail",
        HTTPStatus.UNPROCESSABLE_ENTITY,
        (ErrorMessage.EXAMINER_NOTE_APPLICATION_REGISTERED.value,),
        id="registered",
    ),
]


@pytest.fixture
def examination_application(session, integration_account_id, serializable_host_registration):
    """Application in examination without registration_id (notes POST allowed)."""
    return seed_listable_application(
        session,
        account_id=integration_account_id,
        submitter_user_id=serializable_host_registration["user_id"],
        registration_id=None,
        application_number=generate_application_number(),
        status=AppModel.Status.FULL_REVIEW.value,
    )


@pytest.mark.parametrize(
    "headers_fixture,resource",
    STAFF_ROLE_RESOURCE_CASES,
)
def test_staff_role_notes_roundtrip(
    client,
    examination_application,
    serializable_host_registration,
    headers_fixture,
    resource,
    request,
):
    headers = request.getfixturevalue(headers_fixture)()
    body = f"Note via {headers_fixture}"
    if resource == APPLICATION:
        assert_application_notes_roundtrip(client, examination_application["application_number"], headers, body)
    else:
        assert_registration_notes_roundtrip(client, serializable_host_registration["registration_id"], headers, body)


@pytest.mark.parametrize("headers_fixture,resource,method", DENIED_INTEGRATION_CASES)
def test_notes_role_denied(
    client,
    examination_application,
    serializable_host_registration,
    headers_fixture,
    resource,
    method,
    request,
):
    headers = request.getfixturevalue(headers_fixture)()
    url = notes_url(
        resource,
        application=examination_application["application_number"],
        registration_id=serializable_host_registration["registration_id"],
    )
    assert_notes_role_denied(request_notes(client, method, url, headers))


@pytest.mark.parametrize("app_fixture,body,expected_status,message_parts", POST_REJECTION_CASES)
def test_application_notes_post_rejected(
    client, headers_strr_examiner, app_fixture, body, expected_status, message_parts, request
):
    app = request.getfixturevalue(app_fixture)
    rv = request_notes(
        client,
        "POST",
        application_notes_url(app["application_number"]),
        headers_strr_examiner(),
        body=body,
    )
    assert_status(rv, expected_status)
    if message_parts:
        assert_message_contains(rv, *message_parts)
