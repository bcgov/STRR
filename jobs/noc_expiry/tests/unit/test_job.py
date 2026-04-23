"""Unit tests for noc_expiry job (no database)."""

import logging
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest
from strr_api.enums.enum import RegistrationNocStatus
from strr_api.models.application import Application

from noc_expiry.job import (
    create_app,
    run,
    update_noc_status_for_expired_registrations,
    update_status_for_noc_expired_applications,
)


@pytest.fixture
def job_app(mocker):
    mocker.patch("noc_expiry.job.db.init_app")
    return create_app("unittest")


def test_create_app_factory(mocker):
    mocker.patch("noc_expiry.job.db.init_app")
    app = create_app("unittest")
    assert app.name == "noc_expiry.job"


def test_register_shellcontext_exposes_app(mocker):
    mocker.patch("noc_expiry.job.db.init_app")
    app = create_app("unittest")
    processor = app.shell_context_processors[0]
    assert processor() == {"app": app}


def test_update_applications_expires_noc_pending(mocker, job_app):
    cut_off = datetime(2026, 6, 15, 12, 0, 0, tzinfo=timezone.utc)
    mocker.patch(
        "noc_expiry.job.DateUtil.as_legislation_timezone", return_value=cut_off
    )

    application = MagicMock()
    application.id = 42
    application.status = Application.Status.NOC_PENDING
    application.noc = MagicMock()
    application.noc.end_date = datetime(2026, 1, 1, tzinfo=timezone.utc)
    application.save = MagicMock()

    filter_result = MagicMock()
    filter_result.all.return_value = [application]
    query_mock = MagicMock()
    query_mock.filter.return_value = filter_result

    with job_app.app_context():
        with patch("noc_expiry.job.Application.query", query_mock):
            update_status_for_noc_expired_applications(job_app)

    assert application.status == Application.Status.NOC_EXPIRED
    application.save.assert_called_once()


def test_update_applications_expires_provisional_review_noc_pending(mocker, job_app):
    cut_off = datetime(2026, 6, 15, 12, 0, 0, tzinfo=timezone.utc)
    mocker.patch(
        "noc_expiry.job.DateUtil.as_legislation_timezone", return_value=cut_off
    )

    application = MagicMock()
    application.id = 43
    application.status = Application.Status.PROVISIONAL_REVIEW_NOC_PENDING
    application.noc = MagicMock()
    application.noc.end_date = datetime(2026, 1, 1, tzinfo=timezone.utc)
    application.save = MagicMock()

    filter_result = MagicMock()
    filter_result.all.return_value = [application]
    query_mock = MagicMock()
    query_mock.filter.return_value = filter_result

    with job_app.app_context():
        with patch("noc_expiry.job.Application.query", query_mock):
            update_status_for_noc_expired_applications(job_app)

    assert application.status == Application.Status.PROVISIONAL_REVIEW_NOC_EXPIRED
    application.save.assert_called_once()


def test_update_applications_skips_when_noc_end_after_cutoff(mocker, job_app):
    cut_off = datetime(2026, 6, 15, 12, 0, 0, tzinfo=timezone.utc)
    mocker.patch(
        "noc_expiry.job.DateUtil.as_legislation_timezone", return_value=cut_off
    )

    application = MagicMock()
    application.id = 44
    application.status = Application.Status.NOC_PENDING
    application.noc = MagicMock()
    application.noc.end_date = datetime(2030, 1, 1, tzinfo=timezone.utc)
    application.save = MagicMock()

    filter_result = MagicMock()
    filter_result.all.return_value = [application]
    query_mock = MagicMock()
    query_mock.filter.return_value = filter_result

    with job_app.app_context():
        with patch("noc_expiry.job.Application.query", query_mock):
            update_status_for_noc_expired_applications(job_app)

    assert application.status == Application.Status.NOC_PENDING
    application.save.assert_not_called()


def test_update_applications_logs_on_error(mocker, job_app, caplog):
    cut_off = datetime(2026, 6, 15, 12, 0, 0, tzinfo=timezone.utc)
    mocker.patch(
        "noc_expiry.job.DateUtil.as_legislation_timezone", return_value=cut_off
    )

    application = MagicMock()
    application.id = 7
    application.status = Application.Status.NOC_PENDING
    application.noc = MagicMock()
    application.noc.end_date = datetime(2026, 1, 1, tzinfo=timezone.utc)
    application.save = MagicMock(side_effect=RuntimeError("db error"))

    filter_result = MagicMock()
    filter_result.all.return_value = [application]
    query_mock = MagicMock()
    query_mock.filter.return_value = filter_result

    with job_app.app_context():
        with patch("noc_expiry.job.Application.query", query_mock):
            with caplog.at_level(logging.ERROR):
                update_status_for_noc_expired_applications(job_app)

    assert "Unexpected error" in caplog.text


def test_update_registrations_sets_noc_expired(mocker, job_app):
    cut_off = datetime(2026, 6, 15, 12, 0, 0, tzinfo=timezone.utc)
    mocker.patch(
        "noc_expiry.job.DateUtil.as_legislation_timezone", return_value=cut_off
    )

    noc = MagicMock()
    noc.start_date = datetime(2025, 1, 1, tzinfo=timezone.utc)
    noc.end_date = datetime(2026, 1, 1, tzinfo=timezone.utc)

    registration = MagicMock()
    registration.id = 99
    registration.nocs = [noc]
    registration.noc_status = RegistrationNocStatus.NOC_PENDING
    registration.save = MagicMock()

    filter_result = MagicMock()
    filter_result.all.return_value = [registration]
    query_mock = MagicMock()
    query_mock.filter.return_value = filter_result

    with job_app.app_context():
        with patch("noc_expiry.job.Registration.query", query_mock):
            update_noc_status_for_expired_registrations(job_app)

    assert registration.noc_status == RegistrationNocStatus.NOC_EXPIRED
    registration.save.assert_called_once()


def test_update_registrations_skips_when_noc_end_after_cutoff(mocker, job_app):
    cut_off = datetime(2026, 6, 15, 12, 0, 0, tzinfo=timezone.utc)
    mocker.patch(
        "noc_expiry.job.DateUtil.as_legislation_timezone", return_value=cut_off
    )

    noc = MagicMock()
    noc.start_date = datetime(2025, 1, 1, tzinfo=timezone.utc)
    noc.end_date = datetime(2030, 1, 1, tzinfo=timezone.utc)

    registration = MagicMock()
    registration.id = 100
    registration.nocs = [noc]
    registration.noc_status = RegistrationNocStatus.NOC_PENDING
    registration.save = MagicMock()

    filter_result = MagicMock()
    filter_result.all.return_value = [registration]
    query_mock = MagicMock()
    query_mock.filter.return_value = filter_result

    with job_app.app_context():
        with patch("noc_expiry.job.Registration.query", query_mock):
            update_noc_status_for_expired_registrations(job_app)

    assert registration.noc_status == RegistrationNocStatus.NOC_PENDING
    registration.save.assert_not_called()


def test_run_invokes_both_updaters(mocker):
    mock_app = MagicMock()
    cm = MagicMock()
    cm.__enter__ = MagicMock(return_value=None)
    cm.__exit__ = MagicMock(return_value=False)
    mock_app.app_context.return_value = cm

    mocker.patch("noc_expiry.job.create_app", return_value=mock_app)
    mock_apps = mocker.patch(
        "noc_expiry.job.update_status_for_noc_expired_applications"
    )
    mock_regs = mocker.patch(
        "noc_expiry.job.update_noc_status_for_expired_registrations"
    )

    run()

    mock_apps.assert_called_once_with(mock_app)
    mock_regs.assert_called_once_with(mock_app)
