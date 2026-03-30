"""Tests for registration expiry job behavior."""

from datetime import UTC, datetime, timedelta

import pytest

from strr_api.enums.enum import RegistrationStatus
from strr_api.models import User
from strr_api.models.rental import Registration

from registration_expiry.job import (
    create_app,
    update_status_for_registration_expired_applications,
)


@pytest.fixture(scope="module")
def test_app():
    """Provide a real Flask app with active context for Registration.query access."""
    app = create_app("test")
    with app.app_context():
        yield app


def _status_value(status):
    return status.value if hasattr(status, "value") else status


def _create_registration(session, user_id, registration_number, status, expiry_date):
    registration = Registration(
        registration_type="HOST",
        registration_number=registration_number,
        sbc_account_id=12345,
        status=status,
        start_date=datetime.now(UTC).replace(tzinfo=None) - timedelta(days=365),
        expiry_date=expiry_date,
        user_id=user_id,
    )
    session.add(registration)
    session.commit()
    return registration


def test_expired_active_and_suspended_registrations_transition_to_expired(
    test_app, session, mocker
):
    """Expired ACTIVE/SUSPENDED records are transitioned to EXPIRED."""
    mock_event = mocker.patch("registration_expiry.job.EventsService.save_event")
    user = User(username="expiry-test-user")
    session.add(user)
    session.commit()

    now = datetime.now(UTC).replace(tzinfo=None)
    expired_active = _create_registration(
        session,
        user.id,
        "H900000001",
        RegistrationStatus.ACTIVE.value,
        now - timedelta(days=2),
    )
    expired_suspended = _create_registration(
        session,
        user.id,
        "H900000002",
        RegistrationStatus.SUSPENDED.value,
        now - timedelta(days=2),
    )

    update_status_for_registration_expired_applications(test_app)

    session.refresh(expired_active)
    session.refresh(expired_suspended)

    assert _status_value(expired_active.status) == RegistrationStatus.EXPIRED.value
    assert _status_value(expired_suspended.status) == RegistrationStatus.EXPIRED.value
    assert mock_event.call_count == 2


def test_cancelled_registration_does_not_transition_to_expired(
    test_app, session, mocker
):
    """Expired CANCELLED records remain CANCELLED."""
    mock_event = mocker.patch("registration_expiry.job.EventsService.save_event")
    user = User(username="cancelled-test-user")
    session.add(user)
    session.commit()

    now = datetime.now(UTC).replace(tzinfo=None)
    expired_cancelled = _create_registration(
        session,
        user.id,
        "H900000003",
        RegistrationStatus.CANCELLED.value,
        now - timedelta(days=2),
    )

    update_status_for_registration_expired_applications(test_app)

    session.refresh(expired_cancelled)

    assert _status_value(expired_cancelled.status) == RegistrationStatus.CANCELLED.value
    mock_event.assert_not_called()
