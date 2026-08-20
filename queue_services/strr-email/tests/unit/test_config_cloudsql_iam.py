"""Tests for strr-email Cloud SQL configuration wiring."""

from pathlib import Path
import runpy
from unittest.mock import patch
from unittest.mock import sentinel

CONFIG_PATH = Path(__file__).resolve().parents[2] / "src/strr_email/config.py"


def test_config_uses_shared_sqlalchemy_settings():
    with (
        patch("dotenv.load_dotenv"),
        patch(
            "cloud_sql_connector.sqlalchemy_settings_from_env",
            return_value=(sentinel.database_uri, sentinel.engine_options),
        ) as settings_from_env,
    ):
        config_module = runpy.run_path(str(CONFIG_PATH))

    settings_from_env.assert_called_once_with()
    assert config_module["Config"].SQLALCHEMY_DATABASE_URI is sentinel.database_uri
    assert config_module["Config"].SQLALCHEMY_ENGINE_OPTIONS is sentinel.engine_options
