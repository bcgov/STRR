"""Tests for strr-api Cloud SQL IAM database configuration."""

import importlib

import pytest

ENV_KEYS = (
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


def test_production_config_uses_cloudsql_proxy_iam_uri(monkeypatch):
    config_module = _reload_config(
        monkeypatch,
        DEPLOYMENT_ENV="production",
        DATABASE_HOST="127.0.0.1",
        DATABASE_NAME="strr-db",
        DATABASE_PORT="5432",
        DATABASE_USERNAME="sa-api@bcrbk9-prod.iam",
    )

    assert (
        config_module.Production.SQLALCHEMY_DATABASE_URI
        == "postgresql+psycopg2://sa-api%40bcrbk9-prod.iam@127.0.0.1:5432/strr-db"
    )
    assert config_module.Production.SQLALCHEMY_ENGINE_OPTIONS == {}


def test_migration_mode_uses_migration_iam_username(monkeypatch):
    config_module = _reload_config(
        monkeypatch,
        DEPLOYMENT_ENV="migration",
        DATABASE_HOST="127.0.0.1",
        DATABASE_MIGRATION_USERNAME="sa-db-migrate@bcrbk9-dev.iam",
        DATABASE_NAME="strr-db",
        DATABASE_PORT="5432",
        DATABASE_USERNAME="sa-api@bcrbk9-dev.iam",
    )

    assert (
        config_module.Migration.SQLALCHEMY_DATABASE_URI
        == "postgresql+psycopg2://sa-db-migrate%40bcrbk9-dev.iam@127.0.0.1:5432/strr-db"
    )


def test_production_config_can_use_cloudsql_proxy_unix_socket(monkeypatch):
    config_module = _reload_config(
        monkeypatch,
        DEPLOYMENT_ENV="production",
        DATABASE_NAME="strr-db",
        DATABASE_UNIX_SOCKET="/cloudsql/bcrbk9-dev:northamerica-northeast1:strr-db-dev",
        DATABASE_USERNAME="sa-api@bcrbk9-dev.iam",
    )

    assert (
        config_module.Production.SQLALCHEMY_DATABASE_URI == "postgresql+psycopg2://sa-api%40bcrbk9-dev.iam@/strr-db"
        "?host=%2Fcloudsql%2Fbcrbk9-dev%3Anorthamerica-northeast1%3Astrr-db-dev"
    )
    assert config_module.Production.SQLALCHEMY_ENGINE_OPTIONS == {}


def test_deployed_config_requires_cloudsql_proxy_iam_env(monkeypatch):
    with pytest.raises(RuntimeError, match="DATABASE_NAME, DATABASE_USERNAME"):
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
