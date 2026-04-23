# pylint: disable=C0114, C0116
"""Integration tests for NOC expiry job (Postgres + migrations via strr-test-utils)."""

from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from uuid import uuid4

import pytest
from strr_api.enums.enum import RegistrationNocStatus, RegistrationStatus
from strr_api.models import (
    Application,
    NoticeOfConsideration,
    Registration,
    RegistrationNoticeOfConsideration,
    User,
)

from noc_expiry.job import (
    update_noc_status_for_expired_registrations,
    update_status_for_noc_expired_applications,
)

pytestmark = pytest.mark.integration

# Fixed "now" in legislation TZ for predictable comparisons (see DateUtil patch below).
CUTOFF = datetime(2026, 6, 15, 12, 0, 0, tzinfo=timezone.utc)


def _reg_number() -> str:
    return f"NOC-INT-{uuid4().hex[:12]}"


def test_updates_application_noc_pending_when_noc_end_before_cutoff(session, app):
    user = User()
    session.add(user)
    session.flush()

    application = Application(
        type="registration",
        application_json={"header": {}},
        application_number=Application.generate_unique_application_number(),
        submitter_id=user.id,
        status=Application.Status.NOC_PENDING,
    )
    session.add(application)
    session.flush()

    noc = NoticeOfConsideration(
        application_id=application.id,
        content="test noc",
        start_date=datetime(2026, 1, 1, tzinfo=timezone.utc),
        end_date=datetime(2026, 6, 1, tzinfo=timezone.utc),
    )
    session.add(noc)
    session.commit()

    with patch("noc_expiry.job.DateUtil.as_legislation_timezone", return_value=CUTOFF):
        update_status_for_noc_expired_applications(app)

    session.refresh(application)
    assert application.status == Application.Status.NOC_EXPIRED


def test_skips_application_when_noc_end_on_or_after_cutoff(session, app):
    user = User()
    session.add(user)
    session.flush()

    application = Application(
        type="registration",
        application_json={"header": {}},
        application_number=Application.generate_unique_application_number(),
        submitter_id=user.id,
        status=Application.Status.NOC_PENDING,
    )
    session.add(application)
    session.flush()

    noc = NoticeOfConsideration(
        application_id=application.id,
        content="test noc",
        start_date=datetime(2026, 1, 1, tzinfo=timezone.utc),
        end_date=CUTOFF,
    )
    session.add(noc)
    session.commit()

    with patch("noc_expiry.job.DateUtil.as_legislation_timezone", return_value=CUTOFF):
        update_status_for_noc_expired_applications(app)

    session.refresh(application)
    assert application.status == Application.Status.NOC_PENDING


def test_updates_provisional_review_noc_pending_to_expired(session, app):
    user = User()
    session.add(user)
    session.flush()

    application = Application(
        type="registration",
        application_json={"header": {}},
        application_number=Application.generate_unique_application_number(),
        submitter_id=user.id,
        status=Application.Status.PROVISIONAL_REVIEW_NOC_PENDING,
    )
    session.add(application)
    session.flush()

    noc = NoticeOfConsideration(
        application_id=application.id,
        content="test noc",
        start_date=datetime(2026, 1, 1, tzinfo=timezone.utc),
        end_date=datetime(2026, 6, 1, tzinfo=timezone.utc),
    )
    session.add(noc)
    session.commit()

    with patch("noc_expiry.job.DateUtil.as_legislation_timezone", return_value=CUTOFF):
        update_status_for_noc_expired_applications(app)

    session.refresh(application)
    assert application.status == Application.Status.PROVISIONAL_REVIEW_NOC_EXPIRED


def test_updates_registration_noc_pending_when_latest_noc_end_before_cutoff(
    session, app
):
    user = User()
    session.add(user)
    session.flush()

    start = datetime(2025, 1, 1, tzinfo=timezone.utc)
    expiry = start + timedelta(days=365)

    registration = Registration(
        registration_type=Registration.RegistrationType.HOST,
        registration_number=_reg_number(),
        sbc_account_id=88001,
        status=RegistrationStatus.ACTIVE,
        user_id=user.id,
        start_date=start,
        expiry_date=expiry,
        noc_status=RegistrationNocStatus.NOC_PENDING,
    )
    session.add(registration)
    session.flush()

    rn = RegistrationNoticeOfConsideration(
        registration_id=registration.id,
        content="reg noc",
        start_date=datetime(2026, 1, 1, tzinfo=timezone.utc),
        end_date=datetime(2026, 6, 1, tzinfo=timezone.utc),
    )
    session.add(rn)
    session.commit()

    with patch("noc_expiry.job.DateUtil.as_legislation_timezone", return_value=CUTOFF):
        update_noc_status_for_expired_registrations(app)

    session.refresh(registration)
    assert registration.noc_status == RegistrationNocStatus.NOC_EXPIRED
