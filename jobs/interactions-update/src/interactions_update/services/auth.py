"""Authentication service module."""

import logging
import os

logger = logging.getLogger(__name__)


class AuthService:
    """Manages authentication configuration for service account access.

    Retrieves and provides authentication credentials for API access
    from environment variables, with sensible defaults for GCP environments.
    """

    @classmethod
    def get_config(cls) -> dict:
        """Get authentication configuration from environment variables.

        Reads the following environment variables:
        - STRR_SERVICE_ACCOUNT_CLIENT_ID: Service account client ID
        - STRR_SERVICE_ACCOUNT_SECRET: Service account secret
        - KEYCLOAK_AUTH_TOKEN_URL: Keycloak token endpoint URL
        - AUTH_SVC_TIMEOUT: Auth service timeout in seconds (default: 20)

        Returns:
            dict: Configuration dictionary with auth credentials and URLs
        """
        client_id = os.getenv("STRR_SERVICE_ACCOUNT_CLIENT_ID")
        client_secret = os.getenv("STRR_SERVICE_ACCOUNT_SECRET")
        token_url = os.getenv("KEYCLOAK_AUTH_TOKEN_URL")
        timeout = int(os.getenv("AUTH_SVC_TIMEOUT", "20"))

        return {
            "client_id": client_id,
            "client_secret": client_secret,
            "token_url": token_url,
            "timeout": timeout,
        }
