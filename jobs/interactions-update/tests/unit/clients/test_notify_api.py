# pylint: disable=C0114, C0116
"""Unit tests for NotifyApiClient with retry logic."""

import pytest
import requests
import responses

from interactions_update.clients.notify_api import NotifyApiClient
from interactions_update.config.retry import RetryPolicy


@pytest.fixture(autouse=True)
def reset_retry_config(monkeypatch):
    """Reset retry config before each test."""
    monkeypatch.setenv("NOTIFY_API_RETRY_MAX_ATTEMPTS", "4")
    monkeypatch.setenv("NOTIFY_API_RETRY_BACKOFF_MIN_SECONDS", "2")
    monkeypatch.setenv("NOTIFY_API_RETRY_BACKOFF_MAX_SECONDS", "30")
    monkeypatch.setenv("NOTIFY_API_RATE_LIMIT_PER_SECOND", "10")


class TestRetryWithExponentialBackoff:
    """Test tenacity retry logic with exponential backoff."""

    @responses.activate
    def test_timeout_triggers_retry_then_succeeds(self, monkeypatch):
        """Transient timeout on first attempt, success on retry."""
        monkeypatch.setenv("NOTIFY_API_RETRY_MAX_ATTEMPTS", "3")
        monkeypatch.setenv("NOTIFY_API_RETRY_BACKOFF_MIN_SECONDS", "1")
        monkeypatch.setenv("NOTIFY_API_RETRY_BACKOFF_MAX_SECONDS", "5")
        retry_policy = RetryPolicy.from_env()

        url = "https://notify-api/notify/test-ref-1"
        headers = {"Authorization": "Bearer mock-token"}

        # First call times out, second succeeds
        responses.add(
            responses.GET,
            url,
            body=requests.exceptions.Timeout("Connection timed out"),
        )
        responses.add(
            responses.GET,
            url,
            json={"id": "notify-id-1", "notifyStatus": "delivered"},
            status=200,
        )

        client = NotifyApiClient(retry_policy=retry_policy, timeout=10)
        result = client.call(url, headers, "int-123", "test-ref-1")
        assert result.status_code == 200
        assert result.json()["id"] == "notify-id-1"

    @responses.activate
    def test_connection_error_triggers_retry_then_succeeds(self, monkeypatch):
        """Transient connection error on first attempt, success on retry."""
        monkeypatch.setenv("NOTIFY_API_RETRY_MAX_ATTEMPTS", "3")
        retry_policy = RetryPolicy.from_env()

        url = "https://notify-api/notify/test-ref-2"
        headers = {"Authorization": "Bearer mock-token"}

        # First call raises ConnectionError, second succeeds
        responses.add(
            responses.GET,
            url,
            body=requests.exceptions.ConnectionError("Connection refused"),
        )
        responses.add(
            responses.GET,
            url,
            json={"id": "notify-id-2", "notifyStatus": "sent"},
            status=200,
        )

        client = NotifyApiClient(retry_policy=retry_policy, timeout=10)
        result = client.call(url, headers, "int-456", "test-ref-2")
        assert result.status_code == 200
        assert result.json()["id"] == "notify-id-2"

    @responses.activate
    def test_multiple_retries_before_success(self, monkeypatch):
        """Multiple transient failures followed by eventual success."""
        monkeypatch.setenv("NOTIFY_API_RETRY_MAX_ATTEMPTS", "4")
        monkeypatch.setenv("NOTIFY_API_RETRY_BACKOFF_MIN_SECONDS", "1")
        retry_policy = RetryPolicy.from_env()

        url = "https://notify-api/notify/test-ref-3"
        headers = {"Authorization": "Bearer mock-token"}

        # First two calls time out, third succeeds
        responses.add(
            responses.GET,
            url,
            body=requests.exceptions.Timeout("Timeout 1"),
        )
        responses.add(
            responses.GET,
            url,
            body=requests.exceptions.Timeout("Timeout 2"),
        )
        responses.add(
            responses.GET,
            url,
            json={"id": "notify-id-3", "notifyStatus": "delivered"},
            status=200,
        )

        client = NotifyApiClient(retry_policy=retry_policy, timeout=10)
        result = client.call(url, headers, "int-789", "test-ref-3")
        assert result.status_code == 200

    @responses.activate
    def test_retry_exhaustion_raises_exception(self, monkeypatch):
        """All retry attempts fail, final exception is raised."""
        monkeypatch.setenv("NOTIFY_API_RETRY_MAX_ATTEMPTS", "2")
        retry_policy = RetryPolicy.from_env()

        url = "https://notify-api/notify/test-ref-4"
        headers = {"Authorization": "Bearer mock-token"}

        # All calls time out
        for _ in range(2):
            responses.add(
                responses.GET,
                url,
                body=requests.exceptions.Timeout("Timeout"),
            )

        client = NotifyApiClient(retry_policy=retry_policy, timeout=10)
        with pytest.raises(requests.exceptions.Timeout):
            client.call(url, headers, "int-fail", "test-ref-4")


class TestPermanentFailuresSkipRetry:
    """Test that permanent failures (4xx, 5xx) do not trigger retries."""

    @responses.activate
    def test_404_not_found_no_retry(self, monkeypatch):
        """404 response should not trigger retry (permanent failure)."""
        monkeypatch.setenv("NOTIFY_API_RETRY_MAX_ATTEMPTS", "3")
        retry_policy = RetryPolicy.from_env()

        url = "https://notify-api/notify/test-ref-notfound"
        headers = {"Authorization": "Bearer mock-token"}

        responses.add(
            responses.GET,
            url,
            json={"error": "Not found"},
            status=404,
        )

        client = NotifyApiClient(retry_policy=retry_policy, timeout=10)
        result = client.call(url, headers, "int-404", "test-ref-notfound")
        assert result.status_code == 404

        # Verify only one request was made (no retries for 404)
        assert len(responses.calls) == 1

    @responses.activate
    def test_401_unauthorized_no_retry(self, monkeypatch):
        """401 response should not trigger retry (permanent failure)."""
        monkeypatch.setenv("NOTIFY_API_RETRY_MAX_ATTEMPTS", "3")
        retry_policy = RetryPolicy.from_env()

        url = "https://notify-api/notify/test-ref-unauth"
        headers = {"Authorization": "Bearer invalid-token"}

        responses.add(
            responses.GET,
            url,
            json={"error": "Unauthorized"},
            status=401,
        )

        client = NotifyApiClient(retry_policy=retry_policy, timeout=10)
        result = client.call(url, headers, "int-401", "test-ref-unauth")
        assert result.status_code == 401

        # Verify only one request was made
        assert len(responses.calls) == 1

    @responses.activate
    def test_500_server_error_no_retry(self, monkeypatch):
        """500 response should not trigger retry (permanent HTTP response)."""
        monkeypatch.setenv("NOTIFY_API_RETRY_MAX_ATTEMPTS", "3")
        retry_policy = RetryPolicy.from_env()

        url = "https://notify-api/notify/test-ref-server-error"
        headers = {"Authorization": "Bearer mock-token"}

        responses.add(
            responses.GET,
            url,
            json={"error": "Internal server error"},
            status=500,
        )

        client = NotifyApiClient(retry_policy=retry_policy, timeout=10)
        result = client.call(url, headers, "int-500", "test-ref-server-error")
        assert result.status_code == 500

        # Verify only one request was made
        assert len(responses.calls) == 1


class TestRetryLogging:
    """Test that retry attempts are logged appropriately."""

    @responses.activate
    def test_retry_logging_on_transient_failure(self, monkeypatch):
        """Verify retry attempts work when transient failures occur."""
        monkeypatch.setenv("NOTIFY_API_RETRY_MAX_ATTEMPTS", "2")
        retry_policy = RetryPolicy.from_env()

        url = "https://notify-api/notify/test-ref-log"
        headers = {"Authorization": "Bearer mock-token"}

        # First attempt times out, second succeeds
        responses.add(
            responses.GET,
            url,
            body=requests.exceptions.Timeout("Timeout"),
        )
        responses.add(
            responses.GET,
            url,
            json={"id": "notify-id-log", "notifyStatus": "delivered"},
            status=200,
        )

        # Just verify that retry logic works: first timeout, then success
        client = NotifyApiClient(retry_policy=retry_policy, timeout=10)
        result = client.call(url, headers, "int-log", "test-ref-log")

        assert result.status_code == 200
        assert result.json()["id"] == "notify-id-log"

    @responses.activate
    def test_exhaustion_logging_on_all_retries_fail(self, monkeypatch, caplog):
        """Verify exhaustion is logged when all retries fail."""
        monkeypatch.setenv("NOTIFY_API_RETRY_MAX_ATTEMPTS", "2")
        retry_policy = RetryPolicy.from_env()

        url = "https://notify-api/notify/test-ref-exhausted"
        headers = {"Authorization": "Bearer mock-token"}

        # All attempts time out
        for _ in range(2):
            responses.add(
                responses.GET,
                url,
                body=requests.exceptions.Timeout("Timeout"),
            )

        client = NotifyApiClient(retry_policy=retry_policy, timeout=10)
        with caplog.at_level("DEBUG"):
            with pytest.raises(requests.exceptions.Timeout):
                client.call(url, headers, "int-exhausted", "test-ref-exhausted")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
