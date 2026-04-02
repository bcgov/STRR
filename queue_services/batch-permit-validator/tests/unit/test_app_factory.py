"""Tests for ``create_app`` (Sentry and wiring)."""

from batch_permit_validator import create_app
from batch_permit_validator.config import UnitTestConfig


class _UnitTestConfigWithSentry(UnitTestConfig):
    SENTRY_DSN = "https://examplePublicKey@o0.ingest.sentry.io/0"


class _UnitTestConfigNoSentry(UnitTestConfig):
    """Force no DSN so Sentry init is skipped regardless of process env."""

    SENTRY_DSN = None


def test_create_app_initializes_sentry_when_dsn_configured(mocker):
    mock_init = mocker.patch("batch_permit_validator.sentry_sdk.init")
    app = create_app(environment=_UnitTestConfigWithSentry)
    assert app is not None
    mock_init.assert_called_once()
    call_kw = mock_init.call_args.kwargs
    assert call_kw["dsn"] == _UnitTestConfigWithSentry.SENTRY_DSN
    assert call_kw["send_default_pii"] is False
    integrations = call_kw["integrations"]
    assert len(integrations) == 1
    assert integrations[0].__class__.__name__ == "FlaskIntegration"


def test_create_app_skips_sentry_without_dsn(mocker):
    mock_init = mocker.patch("batch_permit_validator.sentry_sdk.init")
    app = create_app(environment=_UnitTestConfigNoSentry)
    assert app is not None
    mock_init.assert_not_called()
