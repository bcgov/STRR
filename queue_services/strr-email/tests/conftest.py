"""Shared pytest plugins and fixtures for strr-email (unit + integration)."""

import sys
from pathlib import Path

strr_api_src = Path(__file__).resolve().parents[3] / "strr-api" / "src"
if strr_api_src.exists() and str(strr_api_src) not in sys.path:
    sys.path.insert(0, str(strr_api_src))

import tests.fixtures.local  # noqa: E402,F401

pytest_plugins = [
    "strr_test_utils.client_fixtures",
    "strr_test_utils.db_fixtures",
    "strr_test_utils.utils_fixtures",
    "strr_test_utils.redis_fixtures",
    "strr_test_utils.parent_fixtures",
]
