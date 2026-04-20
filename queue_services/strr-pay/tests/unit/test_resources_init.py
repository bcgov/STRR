"""Unit tests for endpoint registration."""

from strr_pay import create_app
from strr_pay.config import UnitTestConfig


def test_create_app_registers_pay_worker_and_strict_slashes():
    app = create_app(environment=UnitTestConfig)
    assert app.url_map.strict_slashes is False
    rules = {r.rule for r in app.url_map.iter_rules()}
    assert "/" in rules
