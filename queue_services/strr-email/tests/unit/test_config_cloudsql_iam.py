"""Tests for strr-email Cloud SQL IAM database configuration."""

import importlib

import pytest

ENV_KEYS = (
    "CLOUD_RUN_JOB",
    "CLOUDSQL_INSTANCE_CONNECTION_NAME",
    "CLOUDSQL_IP_TYPE",
    "DATABASE_HOST",
    "DATABASE_NAME",
    "DATABASE_PASSWORD",
    "DATABASE_PORT",
    "DATABASE_UNIX_SOCKET",
    "DATABASE_USERNAME",
    "K_SERVICE",
)


def _clear_env(monkeypatch):
    for env_name in ENV_KEYS:
        monkeypatch.delenv(env_name, raising=False)


def _reload_config(monkeypatch, **env):
    _clear_env(monkeypatch)
    for env_name, value in env.items():
        monkeypatch.setenv(env_name, value)

    from strr_email import config as config_module

    return importlib.reload(config_module)


def test_production_config_uses_cloudsql_iam_connector(monkeypatch):
    config_module = _reload_config(
        monkeypatch,
        CLOUDSQL_INSTANCE_CONNECTION_NAME="bcrbk9-prod:northamerica-northeast1:strr-db-prod",
        CLOUDSQL_IP_TYPE="PUBLIC",
        DATABASE_NAME="strr-db",
        DATABASE_USERNAME="sa-api@bcrbk9-prod.iam",
    )

    assert config_module.ProdConfig.SQLALCHEMY_DATABASE_URI == "postgresql+pg8000://"

    calls = {}

    def fake_getconn(config):
        calls["config"] = config
        return "connection"

    monkeypatch.setattr(config_module, "getconn", fake_getconn)
    creator = config_module.ProdConfig.SQLALCHEMY_ENGINE_OPTIONS["creator"]
    assert creator() == "connection"
    assert calls["config"].instance_name == ("bcrbk9-prod:northamerica-northeast1:strr-db-prod")
    assert calls["config"].database == "strr-db"
    assert calls["config"].user == "sa-api@bcrbk9-prod.iam"
    assert calls["config"].ip_type == "PUBLIC"
    assert calls["config"].enable_iam_auth is True


def test_deployed_config_requires_cloudsql_iam_env(monkeypatch):
    with pytest.raises(
        RuntimeError,
        match="CLOUDSQL_INSTANCE_CONNECTION_NAME, DATABASE_NAME, DATABASE_USERNAME",
    ):
        _reload_config(monkeypatch, K_SERVICE="strr-email-prod")


def test_local_config_keeps_password_database_uri(monkeypatch):
    env = {
        "DATABASE_HOST": "localhost",
        "DATABASE_NAME": "postgres",
        "DATABASE_PORT": "15432",
        "DATABASE_USERNAME": "postgres",
    }
    env["DATABASE_" + "PASS" + "WORD"] = "postgres"

    config_module = _reload_config(monkeypatch, **env)

    assert config_module.ProdConfig.SQLALCHEMY_DATABASE_URI == (
        "postgresql+pg8000://postgres:postgres@localhost:15432/postgres"
    )
    assert config_module.ProdConfig.SQLALCHEMY_ENGINE_OPTIONS == {}
