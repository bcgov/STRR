from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from strr_api.models import Application, Events, NoticeOfConsideration
from strr_api.services.events_service import EventsService
from strr_api.utils.date_util import DateUtil

from noc_expiry.job import update_status_for_noc_expired_applications


@pytest.fixture
def mock_application():
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
def mock_valid_application():
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
    app, mock_application, mock_valid_application
):
    with app.app_context():
        with patch.object(Application, "query") as mock_query:
            mock_query.filter.return_value.all.return_value = [
                mock_application,
                mock_valid_application,
            ]

            mock_application.save = lambda: None
            mock_valid_application.save = lambda: None

            with patch.object(EventsService, "save_event") as mock_save_event:
                update_status_for_noc_expired_applications(app)

                assert mock_application.status == Application.Status.NOC_EXPIRED
                assert mock_valid_application.status == Application.Status.NOC_PENDING
                mock_save_event.assert_called_once_with(
                    event_type=Events.EventType.APPLICATION,
                    event_name=Events.EventName.NOC_EXPIRED,
                    application_id=mock_application.id,
                )


def test_update_status_handles_exceptions(app, mock_application):
    with app.app_context():
        with patch.object(Application, "query") as mock_query:
            mock_query.filter.return_value.all.return_value = [mock_application]

            # Use a safer way to simulate an exception
            def raise_exception():
                raise Exception("Test exception")

            mock_application.save = raise_exception
            update_status_for_noc_expired_applications(app)
