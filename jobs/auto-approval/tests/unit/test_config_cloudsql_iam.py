"""Tests for auto-approval Cloud SQL configuration wiring."""

import runpy
from pathlib import Path
from unittest.mock import patch, sentinel

CONFIG_PATH = Path(__file__).resolve().parents[2] / "src/auto_approval/config.py"


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
    assert config_module["_Config"].SQLALCHEMY_DATABASE_URI is sentinel.database_uri
    assert config_module["_Config"].SQLALCHEMY_ENGINE_OPTIONS is sentinel.engine_options
