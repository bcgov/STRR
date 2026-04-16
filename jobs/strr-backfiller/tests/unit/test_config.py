"""Unit tests for configuration helpers."""

import importlib

import pytest

from backfiller.config import (
    DevConfig,
    ProdConfig,
    TestConfig,
    UnitTestConfig,
    get_named_config,
)


@pytest.mark.parametrize(
    "name, expected_cls",
    [
        ("production", ProdConfig),
        ("staging", ProdConfig),
        ("default", ProdConfig),
        ("unittest", UnitTestConfig),
        ("test", TestConfig),
        ("development", DevConfig),
    ],
)
def test_get_named_config_returns_expected_class(name, expected_cls):
    assert isinstance(get_named_config(name), expected_cls)


def test_get_named_config_unknown_raises():
    with pytest.raises(KeyError, match="Unknown configuration"):
        get_named_config("not-a-real-config")


def test_config_sqlalchemy_uri_uses_unix_socket_when_env_set(monkeypatch):
    monkeypatch.setenv("DATABASE_UNIX_SOCKET", "/tmp/pg-socket")
    monkeypatch.setenv("DATABASE_USERNAME", "u")
    monkeypatch.setenv("DATABASE_PASSWORD", "pw")
    monkeypatch.setenv("DATABASE_NAME", "db")
    import backfiller.config as config_module

    importlib.reload(config_module)
    try:
        uri = config_module._Config.SQLALCHEMY_DATABASE_URI
        assert "unix_sock=" in uri
        assert "/tmp/pg-socket" in uri
    finally:
        monkeypatch.delenv("DATABASE_UNIX_SOCKET", raising=False)
        importlib.reload(config_module)
