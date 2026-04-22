"""Shared pytest plugins and fixtures for strr-email (unit + integration)."""

pytest_plugins = [
    "strr_test_utils.client_fixtures",
    "strr_test_utils.db_fixtures",
    "strr_test_utils.utils_fixtures",
    "strr_test_utils.redis_fixtures",
    "strr_test_utils.parent_fixtures",
]
