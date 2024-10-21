import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import ANY, MagicMock, patch

from auto_approval.job import (
    create_app,
    get_submitted_applications,
    process_applications,
    run,
)


class TestAutoApprovalJob(unittest.TestCase):
    @patch("auto_approval.job.get_submitted_applications")
    @patch("auto_approval.job.process_applications")
    def test_run_handles_no_eligible_applications(
        self, mock_process_applications, mock_get_submitted_applications
    ):
        mock_app = MagicMock()
        mock_get_submitted_applications.return_value = []

        with patch("auto_approval.job.create_app") as mock_create_app:
            mock_create_app.return_value = mock_app
            run()

        mock_get_submitted_applications.assert_called_once_with(mock_app)
        mock_process_applications.assert_called_once_with(mock_app, [])

    @patch("auto_approval.job.get_submitted_applications")
    def test_run_logs_exception(self, mock_get_submitted_applications):
        mock_app = MagicMock()
        mock_get_submitted_applications.side_effect = Exception("Test exception")

        with patch("auto_approval.job.create_app") as mock_create_app:
            mock_create_app.return_value = mock_app
            run()

        mock_app.logger.error.assert_called_once_with(
            "Unexpected error: Test exception"
        )

    @patch("auto_approval.job.get_submitted_applications")
    @patch("auto_approval.job.process_applications")
    def test_run_processes_eligible_applications(
        self, mock_process_applications, mock_get_submitted_applications
    ):
        mock_app = MagicMock()

        mock_application1 = MagicMock()
        mock_application1.id = 1
        mock_application2 = MagicMock()
        mock_application2.id = 2
        mock_get_submitted_applications.return_value = [
            mock_application1,
            mock_application2,
        ]

        with patch("auto_approval.job.create_app") as mock_create_app:
            mock_create_app.return_value = mock_app
            run()

        mock_get_submitted_applications.assert_called_once_with(mock_app)
        mock_process_applications.assert_called_once_with(
            mock_app, [mock_application1, mock_application2]
        )

    @patch("auto_approval.job.Flask")
    @patch("auto_approval.job.CONFIGURATION")
    @patch("auto_approval.job.db")
    def test_create_app(self, mock_db, mock_configuration, mock_flask):
        mock_app = MagicMock()
        mock_flask.return_value = mock_app
        mock_configuration.__getitem__.return_value = MagicMock()
        mock_app.config.__getitem__.return_value = "test_dsn"

        result = create_app()

        self.assertEqual(result, mock_app)
        mock_flask.assert_called_once_with("auto_approval.job")
        mock_app.config.from_object.assert_called_once()
        mock_db.init_app.assert_called_once_with(mock_app)

    @patch("auto_approval.job.Application")
    @patch("auto_approval.job.datetime")
    def test_get_submitted_applications(self, mock_datetime, MockApplication):
        mock_app = MagicMock()
        mock_now = datetime(2024, 8, 6, 16, 41, 31, tzinfo=timezone.utc)
        mock_datetime.now.return_value = mock_now
        mock_datetime.timedelta.side_effect = lambda **kwargs: timedelta(**kwargs)
        mock_app.config.get.return_value = 60
        MockApplication.application_date = MagicMock()
        MockApplication.status = MagicMock()
        MockApplication.Status = MagicMock()
        MockApplication.Status.SUBMITTED = "SUBMITTED"
        mock_query = MagicMock()
        MockApplication.query = mock_query
        mock_filter = MagicMock()
        mock_query.filter.return_value = mock_filter
        mock_applications = [MagicMock(), MagicMock()]
        mock_filter.all.return_value = mock_applications

        MockApplication.application_date.__le__ = lambda self, other: True

        result = get_submitted_applications(mock_app)

        self.assertEqual(result, mock_applications)
        MockApplication.query.filter.assert_called_once()
        mock_filter.all.assert_called_once()

    @patch("auto_approval.job.AuthService")
    @patch("auto_approval.job.ApprovalService")
    def test_process_applications(
        self,
        mock_approval_service,
        mock_auth_service,
    ):
        mock_app = MagicMock()
        mock_application1 = MagicMock()
        mock_application1.id = 1
        mock_application2 = MagicMock()
        mock_application2.id = 2
        mock_applications = [mock_application1, mock_application2]
        mock_token = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEiLCJ0eXAiOiJKV1QifQ.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
        mock_auth_service.get_service_client_token.return_value = mock_token
        mock_approval_service.process_auto_approval.return_value = (
            "APPROVED",
            "12345",
        )

        process_applications(mock_app, mock_applications)

        self.assertEqual(mock_approval_service.process_auto_approval.call_count, 2)
        mock_app.logger.info.assert_any_call("Auto processing application 1")
        mock_app.logger.info.assert_any_call("Auto processing application 2")
        calls = mock_approval_service.process_auto_approval.call_args_list
        for call, mock_instance in zip(calls, mock_applications):
            args, kwargs = call
            self.assertEqual(kwargs["token"], mock_token)
            self.assertEqual(kwargs["application"], mock_instance)
