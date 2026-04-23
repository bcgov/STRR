"""Unit tests for auto-approval job (no database)."""

from __future__ import annotations

from unittest.mock import MagicMock, call, patch

import pytest
from requests.exceptions import ConnectionError as RequestsConnectionError
from requests.exceptions import HTTPError, RequestException, Timeout
from strr_api.models.application import Application

from auto_approval.config import UnitTestConfig
from auto_approval.job import (
    _generate_certificate,
    create_app,
    get_submitted_applications,
    process_applications,
    run,
)

API = "https://api.example"
AUTO = Application.Status.AUTO_APPROVED
PAID = Application.Status.PAID


@pytest.fixture
def job_app(mocker):
    mocker.patch("auto_approval.app.db.init_app")
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


@pytest.mark.parametrize(
    "run_arg",
    ["unittest", pytest.param(UnitTestConfig, id="UnitTestConfig")],
)
def test_create_app_wires_config_and_shell_context(mocker, run_arg):
    mocker.patch("auto_approval.app.db.init_app")
    app = create_app(run_arg)
    assert app.name == "auto_approval.app"
    assert app.shell_context_processors[0]() == {"app": app}


@pytest.mark.parametrize(
    ("query_rows", "expected_ids"),
    [([], []), ([MagicMock(id=42)], [42])],
    ids=["empty", "one_row"],
)
def test_get_submitted_applications_returns_query_rows(
    job_app, query_rows, expected_ids
):
    job_app.config["AUTO_APPROVAL_APPLICATION_PROCESSING_DELAY"] = 60
    filter_result = MagicMock()
    filter_result.all.return_value = query_rows
    query_mock = MagicMock()
    query_mock.filter.return_value = filter_result

    with job_app.app_context():
        with patch("auto_approval.job.Application.query", query_mock):
            result = get_submitted_applications(job_app)

    assert [r.id for r in result] == expected_ids
    query_mock.filter.assert_called_once()
    filter_args = query_mock.filter.call_args[0]
    assert len(filter_args) == 2
    assert filter_args[1].right.value == PAID


@pytest.mark.parametrize("app_ids", [[1, 2], [99]])
def test_process_applications_calls_approval_for_each_application(
    mocker, job_app, app_ids
):
    mocker.patch("auto_approval.job.AuthService.get_service_client_token")
    mock_process = mocker.patch(
        "auto_approval.job.ApprovalService.process_auto_approval"
    )
    apps = [MagicMock(id=i) for i in app_ids]

    with job_app.app_context():
        process_applications(job_app, apps)

    mock_process.assert_has_calls(
        [call(application=a) for a in apps],
        any_order=False,
    )
    assert mock_process.call_count == len(apps)


@pytest.mark.parametrize(
    ("submitted_apps", "get_side_effect", "expect_process"),
    [
        pytest.param([], None, True, id="no_apps"),
        pytest.param(
            [MagicMock(id=1), MagicMock(id=2)],
            None,
            True,
            id="two_apps",
        ),
        pytest.param(
            None,
            RuntimeError("boom"),
            False,
            id="get_raises",
        ),
    ],
)
def test_run_invokes_pipeline_or_logs_on_failure(
    mocker,
    mock_flask_app_for_run,
    submitted_apps,
    get_side_effect,
    expect_process,
):
    mocker.patch("auto_approval.job.create_app", return_value=mock_flask_app_for_run)
    get_mock = mocker.patch(
        "auto_approval.job.get_submitted_applications",
        side_effect=get_side_effect,
        return_value=submitted_apps,
    )
    mock_process = mocker.patch("auto_approval.job.process_applications")

    run()

    if get_side_effect is not None:
        get_mock.assert_called_once_with(mock_flask_app_for_run)
        mock_process.assert_not_called()
        mock_flask_app_for_run.logger.error.assert_called_once_with(
            "Unexpected error: boom"
        )
        return

    mock_process.assert_called_once_with(mock_flask_app_for_run, submitted_apps)


@pytest.mark.parametrize(
    ("status", "registration_id"),
    [
        (Application.Status.DECLINED, 9),
        (AUTO, None),
    ],
    ids=["not_auto_approved", "no_registration_id"],
)
def test_generate_certificate_skips_post_when_not_eligible(
    mocker, job_app, status, registration_id
):
    job_app.config["STRR_API_URL"] = API
    m_post = mocker.patch("auto_approval.job.requests.post")

    with job_app.app_context():
        _generate_certificate(job_app, "token", status, registration_id)

    m_post.assert_not_called()


def test_generate_certificate_posts_with_expected_url_and_headers(mocker, job_app):
    job_app.config["STRR_API_URL"] = API
    m_post = mocker.patch("auto_approval.job.requests.post")
    m_post.return_value = MagicMock(status_code=201, raise_for_status=MagicMock())

    with job_app.app_context():
        _generate_certificate(job_app, "token", AUTO, 7)

    m_post.assert_called_once()
    assert m_post.call_args[0][0] == f"{API}/registrations/7/certificate"
    assert m_post.call_args[1]["headers"]["Authorization"] == "Bearer token"
    assert m_post.call_args[1]["headers"]["Content-Type"] == "application/json"


def test_generate_certificate_logs_when_response_not_created(mocker, job_app):
    job_app.config["STRR_API_URL"] = API
    m_post = mocker.patch("auto_approval.job.requests.post")
    m_post.return_value = MagicMock(status_code=200, raise_for_status=MagicMock())
    mock_log = mocker.patch.object(job_app, "logger", MagicMock())

    with job_app.app_context():
        _generate_certificate(job_app, "token", AUTO, 3)

    m_post.assert_called_once()
    mock_log.error.assert_called_once()
    assert "200" in mock_log.error.call_args[0][0]


@pytest.mark.parametrize(
    "exc",
    [
        pytest.param(Timeout("timed out"), id="timeout"),
        pytest.param(HTTPError("bad"), id="http_error"),
        pytest.param(RequestsConnectionError("refused"), id="connection_error"),
    ],
)
def test_generate_certificate_logs_network_errors(mocker, job_app, exc):
    job_app.config["STRR_API_URL"] = API
    m_post = mocker.patch("auto_approval.job.requests.post", side_effect=exc)
    mock_log = mocker.patch.object(job_app, "logger", MagicMock())

    with job_app.app_context():
        _generate_certificate(job_app, "token", AUTO, 2)

    m_post.assert_called_once()
    mock_log.error.assert_called_once()
    assert "network error" in mock_log.error.call_args[0][0].lower()


def test_generate_certificate_logs_request_exception(mocker, job_app):
    job_app.config["STRR_API_URL"] = API
    m_post = mocker.patch(
        "auto_approval.job.requests.post",
        side_effect=RequestException("other"),
    )
    mock_log = mocker.patch.object(job_app, "logger", MagicMock())

    with job_app.app_context():
        _generate_certificate(job_app, "token", AUTO, 2)

    m_post.assert_called_once()
    mock_log.error.assert_called_once()
    assert "Request error" in mock_log.error.call_args[0][0]


def test_generate_certificate_logs_unexpected_errors(mocker, job_app):
    job_app.config["STRR_API_URL"] = API
    m_post = mocker.patch(
        "auto_approval.job.requests.post",
        side_effect=ValueError("weird"),
    )
    mock_log = mocker.patch.object(job_app, "logger", MagicMock())

    with job_app.app_context():
        _generate_certificate(job_app, "token", AUTO, 2)

    m_post.assert_called_once()
    mock_log.error.assert_called_once()
    assert "Unexpected error" in mock_log.error.call_args[0][0]
