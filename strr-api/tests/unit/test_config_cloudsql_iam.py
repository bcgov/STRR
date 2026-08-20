"""Tests for strr-api Cloud SQL IAM database configuration."""

import importlib

import dotenv
import pytest
from cloud_sql_connector import connector as connector_module

ENV_KEYS = (
    "CLOUD_RUN_JOB",
    "CLOUDSQL_INSTANCE_CONNECTION_NAME",
    "CLOUDSQL_IP_TYPE",
    "DATABASE_HOST",
    "DATABASE_MIGRATION_USERNAME",
    "DATABASE_NAME",
    "DATABASE_PASSWORD",
    "DATABASE_PORT",
    "DATABASE_UNIX_SOCKET",
    "DATABASE_USERNAME",
    "DEPLOYMENT_ENV",
    "K_SERVICE",
    "POD_NAMESPACE",
)


def _clear_env(monkeypatch):
    for env_name in ENV_KEYS:
        monkeypatch.delenv(env_name, raising=False)


def _reload_config(monkeypatch, **env):
    _clear_env(monkeypatch)
    # Keep these tests independent from each developer's local .env file.
    monkeypatch.setattr(dotenv, "load_dotenv", lambda *_args, **_kwargs: False)
    for env_name, value in env.items():
        monkeypatch.setenv(env_name, value)

    from strr_api import config as config_module

    return importlib.reload(config_module)


def _connector_config(monkeypatch, config_module):
    calls = {}

    def fake_getconn(config):
        calls["config"] = config
        return "connection"

    monkeypatch.setattr(connector_module, "getconn", fake_getconn)
    creator = config_module.Production.SQLALCHEMY_ENGINE_OPTIONS["creator"]
    assert creator() == "connection"
    return calls["config"]


def test_production_config_uses_cloudsql_iam_connector(monkeypatch):
    config_module = _reload_config(
        monkeypatch,
        CLOUDSQL_INSTANCE_CONNECTION_NAME="bcrbk9-prod:northamerica-northeast1:strr-db-prod",
        CLOUDSQL_IP_TYPE="PUBLIC",
        DEPLOYMENT_ENV="production",
        DATABASE_NAME="strr-db",
        DATABASE_USERNAME="sa-api@bcrbk9-prod.iam",
    )

    assert config_module.Production.SQLALCHEMY_DATABASE_URI == "postgresql+pg8000://"
    config = _connector_config(monkeypatch, config_module)
    assert config.instance_name == "bcrbk9-prod:northamerica-northeast1:strr-db-prod"
    assert config.database == "strr-db"
    assert config.user == "sa-api@bcrbk9-prod.iam"
    assert config.ip_type == "PUBLIC"
    assert config.enable_iam_auth is True


def test_migration_mode_uses_migration_iam_username_on_production_config(monkeypatch):
    config_module = _reload_config(
        monkeypatch,
        CLOUDSQL_INSTANCE_CONNECTION_NAME="bcrbk9-dev:northamerica-northeast1:strr-db-dev",
        CLOUDSQL_IP_TYPE="PRIVATE",
        DEPLOYMENT_ENV="migration",
        DATABASE_MIGRATION_USERNAME="sa-db-migrate@bcrbk9-dev.iam",
        DATABASE_NAME="strr-db",
    )

    assert config_module.Production.SQLALCHEMY_DATABASE_URI == "postgresql+pg8000://"
    config = _connector_config(monkeypatch, config_module)
    assert config.user == "sa-db-migrate@bcrbk9-dev.iam"
    assert config.ip_type == "PRIVATE"


def test_cloudsql_config_ignores_retained_legacy_connection_variables(monkeypatch):
    config_module = _reload_config(
        monkeypatch,
        CLOUDSQL_INSTANCE_CONNECTION_NAME="bcrbk9-dev:northamerica-northeast1:strr-db-dev",
        DEPLOYMENT_ENV="production",
        DATABASE_HOST="legacy-host",
        DATABASE_NAME="strr-db",
        DATABASE_PASSWORD="legacy-password",
        DATABASE_PORT="15432",
        DATABASE_UNIX_SOCKET="/cloudsql/legacy-instance",
        DATABASE_USERNAME="sa-api@bcrbk9-dev.iam",
    )

    assert config_module.Production.SQLALCHEMY_DATABASE_URI == "postgresql+pg8000://"
    config = _connector_config(monkeypatch, config_module)
    assert config.instance_name == "bcrbk9-dev:northamerica-northeast1:strr-db-dev"
    assert config.user == "sa-api@bcrbk9-dev.iam"


def test_deployed_config_requires_cloudsql_iam_env(monkeypatch):
    with pytest.raises(
        RuntimeError,
        match="CLOUDSQL_INSTANCE_CONNECTION_NAME, DATABASE_NAME, DATABASE_USERNAME",
    ):
        _reload_config(monkeypatch, DEPLOYMENT_ENV="production", K_SERVICE="strr-api-prod")


def test_local_config_keeps_password_database_uri(monkeypatch):
    config_module = _reload_config(
        monkeypatch,
        DATABASE_HOST="localhost",
        DATABASE_NAME="postgres",
        DATABASE_PASSWORD="postgres",
        DATABASE_PORT="15432",
        DATABASE_USERNAME="postgres",
    )

    assert config_module.Production.POD_NAMESPACE == "local"
    assert (
        config_module.Production.SQLALCHEMY_DATABASE_URI
        == "postgresql+pg8000://postgres:postgres@localhost:15432/postgres"
    )
    assert config_module.Production.SQLALCHEMY_ENGINE_OPTIONS == {}
