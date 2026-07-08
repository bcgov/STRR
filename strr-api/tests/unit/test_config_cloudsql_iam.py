"""Tests for strr-api Cloud SQL IAM database configuration."""

import importlib
import sys
import types

import pytest

ENV_KEYS = (
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
    for env_name, value in env.items():
        monkeypatch.setenv(env_name, value)

    from strr_api import config as config_module

    return importlib.reload(config_module)


def _install_fake_connector(monkeypatch):
    calls = {}

    google_module = types.ModuleType("google")
    cloud_module = types.ModuleType("google.cloud")
    sql_module = types.ModuleType("google.cloud.sql")
    connector_module = types.ModuleType("google.cloud.sql.connector")

    class FakeIPTypes:
        PUBLIC = "PUBLIC"
        PRIVATE = "PRIVATE"

    class FakeConnector:
        def __init__(self):
            calls["connector_count"] = calls.get("connector_count", 0) + 1

        def connect(self, *args, **kwargs):
            calls["args"] = args
            calls["kwargs"] = kwargs
            return "connection"

    connector_module.Connector = FakeConnector
    connector_module.IPTypes = FakeIPTypes

    monkeypatch.setitem(sys.modules, "google", google_module)
    monkeypatch.setitem(sys.modules, "google.cloud", cloud_module)
    monkeypatch.setitem(sys.modules, "google.cloud.sql", sql_module)
    monkeypatch.setitem(sys.modules, "google.cloud.sql.connector", connector_module)

    return calls


def test_production_config_uses_cloudsql_iam_connector(monkeypatch):
    calls = _install_fake_connector(monkeypatch)

    config_module = _reload_config(
        monkeypatch,
        DEPLOYMENT_ENV="production",
        CLOUDSQL_INSTANCE_CONNECTION_NAME="bcrbk9-prod:northamerica-northeast1:strr-db-prod",
        CLOUDSQL_IP_TYPE="PUBLIC",
        DATABASE_NAME="strr-db",
        DATABASE_USERNAME="sa-api@bcrbk9-prod.iam",
    )

    assert config_module.Production.SQLALCHEMY_DATABASE_URI == "postgresql+pg8000://"

    creator = config_module.Production.SQLALCHEMY_ENGINE_OPTIONS["creator"]
    assert creator() == "connection"
    assert calls["connector_count"] == 1
    assert calls["args"] == ("bcrbk9-prod:northamerica-northeast1:strr-db-prod", "pg8000")
    assert calls["kwargs"] == {
        "user": "sa-api@bcrbk9-prod.iam",
        "db": "strr-db",
        "enable_iam_auth": True,
        "ip_type": "PUBLIC",
    }


def test_migration_mode_uses_migration_iam_username(monkeypatch):
    calls = _install_fake_connector(monkeypatch)

    config_module = _reload_config(
        monkeypatch,
        DEPLOYMENT_ENV="migration",
        CLOUDSQL_INSTANCE_CONNECTION_NAME="bcrbk9-dev:northamerica-northeast1:strr-db-dev",
        CLOUDSQL_IP_TYPE="PUBLIC",
        DATABASE_MIGRATION_USERNAME="sa-db-migrate@bcrbk9-dev.iam",
        DATABASE_NAME="strr-db",
        DATABASE_USERNAME="sa-api@bcrbk9-dev.iam",
    )

    creator = config_module.Migration.SQLALCHEMY_ENGINE_OPTIONS["creator"]
    creator()

    assert calls["kwargs"]["user"] == "sa-db-migrate@bcrbk9-dev.iam"


def test_deployed_config_requires_cloudsql_iam_env(monkeypatch):
    with pytest.raises(RuntimeError, match="CLOUDSQL_INSTANCE_CONNECTION_NAME, DATABASE_NAME, DATABASE_USERNAME"):
        _reload_config(monkeypatch, DEPLOYMENT_ENV="production")


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
    assert config_module.Production.SQLALCHEMY_DATABASE_URI == "postgresql://postgres:postgres@localhost:15432/postgres"
    assert config_module.Production.SQLALCHEMY_ENGINE_OPTIONS == {}
