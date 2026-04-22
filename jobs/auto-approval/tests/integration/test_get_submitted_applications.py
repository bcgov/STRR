# pylint: disable=C0114, C0116
"""Integration tests for auto-approval job query (Postgres + migrations via strr-test-utils)."""

from datetime import datetime, timezone

import pytest
from freezegun import freeze_time
from strr_api.models import User
from strr_api.models.application import Application

from auto_approval.job import get_submitted_applications

pytestmark = pytest.mark.integration


def _seed_user(session):
    user = User()
    session.add(user)
    session.flush()
    return user


def _add_application(session, *, submitter_id, status, application_date):
    row = Application(
        type="registration",
        application_json={"header": {}},
        application_number=Application.generate_unique_application_number(),
        submitter_id=submitter_id,
        status=status,
        application_date=application_date,
    )
    session.add(row)
    return row


@freeze_time("2026-06-01 12:00:00")
def test_returns_paid_applications_older_than_cutoff(session, app):
    """PAID applications with application_date before the cutoff are selected."""
    user = _seed_user(session)
    old_enough = datetime(2026, 6, 1, 10, 0, 0, tzinfo=timezone.utc)
    too_recent = datetime(2026, 6, 1, 11, 30, 0, tzinfo=timezone.utc)

    paid_eligible = _add_application(
        session,
        submitter_id=user.id,
        status=Application.Status.PAID,
        application_date=old_enough,
    )
    _add_application(
        session,
        submitter_id=user.id,
        status=Application.Status.PAID,
        application_date=too_recent,
    )
    session.commit()

    rows = get_submitted_applications(app)

    assert len(rows) == 1
    assert rows[0].id == paid_eligible.id


@freeze_time("2026-06-01 12:00:00")
def test_excludes_non_paid_status_even_when_old(session, app):
    """Applications that are not PAID are not selected."""
    user = _seed_user(session)
    old = datetime(2026, 6, 1, 9, 0, 0, tzinfo=timezone.utc)
    _add_application(
        session,
        submitter_id=user.id,
        status=Application.Status.DRAFT,
        application_date=old,
    )
    session.commit()

    assert get_submitted_applications(app) == []


@freeze_time("2026-06-01 12:00:00")
def test_paid_at_exact_cutoff_is_included(session, app):
    """application_date equal to cutoff is selected (filter uses <=)."""
    user = _seed_user(session)
    at_cutoff = datetime(2026, 6, 1, 11, 0, 0, tzinfo=timezone.utc)
    paid = _add_application(
        session,
        submitter_id=user.id,
        status=Application.Status.PAID,
        application_date=at_cutoff,
    )
    session.commit()

    rows = get_submitted_applications(app)

    assert len(rows) == 1
    assert rows[0].id == paid.id


@freeze_time("2026-06-01 12:00:00")
def test_returns_multiple_eligible_paid_applications(session, app):
    """All PAID rows past the cutoff are returned."""
    user = _seed_user(session)
    t1 = datetime(2026, 6, 1, 8, 0, 0, tzinfo=timezone.utc)
    t2 = datetime(2026, 6, 1, 9, 0, 0, tzinfo=timezone.utc)

    a1 = _add_application(
        session,
        submitter_id=user.id,
        status=Application.Status.PAID,
        application_date=t1,
    )
    a2 = _add_application(
        session,
        submitter_id=user.id,
        status=Application.Status.PAID,
        application_date=t2,
    )
    session.commit()

    rows = get_submitted_applications(app)
    assert {r.id for r in rows} == {a1.id, a2.id}


@pytest.mark.conf(AUTO_APPROVAL_APPLICATION_PROCESSING_DELAY=120)
@freeze_time("2026-06-01 12:00:00")
def test_respects_auto_approval_processing_delay_config(session, app, inject_config):
    """Cutoff uses AUTO_APPROVAL_APPLICATION_PROCESSING_DELAY from app config."""
    user = _seed_user(session)
    just_after_cutoff = datetime(2026, 6, 1, 10, 30, 0, tzinfo=timezone.utc)
    before_cutoff = datetime(2026, 6, 1, 9, 30, 0, tzinfo=timezone.utc)

    _add_application(
        session,
        submitter_id=user.id,
        status=Application.Status.PAID,
        application_date=just_after_cutoff,
    )
    included = _add_application(
        session,
        submitter_id=user.id,
        status=Application.Status.PAID,
        application_date=before_cutoff,
    )
    session.commit()

    rows = get_submitted_applications(app)

    assert len(rows) == 1
    assert rows[0].id == included.id
