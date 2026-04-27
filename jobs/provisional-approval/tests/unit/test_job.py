"""Unit tests for provisional_approval job (no database)."""

from unittest.mock import MagicMock, call, patch

import pytest
from strr_api.models.application import Application
from strr_api.models.events import Events

from provisional_approval.job import (
    create_app,
    get_applications_in_full_review_status,
    process_applications,
    run,
)


def test_create_app_factory(mocker):
    mocker.patch("provisional_approval.job.db.init_app")
    app = create_app("unittest")
    assert app.name == "provisional_approval.job"


def test_register_shellcontext_exposes_app(mocker):
    mocker.patch("provisional_approval.job.db.init_app")
    app = create_app("unittest")
    processor = app.shell_context_processors[0]
    assert processor() == {"app": app}


def test_get_applications_returns_limited_query(job_app):
    job_app.config["BATCH_SIZE"] = "25"
    limited_query = MagicMock()
    filter_result = MagicMock()
    filter_result.order_by.return_value.limit.return_value = limited_query
    query_mock = MagicMock()
    query_mock.filter.return_value = filter_result

    with job_app.app_context():
        with patch("provisional_approval.job.Application.query", query_mock):
            result = get_applications_in_full_review_status(job_app)

    assert result is limited_query
    query_mock.filter.assert_called_once()
    filter_args = query_mock.filter.call_args[0]
    assert len(filter_args) == 3
    filter_result.order_by.assert_called_once_with(Application.id)
    filter_result.order_by.return_value.limit.assert_called_once_with(25)


def test_process_applications_calls_approval_service(mocker, job_app):
    mock_approve = mocker.patch(
        "provisional_approval.job.ApprovalService.approve_application"
    )
    apps = [MagicMock(id=1), MagicMock(id=2)]

    with job_app.app_context():
        process_applications(apps)

    mock_approve.assert_has_calls(
        [
            call(
                application=apps[0],
                status=Application.Status.PROVISIONAL_REVIEW,
                event=Events.EventName.AUTO_APPROVAL_PROVISIONAL,
            ),
            call(
                application=apps[1],
                status=Application.Status.PROVISIONAL_REVIEW,
                event=Events.EventName.AUTO_APPROVAL_PROVISIONAL,
            ),
        ],
        any_order=False,
    )


def test_process_applications_logs_on_error(mocker, job_app):
    mocker.patch(
        "provisional_approval.job.ApprovalService.approve_application",
        side_effect=RuntimeError("db error"),
    )
    mock_logger = mocker.patch("provisional_approval.job.logger")
    apps = [MagicMock(id=9)]

    with job_app.app_context():
        process_applications(apps)

    mock_logger.error.assert_any_call(
        "Unexpected error while processing application: 9"
    )
    assert mock_logger.error.call_count >= 2


@pytest.mark.parametrize(
    ("get_side_effect", "expect_process"),
    [
        pytest.param(None, True, id="success"),
        pytest.param(RuntimeError("boom"), False, id="get_raises"),
    ],
)
def test_run_invokes_pipeline_or_logs_on_failure(
    mocker,
    get_side_effect,
    expect_process,
):
    mock_app = MagicMock()
    cm = MagicMock()
    cm.__enter__ = MagicMock(return_value=None)
    cm.__exit__ = MagicMock(return_value=False)
    mock_app.app_context.return_value = cm

    mocker.patch("provisional_approval.job.create_app", return_value=mock_app)
    get_mock = mocker.patch(
        "provisional_approval.job.get_applications_in_full_review_status",
        side_effect=get_side_effect,
        return_value=[],
    )
    mock_process = mocker.patch("provisional_approval.job.process_applications")
    mock_logger = mocker.patch("provisional_approval.job.logger")

    run()

    if not expect_process:
        get_mock.assert_called_once_with(mock_app)
        mock_process.assert_not_called()
        mock_logger.error.assert_called_once_with("Unexpected error: boom")
        return

    mock_process.assert_called_once_with([])
