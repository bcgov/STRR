# Copyright © 2024 Province of British Columbia
"""Resource tests for examiner notes endpoints."""

from datetime import datetime, timedelta
from http import HTTPStatus

import pytest

from strr_api.enums.enum import ErrorMessage, RegistrationStatus, RegistrationType
from strr_api.models import Application, ExaminerNote, Registration, User
from tests.shared_test_constants import ACCOUNT_ID
from tests.unit.utils.auth_helpers import PUBLIC_USER, STRR_EXAMINER, STRR_INVESTIGATOR, SYSTEM_ROLE, create_header
from tests.utils.examiner_notes_helpers import (
    APPLICATION,
    REGISTRATION,
    application_notes_url,
    assert_application_notes_roundtrip,
    assert_message_contains,
    assert_notes_role_denied,
    assert_registration_notes_roundtrip,
    notes_url,
    registration_notes_url,
    request_notes,
)

STAFF_ROLES = (STRR_EXAMINER, STRR_INVESTIGATOR)
STAFF_ROLE_RESOURCE_CASES = [
    pytest.param(role, resource, id=f"{role}-{resource}")
    for role in STAFF_ROLES
    for resource in (APPLICATION, REGISTRATION)
]
UNIT_DENIED_ROLE_CASES = [
    pytest.param((PUBLIC_USER,), APPLICATION, "GET", id="public-application-get"),
    pytest.param((SYSTEM_ROLE,), APPLICATION, "GET", id="system-application-get"),
    pytest.param((SYSTEM_ROLE,), APPLICATION, "POST", id="system-application-post"),
    pytest.param((SYSTEM_ROLE,), REGISTRATION, "GET", id="system-registration-get"),
]

POST_REJECTION_CASES = [
    pytest.param(
        "app_with_registration",
        "blocked",
        HTTPStatus.UNPROCESSABLE_ENTITY,
        (ErrorMessage.EXAMINER_NOTE_APPLICATION_REGISTERED.value,),
        id="registered",
    ),
    pytest.param(
        "draft_app",
        "blocked",
        HTTPStatus.UNPROCESSABLE_ENTITY,
        (Application.Status.DRAFT.value, "active examination"),
        id="draft-status",
    ),
    pytest.param("note_app", "   ", HTTPStatus.BAD_REQUEST, (), id="empty-body"),
]


def _seed_application(session, *, registration_id=None, status=Application.Status.FULL_REVIEW.value):
    user = User(username="note-resource-user")
    session.add(user)
    session.flush()
    app = Application(
        application_number=Application.generate_unique_application_number(),
        application_json={"header": {"applicationType": "registration"}},
        type="registration",
        status=status,
        registration_id=registration_id,
        submitter_id=user.id,
        payment_account=str(ACCOUNT_ID),
    )
    session.add(app)
    session.commit()
    return app, user


def _seed_registration(session, user: User):
    reg = Registration(
        user_id=user.id,
        registration_number="REG9876543210",
        sbc_account_id=ACCOUNT_ID,
        status=RegistrationStatus.ACTIVE,
        registration_type=RegistrationType.HOST.value,
        start_date=datetime.now(),
        expiry_date=datetime.now() + timedelta(days=365),
    )
    session.add(reg)
    session.commit()
    return reg


def _headers(jwt, roles):
    if roles == (PUBLIC_USER,):
        headers = create_header(jwt, [PUBLIC_USER], "Account-Id")
        headers["Account-Id"] = str(ACCOUNT_ID)
        return headers
    return create_header(jwt, list(roles))


@pytest.fixture
def note_app(session):
    app, _user = _seed_application(session, registration_id=None)
    return app


@pytest.fixture
def draft_app(session):
    app, _user = _seed_application(session, status=Application.Status.DRAFT.value)
    return app


@pytest.fixture
def app_with_registration(session):
    app, user = _seed_application(session)
    reg = _seed_registration(session, user)
    app.registration_id = reg.id
    app.save()
    return app


@pytest.fixture
def app_and_registration(session):
    app, user = _seed_application(session)
    reg = _seed_registration(session, user)
    return app, reg, user


@pytest.mark.parametrize("role,resource", STAFF_ROLE_RESOURCE_CASES)
def test_staff_role_notes_roundtrip(
    mock_create_invoice, session, client, jwt, note_app, app_and_registration, role, resource
):
    headers = _headers(jwt, (role,))
    if resource == APPLICATION:
        assert_application_notes_roundtrip(client, note_app.application_number, headers, note_body="First note")
    else:
        _app, reg, _user = app_and_registration
        assert_registration_notes_roundtrip(client, reg.id, headers, body=f"Note from {role}")


@pytest.mark.parametrize("roles,resource,method", UNIT_DENIED_ROLE_CASES)
def test_notes_role_denied(session, client, jwt, app_and_registration, roles, resource, method):
    app, reg, _user = app_and_registration
    url = notes_url(resource, application=app, registration_id=reg.id)
    assert_notes_role_denied(request_notes(client, method, url, _headers(jwt, roles)))


@pytest.mark.parametrize("app_fixture,body,expected_status,message_parts", POST_REJECTION_CASES)
def test_application_notes_post_rejected(
    session, client, jwt, app_fixture, body, expected_status, message_parts, request
):
    app = request.getfixturevalue(app_fixture)
    rv = request_notes(
        client,
        "POST",
        application_notes_url(app),
        _headers(jwt, (STRR_EXAMINER,)),
        body=body,
    )
    assert rv.status_code == expected_status
    if message_parts:
        assert_message_contains(rv, *message_parts)


def test_application_notes_not_found(session, client, jwt):
    rv = request_notes(
        client,
        "GET",
        "/applications/00000000000000/notes",
        _headers(jwt, (STRR_EXAMINER,)),
    )
    assert rv.status_code == HTTPStatus.NOT_FOUND


def test_registration_list_excludes_application_notes(session, client, jwt, app_and_registration):
    app, reg, user = app_and_registration
    headers = _headers(jwt, (STRR_EXAMINER,))
    ExaminerNote(text="on app", application_id=app.id, author_user_id=user.id).save()
    request_notes(client, "POST", registration_notes_url(reg.id), headers, body="on reg")
    rv = request_notes(client, "GET", registration_notes_url(reg.id), headers)
    assert rv.status_code == HTTPStatus.OK
    assert len(rv.json["notes"]) == 1
    assert rv.json["notes"][0]["text"] == "on reg"


def test_application_notes_truncated_flag(session, client, jwt, monkeypatch, app_and_registration):
    monkeypatch.setattr("strr_api.services.examiner_note_service.NOTE_LIST_MAX", 2)
    app, _reg, user = app_and_registration
    for i in range(3):
        ExaminerNote(text=f"n{i}", application_id=app.id, author_user_id=user.id).save()
    rv = request_notes(client, "GET", application_notes_url(app), _headers(jwt, (STRR_EXAMINER,)))
    assert rv.status_code == HTTPStatus.OK
    assert rv.json["truncated"] is True
    assert len(rv.json["notes"]) == 2
