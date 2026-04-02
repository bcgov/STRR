"""Tests for ``get_named_config`` and config class wiring."""

import pytest

from batch_permit_validator.config import DevConfig
from batch_permit_validator.config import get_named_config
from batch_permit_validator.config import ProdConfig
from batch_permit_validator.config import TestConfig
from batch_permit_validator.config import UnitTestConfig


@pytest.mark.parametrize(
    "name,expected_cls",
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
    cfg = get_named_config(name)
    assert isinstance(cfg, expected_cls)


def test_get_named_config_unknown_raises():
    with pytest.raises(KeyError, match="Unknown configuration: not-a-real-env"):
        get_named_config("not-a-real-env")
