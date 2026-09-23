"""Notify API client module."""

import logging
import time

import requests
from tenacity import Retrying
from tenacity import retry_if_exception_type
from tenacity import stop_after_attempt
from tenacity import wait_exponential

from interactions_update.config.retry import RetryPolicy

logger = logging.getLogger(__name__)


class NotifyApiClient:
    """HTTP client for Notify API with built-in retry logic.

    Handles API calls to the Notify service with configurable retry strategy,
    exponential backoff, and comprehensive logging for observability.
    """

    def __init__(self, retry_policy: RetryPolicy, timeout: int = 10):
        """Initialize Notify API client.

        Args:
            retry_policy: RetryPolicy instance with retry configuration
            timeout: Request timeout in seconds (default: 10)
        """
        self.retry_policy = retry_policy
        self.timeout = timeout

    def call(
        self,
        url: str,
        headers: dict,
        interaction_id: str,
        notify_reference: str,
    ) -> requests.Response:
        """Call Notify API with retry logic and exponential backoff.

        Retries only transient errors (Timeout, ConnectionError) while skipping
        permanent failures (4xx, 5xx HTTP responses). Uses exponential backoff
        between retries for graceful degradation.

        Args:
            url: Full URL to call (e.g., "https://notify-api/notify/ref-123")
            headers: HTTP headers (includes Bearer token)
            interaction_id: Interaction ID for logging context
            notify_reference: Notify reference for logging context

        Returns:
            requests.Response: Response object if successful

        Raises:
            requests.exceptions.RequestException: If all retries exhausted or permanent error
        """

        def _make_request():
            logger.debug(
                "strr.interactions.notify_request interaction_id=%s notify_reference=%s url=%s",
                interaction_id,
                notify_reference,
                url,
            )
            t0 = time.monotonic()
            resp = requests.get(url, headers=headers, timeout=self.timeout)
            duration_ms = int((time.monotonic() - t0) * 1000)

            if resp.status_code != 200:
                logger.warning(
                    "strr.interactions.notify_status_fetch_failed interaction_id=%s notify_reference=%s status_code=%s duration_ms=%s",
                    interaction_id,
                    notify_reference,
                    resp.status_code,
                    duration_ms,
                )
            else:
                logger.debug(
                    "strr.interactions.notify_request_success interaction_id=%s notify_reference=%s status_code=%s duration_ms=%s",
                    interaction_id,
                    notify_reference,
                    resp.status_code,
                    duration_ms,
                )
            return resp

        # Use Retrying with current config (evaluated at call time, not decoration time)
        for attempt in Retrying(
            stop=stop_after_attempt(self.retry_policy.max_attempts),
            wait=wait_exponential(
                multiplier=1,
                min=self.retry_policy.backoff_min_seconds,
                max=self.retry_policy.backoff_max_seconds,
            ),
            retry=retry_if_exception_type(
                (requests.exceptions.Timeout, requests.exceptions.ConnectionError)
            ),
            reraise=True,
        ):
            with attempt:
                return _make_request()
