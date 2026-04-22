"""Unit tests for registration_expiry job (no database)."""

import logging
from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest
from strr_api.enums.enum import RegistrationStatus

from registration_expiry.job import (
    create_app,
    run,
    update_status_for_registration_expired_applications,
)


@pytest.fixture
def job_app(mocker):
    mocker.patch("registration_expiry.job.db.init_app")
    return create_app("unittest")


def test_create_app_factory(mocker):
    mocker.patch("registration_expiry.job.db.init_app")
    app = create_app("unittest")
    assert app.name == "registration_expiry.job"


def test_register_shellcontext_exposes_app(mocker):
    mocker.patch("registration_expiry.job.db.init_app")
    app = create_app("unittest")
    processor = app.shell_context_processors[0]
    assert processor() == {"app": app}


def test_update_status_expires_rentals_and_saves_event(mocker, job_app):
    rental = MagicMock()
    rental.id = 42
    rental.save = MagicMock()

    mocker.patch(
        "registration_expiry.job.DateUtil.as_legislation_timezone",
        return_value=datetime(2025, 6, 1, 12, 0, 0),
    )

    save_event = mocker.patch("registration_expiry.job.EventsService.save_event")

    filter_result = MagicMock()
    filter_result.all.return_value = [rental]
    query_mock = MagicMock()
    query_mock.filter.return_value = filter_result

    with job_app.app_context():
        with patch("registration_expiry.job.Registration.query", query_mock):
            update_status_for_registration_expired_applications(job_app)

    assert rental.status == RegistrationStatus.EXPIRED.value
    rental.save.assert_called_once()
    save_event.assert_called_once()


def test_update_status_no_rentals(mocker, job_app, caplog):
    mocker.patch(
        "registration_expiry.job.DateUtil.as_legislation_timezone",
        return_value=datetime(2025, 1, 1),
    )

    filter_result = MagicMock()
    filter_result.all.return_value = []
    query_mock = MagicMock()
    query_mock.filter.return_value = filter_result

    with job_app.app_context():
        with patch("registration_expiry.job.Registration.query", query_mock):
            with caplog.at_level(logging.INFO):
                update_status_for_registration_expired_applications(job_app)

    assert "Processing registration" not in caplog.text


def test_update_status_logs_on_rental_processing_error(mocker, job_app, caplog):
    rental = MagicMock()
    rental.id = 7
    rental.save = MagicMock(side_effect=RuntimeError("db error"))

    mocker.patch(
        "registration_expiry.job.DateUtil.as_legislation_timezone",
        return_value=datetime(2025, 1, 1),
    )

    mocker.patch("registration_expiry.job.EventsService.save_event")

    filter_result = MagicMock()
    filter_result.all.return_value = [rental]
    query_mock = MagicMock()
    query_mock.filter.return_value = filter_result

    with job_app.app_context():
        with patch("registration_expiry.job.Registration.query", query_mock):
            with caplog.at_level(logging.ERROR):
                update_status_for_registration_expired_applications(job_app)

    assert "Unexpected error" in caplog.text


def test_run_invokes_update_status_job(mocker):
    mock_app = MagicMock()
    cm = MagicMock()
    cm.__enter__ = MagicMock(return_value=None)
    cm.__exit__ = MagicMock(return_value=False)
    mock_app.app_context.return_value = cm

    mocker.patch("registration_expiry.job.create_app", return_value=mock_app)
    mock_update = mocker.patch(
        "registration_expiry.job.update_status_for_registration_expired_applications"
    )

    run()

    mock_update.assert_called_once_with(mock_app)
