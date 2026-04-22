# pylint: disable=C0114, C0116
"""Integration tests for registration expiry job (Postgres + migrations via strr-test-utils)."""

from datetime import datetime, timezone
from uuid import uuid4

import pytest
from freezegun import freeze_time
from strr_api.enums.enum import RegistrationStatus
from strr_api.models import Registration, User

from registration_expiry.job import update_status_for_registration_expired_applications

pytestmark = pytest.mark.integration


def _reg_number() -> str:
    return f"INT-{uuid4().hex[:12]}"


@freeze_time("2026-06-01 12:00:00")
def test_updates_only_active_and_suspended_past_expiry(session, app):
    """Eligible rows (ACTIVE/SUSPENDED with expiry before cutoff) become EXPIRED."""
    user = User()
    session.add(user)
    session.flush()

    past = datetime(2024, 1, 15, tzinfo=timezone.utc)
    future = datetime(2030, 1, 15, tzinfo=timezone.utc)

    r_active_due = Registration(
        registration_type=Registration.RegistrationType.HOST,
        registration_number=_reg_number(),
        sbc_account_id=90001,
        status=RegistrationStatus.ACTIVE,
        user_id=user.id,
        start_date=datetime(2023, 1, 1, tzinfo=timezone.utc),
        expiry_date=past,
    )
    r_suspended_due = Registration(
        registration_type=Registration.RegistrationType.HOST,
        registration_number=_reg_number(),
        sbc_account_id=90002,
        status=RegistrationStatus.SUSPENDED,
        user_id=user.id,
        start_date=datetime(2023, 1, 1, tzinfo=timezone.utc),
        expiry_date=past,
    )
    r_active_future = Registration(
        registration_type=Registration.RegistrationType.HOST,
        registration_number=_reg_number(),
        sbc_account_id=90003,
        status=RegistrationStatus.ACTIVE,
        user_id=user.id,
        start_date=datetime(2023, 1, 1, tzinfo=timezone.utc),
        expiry_date=future,
    )
    session.add_all([r_active_due, r_suspended_due, r_active_future])
    session.commit()

    update_status_for_registration_expired_applications(app)

    session.refresh(r_active_due)
    session.refresh(r_suspended_due)
    session.refresh(r_active_future)

    assert r_active_due.status == RegistrationStatus.EXPIRED
    assert r_suspended_due.status == RegistrationStatus.EXPIRED
    assert r_active_future.status == RegistrationStatus.ACTIVE


@freeze_time("2026-06-01 12:00:00")
def test_does_not_select_cancelled_expired_or_future(session, app):
    """CANCELLED and already-EXPIRED registrations are not processed."""
    user = User()
    session.add(user)
    session.flush()

    past = datetime(2024, 1, 15, tzinfo=timezone.utc)

    r_cancelled = Registration(
        registration_type=Registration.RegistrationType.HOST,
        registration_number=_reg_number(),
        sbc_account_id=91001,
        status=RegistrationStatus.CANCELLED,
        user_id=user.id,
        start_date=datetime(2023, 1, 1, tzinfo=timezone.utc),
        expiry_date=past,
    )
    r_already_expired = Registration(
        registration_type=Registration.RegistrationType.HOST,
        registration_number=_reg_number(),
        sbc_account_id=91002,
        status=RegistrationStatus.EXPIRED,
        user_id=user.id,
        start_date=datetime(2023, 1, 1, tzinfo=timezone.utc),
        expiry_date=past,
    )
    session.add_all([r_cancelled, r_already_expired])
    session.commit()

    update_status_for_registration_expired_applications(app)

    session.refresh(r_cancelled)
    session.refresh(r_already_expired)

    assert r_cancelled.status == RegistrationStatus.CANCELLED
    assert r_already_expired.status == RegistrationStatus.EXPIRED
