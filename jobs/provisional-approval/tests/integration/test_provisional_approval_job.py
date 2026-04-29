# pylint: disable=C0114, C0116
"""Integration tests for provisional-approval job (Postgres + migrations via strr-test-utils)."""

from unittest.mock import patch

import pytest
from strr_api.models.application import Application
from strr_api.models.events import Events
from strr_api.models.rental import Registration

from provisional_approval.job import (
    get_applications_in_full_review_status,
    process_applications,
)

pytestmark = pytest.mark.integration


def test_returns_host_renewal_in_full_review(
    session, app, seed_full_review_host_renewal_application
):
    data = seed_full_review_host_renewal_application()
    session.commit()

    rows = list(get_applications_in_full_review_status(app))

    assert len(rows) == 1
    assert rows[0].id == data["application"].id


def test_excludes_non_full_review_status(
    session, app, seed_full_review_host_renewal_application
):
    seed_full_review_host_renewal_application(status=Application.Status.PAID)
    session.commit()

    assert list(get_applications_in_full_review_status(app)) == []


def test_excludes_non_renewal_type(
    session, app, seed_full_review_host_renewal_application
):
    seed_full_review_host_renewal_application(type="registration")
    session.commit()

    assert list(get_applications_in_full_review_status(app)) == []


def test_excludes_non_host_registration_type(
    session, app, seed_full_review_host_renewal_application
):
    seed_full_review_host_renewal_application(
        registration_type=Registration.RegistrationType.PLATFORM,
    )
    session.commit()

    assert list(get_applications_in_full_review_status(app)) == []


@pytest.mark.conf(BATCH_SIZE="1")
def test_respects_batch_size(
    session, app, inject_config, seed_full_review_host_renewal_application
):
    first = seed_full_review_host_renewal_application()
    seed_full_review_host_renewal_application()
    session.commit()

    rows = list(get_applications_in_full_review_status(app))

    assert len(rows) == 1
    assert rows[0].id == first["application"].id


def test_process_applications_updates_status(
    session, app, seed_full_review_host_renewal_application
):
    """Approval path updates application when ApprovalService succeeds (mocked)."""
    data = seed_full_review_host_renewal_application()
    application = data["application"]
    session.commit()

    with patch(
        "provisional_approval.job.ApprovalService.approve_application",
        return_value=1,
    ) as mock_approve:
        with app.app_context():
            process_applications([application])

    mock_approve.assert_called_once_with(
        application=application,
        status=Application.Status.PROVISIONAL_REVIEW,
        event=Events.EventName.AUTO_APPROVAL_PROVISIONAL,
    )
