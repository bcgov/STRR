"""Retry policy configuration for API calls."""

import logging
import os
import threading

logger = logging.getLogger(__name__)


class RetryPolicy:
    """Manages retry and rate limiting configuration for API calls.

    Thread-safe configuration holder that loads from environment variables
    with sensible defaults for GCP Cloud Run environments.
    """

    def __init__(
        self,
        max_attempts: int = 4,
        backoff_min_seconds: int = 2,
        backoff_max_seconds: int = 30,
        rate_limit_per_second: int = 10,
    ):
        """Initialize retry policy with configuration parameters.

        Args:
            max_attempts: Maximum number of retry attempts (default: 4)
            backoff_min_seconds: Minimum backoff time in seconds (default: 2)
            backoff_max_seconds: Maximum backoff time in seconds (default: 30)
            rate_limit_per_second: Rate limit in requests per second (default: 10)
        """
        self.max_attempts = max_attempts
        self.backoff_min_seconds = backoff_min_seconds
        self.backoff_max_seconds = backoff_max_seconds
        self.rate_limit_per_second = rate_limit_per_second
        self._rate_limiter_semaphore = None

    @classmethod
    def from_env(cls) -> "RetryPolicy":
        """Create RetryPolicy instance from environment variables.

        Reads configuration from environment with following variables:
        - NOTIFY_API_RETRY_MAX_ATTEMPTS (default: 4)
        - NOTIFY_API_RETRY_BACKOFF_MIN_SECONDS (default: 2)
        - NOTIFY_API_RETRY_BACKOFF_MAX_SECONDS (default: 30)
        - NOTIFY_API_RATE_LIMIT_PER_SECOND (default: 10)

        Returns:
            RetryPolicy: Configured instance with values from environment
        """
        max_attempts = int(os.getenv("NOTIFY_API_RETRY_MAX_ATTEMPTS", "4"))
        backoff_min = int(os.getenv("NOTIFY_API_RETRY_BACKOFF_MIN_SECONDS", "2"))
        backoff_max = int(os.getenv("NOTIFY_API_RETRY_BACKOFF_MAX_SECONDS", "30"))
        rate_limit = int(os.getenv("NOTIFY_API_RATE_LIMIT_PER_SECOND", "10"))

        policy = cls(
            max_attempts=max_attempts,
            backoff_min_seconds=backoff_min,
            backoff_max_seconds=backoff_max,
            rate_limit_per_second=rate_limit,
        )

        logger.info(
            "strr.interactions.retry_config_initialized max_attempts=%s backoff_min=%s backoff_max=%s rate_limit_per_second=%s",
            policy.max_attempts,
            policy.backoff_min_seconds,
            policy.backoff_max_seconds,
            policy.rate_limit_per_second,
        )

        return policy

    def get_rate_limiter(self) -> threading.Semaphore:
        """Get or create thread-safe rate limiter semaphore.

        Returns:
            threading.Semaphore: Initialized semaphore for rate limiting
        """
        if self._rate_limiter_semaphore is None:
            self._rate_limiter_semaphore = threading.Semaphore(1)
            logger.debug("strr.interactions.rate_limiter_initialized")
        return self._rate_limiter_semaphore

    def to_dict(self) -> dict:
        """Convert policy to dictionary for logging.

        Returns:
            dict: Configuration values as dictionary
        """
        return {
            "max_attempts": self.max_attempts,
            "backoff_min": self.backoff_min_seconds,
            "backoff_max": self.backoff_max_seconds,
            "rate_limit_per_second": self.rate_limit_per_second,
        }
