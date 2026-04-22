"""Unit tests for configuration helpers."""

import pytest

from registration_expiry.config import (
    DevConfig,
    ProdConfig,
    TestConfig,
    UnitTestConfig,
    get_named_config,
)


def test_get_named_config_production():
    assert isinstance(get_named_config("production"), ProdConfig)


def test_get_named_config_staging():
    assert isinstance(get_named_config("staging"), ProdConfig)


def test_get_named_config_default():
    assert isinstance(get_named_config("default"), ProdConfig)


def test_get_named_config_unittest():
    assert isinstance(get_named_config("unittest"), UnitTestConfig)


def test_get_named_config_test():
    assert isinstance(get_named_config("test"), TestConfig)


def test_get_named_config_development():
    assert isinstance(get_named_config("development"), DevConfig)


def test_get_named_config_unknown_raises():
    with pytest.raises(KeyError, match="Unknown configuration"):
        get_named_config("not-a-real-config")


def test_config_sqlalchemy_uri_uses_unix_socket_when_env_set(monkeypatch):
    # Use a typical PG socket directory (not under world-writable /tmp) to satisfy security rules.
    socket_dir = "/var/run/postgresql"
    monkeypatch.setenv("DATABASE_UNIX_SOCKET", socket_dir)
    monkeypatch.setenv("DATABASE_USERNAME", "u")
    monkeypatch.setenv("DATABASE_PASSWORD", "pw")
    monkeypatch.setenv("DATABASE_NAME", "db")
    import importlib

    import registration_expiry.config as config_module

    importlib.reload(config_module)
    try:
        uri = config_module._Config.SQLALCHEMY_DATABASE_URI
        assert "unix_sock=" in uri
        assert socket_dir in uri
        assert uri.endswith(f"{socket_dir}/.s.PGSQL.5432")
    finally:
        monkeypatch.delenv("DATABASE_UNIX_SOCKET", raising=False)
        importlib.reload(config_module)
