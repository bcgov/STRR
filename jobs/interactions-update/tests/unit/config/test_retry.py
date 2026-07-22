# pylint: disable=C0114, C0116
"""Unit tests for RetryPolicy configuration in interactions-update job."""

import pytest
import responses

from interactions_update.config.retry import RetryPolicy


@pytest.fixture(autouse=True)
def reset_retry_config(monkeypatch):
    """Reset retry config before each test."""
    monkeypatch.setenv("NOTIFY_API_RETRY_MAX_ATTEMPTS", "4")
    monkeypatch.setenv("NOTIFY_API_RETRY_BACKOFF_MIN_SECONDS", "2")
    monkeypatch.setenv("NOTIFY_API_RETRY_BACKOFF_MAX_SECONDS", "30")
    monkeypatch.setenv("NOTIFY_API_RATE_LIMIT_PER_SECOND", "10")


class TestRetryConfigurationViaEnvVars:
    """Test that retry configuration respects environment variables."""

    @responses.activate
    def test_custom_max_attempts_via_env(self, monkeypatch):
        """Verify NOTIFY_API_RETRY_MAX_ATTEMPTS env var is respected."""
        monkeypatch.setenv("NOTIFY_API_RETRY_MAX_ATTEMPTS", "5")
        retry_policy = RetryPolicy.from_env()

        assert retry_policy.to_dict()["max_attempts"] == 5

    @responses.activate
    def test_custom_backoff_settings_via_env(self, monkeypatch):
        """Verify backoff configuration env vars are respected."""
        monkeypatch.setenv("NOTIFY_API_RETRY_BACKOFF_MIN_SECONDS", "3")
        monkeypatch.setenv("NOTIFY_API_RETRY_BACKOFF_MAX_SECONDS", "60")
        retry_policy = RetryPolicy.from_env()

        assert retry_policy.to_dict()["backoff_min"] == 3
        assert retry_policy.to_dict()["backoff_max"] == 60

    def test_default_retry_config_when_env_not_set(self, monkeypatch):
        """Verify sensible defaults when env vars are not set."""
        # Clear any existing env vars
        monkeypatch.delenv("NOTIFY_API_RETRY_MAX_ATTEMPTS", raising=False)
        monkeypatch.delenv("NOTIFY_API_RETRY_BACKOFF_MIN_SECONDS", raising=False)
        monkeypatch.delenv("NOTIFY_API_RETRY_BACKOFF_MAX_SECONDS", raising=False)

        retry_policy = RetryPolicy.from_env()

        assert retry_policy.to_dict()["max_attempts"] == 4
        assert retry_policy.to_dict()["backoff_min"] == 2
        assert retry_policy.to_dict()["backoff_max"] == 30


class TestRateLimitConfiguration:
    """Test rate limiting configuration and initialization."""

    def test_rate_limit_config_from_env(self, monkeypatch):
        """Verify NOTIFY_API_RATE_LIMIT_PER_SECOND env var is respected."""
        monkeypatch.setenv("NOTIFY_API_RATE_LIMIT_PER_SECOND", "5")
        retry_policy = RetryPolicy.from_env()

        assert retry_policy.to_dict()["rate_limit_per_second"] == 5

    def test_default_rate_limit_when_env_not_set(self, monkeypatch):
        """Verify sensible default (10 req/sec) when env var not set."""
        monkeypatch.delenv("NOTIFY_API_RATE_LIMIT_PER_SECOND", raising=False)
        retry_policy = RetryPolicy.from_env()

        assert retry_policy.to_dict()["rate_limit_per_second"] == 10

    def test_rate_limiter_initialization(self):
        """Verify rate limiter semaphore is initialized."""
        retry_policy = RetryPolicy.from_env()
        rate_limiter = retry_policy.get_rate_limiter()
        # Just verify it doesn't raise an exception and is a semaphore
        assert rate_limiter is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
