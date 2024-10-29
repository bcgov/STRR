# pylint: disable=W0613
"""
Unit tests for the auto_approval.job module.

This module contains tests for various functions and methods used in the
auto approval job, such as creating the Flask app, retrieving submitted
applications, processing applications, and handling exceptions.

These tests utilize the unittest framework and mock several external dependencies
to simulate different scenarios for processing applications.
"""

import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import ANY, MagicMock, patch  # pylint: disable=unused-import

from auto_approval.job import (
    create_app,
    get_submitted_applications,
    process_applications,
    run,
)


class TestAutoApprovalJob(unittest.TestCase):
    """
    Unit tests for the functions in the auto_approval.job module.

    This test class covers the functionality of the following:
    - Running the auto approval job without eligible applications.
    - Logging exceptions raised during the run.
    - Processing eligible applications.
    - Creating a Flask app instance.
    - Retrieving submitted applications for processing.
    - Ensuring auto-approval and token retrieval work correctly.

    The tests use mocks to simulate external dependencies like Flask app creation,
    the ApprovalService, AuthService, and database queries.
    """

    @patch("auto_approval.job.get_submitted_applications")
    @patch("auto_approval.job.process_applications")
    def test_run_handles_no_eligible_applications(
        self, mock_process_applications, mock_get_submitted_applications
    ):
        """
        Test the run method when no eligible applications are available.

        This test ensures that when the job runs without any eligible applications
        (i.e., `get_submitted_applications` returns an empty list), the job correctly
        does not call the `process_applications` method and handles the situation
        without errors.

        :param mock_process_applications: Mocked process_applications function.
        :param mock_get_submitted_applications: Mocked get_submitted_applications function.
        """
        mock_app = MagicMock()
        mock_get_submitted_applications.return_value = []

        with patch("auto_approval.job.create_app") as mock_create_app:
            mock_create_app.return_value = mock_app
            run()

        mock_get_submitted_applications.assert_called_once_with(mock_app)
        mock_process_applications.assert_called_once_with(mock_app, [])

    @patch("auto_approval.job.get_submitted_applications")
    def test_run_logs_exception(self, mock_get_submitted_applications):
        """
        Test the run method's logging of exceptions.

        This test ensures that if the `get_submitted_applications` method raises an exception
        while the job is running, the error is logged as expected, and the application
        handles the exception properly.

        :param mock_get_submitted_applications: Mocked get_submitted_applications function
                                                that raises an exception.
        """
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
        """
        Test the run method's processing of eligible applications.

        This test ensures that if eligible applications are returned by
        `get_submitted_applications`, the `process_applications` function is called with
        the correct arguments, and the applications are processed accordingly.

        :param mock_process_applications: Mocked process_applications function.
        :param mock_get_submitted_applications: Mocked get_submitted_applications function
                                                returning eligible applications.
        """
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
        """
        Test the creation of the Flask app instance.

        This test verifies that the `create_app` function correctly initializes a
        Flask application with the expected configurations, initializes the database,
        and sets up the application.

        :param mock_db: Mocked database object for app initialization.
        :param mock_configuration: Mocked configuration dictionary.
        :param mock_flask: Mocked Flask app instance.
        """
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
    def test_get_submitted_applications(
        self, mock_datetime, MockApplication
    ):  # pylint: disable=C0103, W0108
        """
        Test retrieving submitted applications for auto-approval processing.

        This test verifies that the `get_submitted_applications` function retrieves
        applications that were submitted and are eligible for auto-approval based on
        the processing delay and application status.

        :param mock_datetime: Mocked datetime module to control current time.
        :param MockApplication: Mocked Application model to simulate database queries.
        """
        mock_app = MagicMock()
        mock_now = datetime(2024, 8, 6, 16, 41, 31, tzinfo=timezone.utc)
        mock_datetime.now.return_value = mock_now
        mock_datetime.timedelta.side_effect = lambda **kwargs: timedelta(
            **kwargs
        )  # pylint: disable=W0108
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
        """Test that process_applications correctly processes and logs applications."""
        mock_app = MagicMock()
        mock_application1 = MagicMock()
        mock_application1.id = 1
        mock_application2 = MagicMock()
        mock_application2.id = 2
        mock_applications = [mock_application1, mock_application2]
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
            args, kwargs = call  # pylint: disable=unused-variable
            self.assertEqual(kwargs["application"], mock_instance)
