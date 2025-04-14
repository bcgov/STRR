"""
Unit tests for the NOC expiry job.
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from strr_api.models import Application, Events, NoticeOfConsideration
from strr_api.services.events_service import EventsService
from strr_api.utils.date_util import DateUtil

from noc_expiry.job import update_status_for_noc_expired_applications


@pytest.fixture
def mock_application_noc_expired():
    """Mock Application with an expired NOC."""
    application = Application()
    application.id = 1
    application.status = Application.Status.NOC_PENDING

    noc = NoticeOfConsideration()
    noc.id = 1
    noc.application_id = application.id
    noc.content = "Test NOC content"
    noc.start_date = DateUtil.as_legislation_timezone(
        datetime.now(timezone.utc) - timedelta(days=30)
    )
    noc.end_date = DateUtil.as_legislation_timezone(
        datetime.now(timezone.utc) - timedelta(days=1)
    )
    noc.creation_date = DateUtil.as_legislation_timezone(
        datetime.now(timezone.utc) - timedelta(days=30)
    )

    application.noc = noc
    return application


@pytest.fixture
def mock_application_noc_pending():
    """Mock Application with a pending NOC."""
    application = Application()
    application.id = 2
    application.status = Application.Status.NOC_PENDING

    noc = NoticeOfConsideration()
    noc.id = 2
    noc.application_id = application.id
    noc.content = "Test NOC content"
    noc.start_date = DateUtil.as_legislation_timezone(datetime.now(timezone.utc))
    noc.end_date = DateUtil.as_legislation_timezone(
        datetime.now(timezone.utc) + timedelta(days=30)
    )
    noc.creation_date = DateUtil.as_legislation_timezone(datetime.now(timezone.utc))

    application.noc = noc
    return application


def test_update_status_for_noc_expired_applications(
    app, mock_application_noc_expired, mock_application_noc_pending
):  # pylint: disable=W0621
    """Test that expired NOC applications are updated to NOC_EXPIRED status."""
    with app.app_context():
        with patch.object(Application, "query") as mock_query:
            mock_query.filter.return_value.all.return_value = [
                mock_application_noc_expired,
                mock_application_noc_pending,
            ]

            mock_application_noc_expired.save = lambda: None
            mock_application_noc_pending.save = lambda: None

            with patch.object(EventsService, "save_event") as mock_save_event:
                update_status_for_noc_expired_applications(app)

                assert (
                    mock_application_noc_expired.status
                    == Application.Status.NOC_EXPIRED
                )
                assert (
                    mock_application_noc_pending.status
                    == Application.Status.NOC_PENDING
                )
                mock_save_event.assert_called_once_with(
                    event_type=Events.EventType.APPLICATION,
                    event_name=Events.EventName.NOC_EXPIRED,
                    application_id=mock_application_noc_expired.id,
                )


def test_update_status_handles_exceptions(
    app, mock_application_noc_expired
):  # pylint: disable=W0621
    """Test that exceptions are handled gracefully."""
    with app.app_context():
        with patch.object(Application, "query") as mock_query:
            mock_query.filter.return_value.all.return_value = [
                mock_application_noc_expired
            ]

            def raise_exception():
                raise ValueError("Test exception")

            mock_application_noc_expired.save = raise_exception
            update_status_for_noc_expired_applications(app)
