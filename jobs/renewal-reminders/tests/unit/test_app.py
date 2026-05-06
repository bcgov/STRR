"""Unit tests for renewal_reminders.app factory."""

import pytest

from renewal_reminders.app import create_app
from renewal_reminders.config import UnitTestConfig


@pytest.mark.parametrize(
    "run_arg",
    ["unittest", pytest.param(UnitTestConfig, id="UnitTestConfig")],
)
def test_create_app_wires_config_and_shell_context(mocker, run_arg):
    mocker.patch("renewal_reminders.app.db.init_app")
    app = create_app(run_arg)
    assert app.name == "renewal_reminders.app"
    assert app.shell_context_processors[0]() == {"app": app}


def test_create_app_registers_migrate_when_pod_namespace_testing(mocker):
    m_migrate = mocker.patch("renewal_reminders.app.Migrate")
    mocker.patch("renewal_reminders.app.db.init_app")

    class TestingPodConfig(UnitTestConfig):
        POD_NAMESPACE = "Testing"

    app = create_app(TestingPodConfig)
    assert app.name == "renewal_reminders.app"
    m_migrate.assert_called_once()
