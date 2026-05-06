"""Unit tests for renewal reminder job (no database)."""

from __future__ import annotations

from datetime import datetime
from datetime import timezone
from unittest.mock import call
from unittest.mock import MagicMock
from unittest.mock import patch

from freezegun import freeze_time
import pytest
from strr_api.models.application import Application
from strr_api.models.rental import Registration
from strr_api.services.events_service import Events

from renewal_reminders.job import create_app
from renewal_reminders.job import renewal_job_key
from renewal_reminders.job import run
from renewal_reminders.job import send_final_day_reminder
from renewal_reminders.job import send_forty_days_reminder
from renewal_reminders.job import send_fourteen_days_reminder
from renewal_reminders.job import send_sixty_days_reminder_for_strata_hotels
from renewal_reminders.job import send_thirty_days_reminder_for_strata_hotels


@pytest.fixture
def job_app(mocker):
    mocker.patch("renewal_reminders.app.db.init_app")
    return create_app("unittest")


@pytest.fixture
def mock_flask_app_for_run(mocker):
    """Minimal Flask app stub used when exercising ``run()`` in isolation."""
    mock_app = MagicMock()
    context = MagicMock()
    context.__enter__ = MagicMock(return_value=None)
    context.__exit__ = MagicMock(return_value=False)
    mock_app.app_context.return_value = context
    return mock_app


def _registration_query_mock(registrations):
    filter_result = MagicMock()
    filter_result.all.return_value = registrations
    query_mock = MagicMock()
    query_mock.filter.return_value = filter_result
    return query_mock


def _application_query_first_mock(first_return):
    query_mock = MagicMock()
    order_mock = MagicMock()
    order_mock.first.return_value = first_return
    filter_mock = MagicMock()
    filter_mock.order_by.return_value = order_mock
    query_mock.filter.return_value = filter_mock
    return query_mock


def test_renewal_job_key_format():
    assert (
        renewal_job_key(datetime(2027, 3, 15, tzinfo=timezone.utc), 14)
        == "2027:RENEWAL_REMINDER:14"
    )


@freeze_time("2026-06-01 12:00:00+00:00")
def test_send_forty_days_reminder_sends_email_and_event(job_app, mocker):
    reg = MagicMock()
    reg.id = 101

    mock_email = mocker.patch(
        "renewal_reminders.job.EmailService.send_renewal_reminder_for_registration"
    )
    mock_events = mocker.patch("renewal_reminders.job.EventsService.save_event")

    with job_app.app_context():
        with patch(
            "renewal_reminders.job.Registration.query",
            _registration_query_mock([reg]),
        ):
            send_forty_days_reminder(job_app, Registration.RegistrationType.HOST)

    expected_key = "2026:RENEWAL_REMINDER:40"
    mock_email.assert_called_once_with(registration=reg, interaction=expected_key)
    mock_events.assert_called_once_with(
        event_type=Events.EventType.REGISTRATION,
        event_name=Events.EventName.RENEWAL_REMINDER_SENT,
        registration_id=101,
    )


@freeze_time("2026-06-01 12:00:00+00:00")
def test_send_forty_days_reminder_no_registrations(job_app, mocker):
    mock_email = mocker.patch(
        "renewal_reminders.job.EmailService.send_renewal_reminder_for_registration"
    )
    mock_events = mocker.patch("renewal_reminders.job.EventsService.save_event")

    with job_app.app_context():
        with patch(
            "renewal_reminders.job.Registration.query",
            _registration_query_mock([]),
        ):
            send_forty_days_reminder(job_app, Registration.RegistrationType.PLATFORM)

    mock_email.assert_not_called()
    mock_events.assert_not_called()


@pytest.mark.parametrize(
    ("handler", "registration_type_arg"),
    [
        (send_fourteen_days_reminder, Registration.RegistrationType.HOST),
        (send_final_day_reminder, Registration.RegistrationType.PLATFORM),
    ],
)
@freeze_time("2026-06-01 12:00:00+00:00")
def test_send_reminder_skips_when_renewal_application_not_draft_or_payment_due(
    job_app, mocker, handler, registration_type_arg
):
    """When latest renewal application exists and is past draft/payment-due, skip reminder."""
    reg = MagicMock()
    reg.id = 55

    renewal_app = MagicMock()
    renewal_app.status = Application.Status.FULL_REVIEW

    mock_email = mocker.patch(
        "renewal_reminders.job.EmailService.send_renewal_reminder_for_registration"
    )

    with job_app.app_context():
        with patch(
            "renewal_reminders.job.Registration.query",
            _registration_query_mock([reg]),
        ):
            with patch(
                "renewal_reminders.job.Application.query",
                _application_query_first_mock(renewal_app),
            ):
                handler(job_app, registration_type_arg)

    mock_email.assert_not_called()


@pytest.mark.parametrize(
    ("handler", "registration_type_arg", "expected_days_suffix"),
    [
        (send_fourteen_days_reminder, Registration.RegistrationType.HOST, "14"),
        (send_final_day_reminder, Registration.RegistrationType.HOST, "0"),
    ],
)
@freeze_time("2026-06-01 12:00:00+00:00")
def test_send_reminder_sends_when_no_renewal_application(
    job_app, mocker, handler, registration_type_arg, expected_days_suffix
):
    reg = MagicMock()
    reg.id = 77

    mock_email = mocker.patch(
        "renewal_reminders.job.EmailService.send_renewal_reminder_for_registration"
    )
    mock_events = mocker.patch("renewal_reminders.job.EventsService.save_event")

    with job_app.app_context():
        with patch(
            "renewal_reminders.job.Registration.query",
            _registration_query_mock([reg]),
        ):
            with patch(
                "renewal_reminders.job.Application.query",
                _application_query_first_mock(None),
            ):
                handler(job_app, registration_type_arg)

    expected_key = f"2026:RENEWAL_REMINDER:{expected_days_suffix}"
    mock_email.assert_called_once_with(registration=reg, interaction=expected_key)
    mock_events.assert_called_once()


@pytest.mark.parametrize(
    "status",
    [Application.Status.DRAFT, Application.Status.PAYMENT_DUE],
)
@freeze_time("2026-06-01 12:00:00+00:00")
def test_send_fourteen_days_sends_when_renewal_in_draft_or_payment_due(job_app, mocker, status):
    reg = MagicMock()
    reg.id = 88

    renewal_app = MagicMock()
    renewal_app.status = status

    mock_email = mocker.patch(
        "renewal_reminders.job.EmailService.send_renewal_reminder_for_registration"
    )
    mocker.patch("renewal_reminders.job.EventsService.save_event")

    with job_app.app_context():
        with patch(
            "renewal_reminders.job.Registration.query",
            _registration_query_mock([reg]),
        ):
            with patch(
                "renewal_reminders.job.Application.query",
                _application_query_first_mock(renewal_app),
            ):
                send_fourteen_days_reminder(job_app, Registration.RegistrationType.HOST)

    mock_email.assert_called_once()


@freeze_time("2026-06-01 12:00:00+00:00")
def test_send_sixty_days_strata_hotel_sends_without_application_query(job_app, mocker):
    reg = MagicMock()
    reg.id = 200

    mock_email = mocker.patch(
        "renewal_reminders.job.EmailService.send_renewal_reminder_for_registration"
    )
    mock_events = mocker.patch("renewal_reminders.job.EventsService.save_event")

    with job_app.app_context():
        with patch(
            "renewal_reminders.job.Registration.query",
            _registration_query_mock([reg]),
        ):
            send_sixty_days_reminder_for_strata_hotels(job_app)

    mock_email.assert_called_once_with(registration=reg, interaction="2026:RENEWAL_REMINDER:60")
    mock_events.assert_called_once()


@freeze_time("2026-06-01 12:00:00+00:00")
def test_send_thirty_days_strata_skips_when_renewal_application_active(job_app, mocker):
    reg = MagicMock()
    reg.id = 201

    renewal_app = MagicMock()
    renewal_app.status = Application.Status.AUTO_APPROVED

    mock_email = mocker.patch(
        "renewal_reminders.job.EmailService.send_renewal_reminder_for_registration"
    )

    with job_app.app_context():
        with patch(
            "renewal_reminders.job.Registration.query",
            _registration_query_mock([reg]),
        ):
            with patch(
                "renewal_reminders.job.Application.query",
                _application_query_first_mock(renewal_app),
            ):
                send_thirty_days_reminder_for_strata_hotels(job_app)

    mock_email.assert_not_called()


@freeze_time("2026-06-01 12:00:00+00:00")
def test_send_thirty_days_strata_sends_when_eligible(job_app, mocker):
    reg = MagicMock()
    reg.id = 202

    renewal_app = MagicMock()
    renewal_app.status = Application.Status.PAYMENT_DUE

    mock_email = mocker.patch(
        "renewal_reminders.job.EmailService.send_renewal_reminder_for_registration"
    )
    mocker.patch("renewal_reminders.job.EventsService.save_event")

    with job_app.app_context():
        with patch(
            "renewal_reminders.job.Registration.query",
            _registration_query_mock([reg]),
        ):
            with patch(
                "renewal_reminders.job.Application.query",
                _application_query_first_mock(renewal_app),
            ):
                send_thirty_days_reminder_for_strata_hotels(job_app)

    mock_email.assert_called_once()


def test_run_invokes_all_reminder_steps(mocker, mock_flask_app_for_run):
    m40 = mocker.patch("renewal_reminders.job.send_forty_days_reminder")
    m14 = mocker.patch("renewal_reminders.job.send_fourteen_days_reminder")
    mfinal = mocker.patch("renewal_reminders.job.send_final_day_reminder")
    m60 = mocker.patch("renewal_reminders.job.send_sixty_days_reminder_for_strata_hotels")
    m30 = mocker.patch("renewal_reminders.job.send_thirty_days_reminder_for_strata_hotels")

    run(mock_flask_app_for_run)

    host = Registration.RegistrationType.HOST
    platform = Registration.RegistrationType.PLATFORM

    m40.assert_has_calls(
        [
            call(mock_flask_app_for_run, registration_type=host),
            call(mock_flask_app_for_run, registration_type=platform),
        ]
    )
    m14.assert_has_calls(
        [
            call(mock_flask_app_for_run, registration_type=host),
            call(mock_flask_app_for_run, registration_type=platform),
        ]
    )
    mfinal.assert_called_once_with(mock_flask_app_for_run, registration_type=host)
    m60.assert_called_once_with(mock_flask_app_for_run)
    m30.assert_called_once_with(mock_flask_app_for_run)


def test_run_creates_app_when_none(mocker, mock_flask_app_for_run):
    mock_create = mocker.patch(
        "renewal_reminders.job.create_app", return_value=mock_flask_app_for_run
    )
    mocker.patch("renewal_reminders.job.send_forty_days_reminder")
    mocker.patch("renewal_reminders.job.send_fourteen_days_reminder")
    mocker.patch("renewal_reminders.job.send_final_day_reminder")
    mocker.patch("renewal_reminders.job.send_sixty_days_reminder_for_strata_hotels")
    mocker.patch("renewal_reminders.job.send_thirty_days_reminder_for_strata_hotels")

    run()

    mock_create.assert_called_once_with()
    mock_flask_app_for_run.logger.info.assert_called()


def test_run_logs_on_unexpected_error(mocker, mock_flask_app_for_run):
    mocker.patch(
        "renewal_reminders.job.send_forty_days_reminder",
        side_effect=RuntimeError("boom"),
    )

    run(mock_flask_app_for_run)

    mock_flask_app_for_run.logger.error.assert_called()
    assert mock_flask_app_for_run.logger.error.call_count >= 2
