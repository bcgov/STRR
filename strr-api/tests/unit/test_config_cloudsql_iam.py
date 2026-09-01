"""Tests for strr-api Cloud SQL configuration wiring."""

import os
import runpy
from pathlib import Path
from unittest.mock import patch, sentinel

import pytest

CONFIG_PATH = Path(__file__).resolve().parents[2] / "src/strr_api/config.py"


@pytest.mark.parametrize(
    ("environment", "expected_namespace", "expected_username_env"),
    (
        ({"POD_NAMESPACE": "local"}, "production", "DATABASE_USERNAME"),
        (
            {"DEPLOYMENT_ENV": "migration", "POD_NAMESPACE": "production"},
            "migration",
            "DATABASE_MIGRATION_USERNAME",
        ),
    ),
)
def test_production_config_uses_shared_database_settings(environment, expected_namespace, expected_username_env):
    with (
        patch.dict(os.environ, environment, clear=True),
        patch("dotenv.load_dotenv"),
        patch(
            "cloud_sql_connector.sqlalchemy_settings_from_env",
            return_value=(sentinel.database_uri, sentinel.engine_options),
        ) as settings_from_env,
    ):
        config_module = runpy.run_path(str(CONFIG_PATH))

    settings_from_env.assert_called_once_with(iam_username_env=expected_username_env)
    production = config_module["Production"]
    assert production.POD_NAMESPACE == expected_namespace
    assert production.SQLALCHEMY_DATABASE_URI is sentinel.database_uri
    assert production.SQLALCHEMY_ENGINE_OPTIONS is sentinel.engine_options
