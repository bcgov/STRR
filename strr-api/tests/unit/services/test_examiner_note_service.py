# Copyright © 2024 Province of British Columbia
"""Unit tests for ExaminerNoteService."""

from datetime import datetime, timedelta
from http import HTTPStatus

import pytest

from strr_api.enums.enum import ErrorMessage, RegistrationStatus, RegistrationType
from strr_api.exceptions import ValidationException
from strr_api.models import Application, ExaminerNote, Registration, User
from strr_api.services.examiner_note_service import ExaminerNoteNotAllowedException, ExaminerNoteService

VALIDATE_TEXT_CASES = [
    pytest.param("  hello  ", "hello", None, id="trims"),
    pytest.param("   ", None, ErrorMessage.EXAMINER_NOTE_TEXT_REQUIRED.value, id="empty"),
    pytest.param("x" * 1001, None, ErrorMessage.EXAMINER_NOTE_TEXT_TOO_LONG.value, id="too-long"),
]

CAN_POST_CASES = [
    pytest.param(None, Application.Status.FULL_REVIEW.value, True, None, id="examination"),
    pytest.param(
        True,
        Application.Status.FULL_REVIEW.value,
        False,
        ErrorMessage.EXAMINER_NOTE_APPLICATION_REGISTERED.value,
        id="registered",
    ),
    pytest.param(
        True,
        Application.Status.PROVISIONAL_REVIEW.value,
        False,
        ErrorMessage.EXAMINER_NOTE_APPLICATION_REGISTERED.value,
        id="provisional-with-registration",
    ),
    pytest.param(
        None,
        Application.Status.DRAFT.value,
        False,
        Application.Status.DRAFT.value,
        id="draft-status",
    ),
]


def _staff_user(session) -> User:
    user = User(username="examiner-note-tester")
    session.add(user)
    session.commit()
    return user


def _registration(session, user: User) -> Registration:
    reg = Registration(
        user_id=user.id,
        registration_number="REG1234567890",
        sbc_account_id=12345,
        status=RegistrationStatus.ACTIVE,
        registration_type=RegistrationType.HOST.value,
        start_date=datetime.now(),
        expiry_date=datetime.now() + timedelta(days=365),
    )
    session.add(reg)
    session.flush()
    return reg


def _application(session, *, registration_id=None, status=Application.Status.FULL_REVIEW.value) -> Application:
    user = _staff_user(session)
    if registration_id is True:
        registration_id = _registration(session, user).id
    app = Application(
        application_number=Application.generate_unique_application_number(),
        application_json={"header": {"applicationType": "registration"}},
        type="registration",
        status=status,
        registration_id=registration_id,
        submitter_id=user.id,
        payment_account="12345",
    )
    session.add(app)
    session.commit()
    return app


@pytest.mark.parametrize("text,expected,error_fragment", VALIDATE_TEXT_CASES)
def test_validate_text(session, text, expected, error_fragment):
    if error_fragment:
        with pytest.raises(ValidationException) as exc:
            ExaminerNoteService.validate_text(text)
        assert error_fragment in exc.value.message
    else:
        assert ExaminerNoteService.validate_text(text) == expected


@pytest.mark.parametrize("registration_id,status,can_post,block_fragment", CAN_POST_CASES)
def test_can_post_application_note(session, registration_id, status, can_post, block_fragment):
    app = _application(session, registration_id=registration_id, status=status)
    reason = ExaminerNoteService.application_note_post_block_reason(app)
    if can_post:
        assert reason is None
    else:
        assert reason is not None
        assert block_fragment in reason


def test_create_application_note_raises_when_not_allowed(session):
    user = _staff_user(session)
    app = _application(session, registration_id=True)
    with pytest.raises(ExaminerNoteNotAllowedException) as exc:
        ExaminerNoteService.create_application_note(app, user, "note")
    assert exc.value.status_code == HTTPStatus.UNPROCESSABLE_ENTITY
    assert exc.value.message == ErrorMessage.EXAMINER_NOTE_APPLICATION_REGISTERED.value


def test_list_truncated_when_over_cap(session, monkeypatch):
    monkeypatch.setattr("strr_api.services.examiner_note_service.NOTE_LIST_MAX", 2)
    user = _staff_user(session)
    app = _application(session)
    for i in range(3):
        ExaminerNote(text=f"note-{i}", application_id=app.id, author_user_id=user.id).save()
    notes, truncated = ExaminerNoteService.list_by_application_id(app.id)
    assert len(notes) == 2
    assert truncated is True
    assert notes[0].text == "note-2"


def test_serialize_shape(session):
    user = _staff_user(session)
    app = _application(session)
    note = ExaminerNoteService.create_application_note(app, user, "hello")
    payload = ExaminerNoteService.serialize(note)
    assert set(payload.keys()) == {"id", "text", "authorUserId", "authorUsername", "createdAt"}
    assert payload["authorUserId"] == user.id
    assert payload["authorUsername"] == user.username
    assert "application_id" not in payload
    assert "registration_id" not in payload


def test_list_returns_username_from_users_table(session):
    user = _staff_user(session)
    user.username = "idir/original"
    session.commit()
    app = _application(session)
    ExaminerNoteService.create_application_note(app, user, "hello")
    user.username = "idir/renamed"
    session.commit()
    notes, _ = ExaminerNoteService.list_by_application_id(app.id)
    payload = ExaminerNoteService.serialize(notes[0])
    assert payload["authorUsername"] == "idir/renamed"


def test_registration_notes_isolated_from_application(session):
    user = _staff_user(session)
    app = _application(session)
    reg = _registration(session, user)
    session.commit()
    ExaminerNoteService.create_application_note(app, user, "app note")
    ExaminerNoteService.create_registration_note(reg, user, "reg note")
    reg_notes, _ = ExaminerNoteService.list_by_registration_id(reg.id)
    assert len(reg_notes) == 1
    assert reg_notes[0].text == "reg note"
