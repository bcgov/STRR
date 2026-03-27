from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest

from auto_approval.job import (
    create_app,
    get_submitted_applications,
    process_applications,
    run,
)

# --- Fixtures ---


@pytest.fixture
def mock_app():
    """Provides a mocked Flask app instance."""
    app = MagicMock()
    app.logger = MagicMock()
    app.config = {}
    return app


@pytest.fixture
def mock_application():
    """Provides a mocked Application model."""
    with patch("auto_approval.job.Application") as mock:
        mock.Status = MagicMock()
        mock.Status.SUBMITTED = "SUBMITTED"
        yield mock


# --- Tests ---


def test_run_handles_no_eligible_applications(mock_app):
    """Test the run method when no eligible applications are available."""
    with patch("auto_approval.job.create_app", return_value=mock_app), patch(
        "auto_approval.job.get_submitted_applications", return_value=[]
    ) as mock_get, patch("auto_approval.job.process_applications") as mock_process:

        run()

        mock_get.assert_called_once_with(mock_app)
        mock_process.assert_called_once_with(mock_app, [])


def test_run_logs_exception(mock_app):
    """Test that exceptions during run are logged correctly."""
    with patch("auto_approval.job.create_app", return_value=mock_app), patch(
        "auto_approval.job.get_submitted_applications",
        side_effect=Exception("Test exception"),
    ):

        run()

        mock_app.logger.error.assert_called_once_with(
            "Unexpected error: Test exception"
        )


def test_run_processes_eligible_applications(mock_app):
    """Test that eligible applications trigger the processing logic."""
    apps = [MagicMock(id=1), MagicMock(id=2)]

    with patch("auto_approval.job.create_app", return_value=mock_app), patch(
        "auto_approval.job.get_submitted_applications", return_value=apps
    ), patch("auto_approval.job.process_applications") as mock_process:

        run()

        mock_process.assert_called_once_with(mock_app, apps)


@patch("auto_approval.job.datetime")
def test_get_submitted_applications(mock_dt, mock_app, mock_application):
    """Test filtered query for submitted applications."""
    # 1. Setup predictable time
    mock_now = datetime(2024, 8, 6, 16, 41, 31, tzinfo=timezone.utc)
    mock_dt.now.return_value = mock_now
    mock_dt.timedelta.side_effect = lambda **kwargs: timedelta(**kwargs)

    # 2. Fix the config mock
    # Re-assigning it to a MagicMock allows .get.return_value to work
    mock_app.config = MagicMock()
    mock_app.config.get.return_value = 60

    # 3. Setup the Application Mock behavior to survive comparisons
    # We use a lambda or a mock to handle the <= comparison
    mock_application.application_date.__le__ = MagicMock(return_value=True)
    mock_application.status.__eq__ = MagicMock(return_value=True)
    mock_application.Status.PAID = "PAID"

    # 4. Chain the query mocks
    mock_results = [MagicMock(id=1), MagicMock(id=2)]
    # Ensure the filter chain works correctly
    mock_application.query.filter.return_value.all.return_value = mock_results

    # 5. Execute
    result = get_submitted_applications(mock_app)

    # 6. Assertions
    assert result == mock_results
    mock_application.query.filter.assert_called_once()


@patch("auto_approval.job.AuthService")
@patch("auto_approval.job.ApprovalService")
def test_process_applications(mock_approval_service, mock_auth_service, mock_app):
    """Test that applications are passed to the ApprovalService correctly."""
    apps = [MagicMock(id=1), MagicMock(id=2)]
    mock_approval_service.process_auto_approval.return_value = ("APPROVED", "12345")

    process_applications(mock_app, apps)

    assert mock_approval_service.process_auto_approval.call_count == 2
    mock_app.logger.info.assert_any_call("Auto processing application 1")
    mock_app.logger.info.assert_any_call("Auto processing application 2")
