# Copyright © 2019 Province of British Columbia
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""All of the configuration for the service is captured here."""

import os
import sys

from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv())

CONFIGURATION = {
    "development": "auto_approval.config.DevConfig",
    "unittest": "strr_pay.config.UnitTestConfig",  # Renamed unit test config
    "test": "strr_pay.config.TestConfig",  # GCP test config
    "production": "auto_approval.config.ProdConfig",
    "default": "auto_approval.config.ProdConfig",
}


def get_named_config(config_name: str = "production"):
    """Return the configuration object based on the name.

    :raise: KeyError: if an unknown configuration is requested
    """
    if config_name in ["production", "staging", "default"]:
        app_config = ProdConfig()
    elif config_name == "unittest":
        app_config = UnitTestConfig()
    elif config_name == "test":
        app_config = TestConfig()
    elif config_name == "development":
        app_config = DevConfig()
    else:
        raise KeyError(f"Unknown configuration: {config_name}")
    return app_config


class _Config(object):  # pylint: disable=too-few-public-methods
    """Base class configuration."""

    PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))

    SENTRY_DSN = os.getenv("SENTRY_DSN", "")

    # SVC
    KEYCLOAK_AUTH_TOKEN_URL = os.getenv("KEYCLOAK_AUTH_TOKEN_URL")
    STRR_SERVICE_ACCOUNT_CLIENT_ID = os.getenv("STRR_SERVICE_ACCOUNT_CLIENT_ID")
    STRR_SERVICE_ACCOUNT_SECRET = os.getenv("STRR_SERVICE_ACCOUNT_SECRET")

    # AUTH API
    AUTH_SVC_URL = os.getenv("AUTH_SVC_URL")
    if not AUTH_SVC_URL:
        AUTH_SVC_URL = os.getenv("AUTH_API_URL", "") + os.getenv("AUTH_API_VERSION", "")

    # AUTO APPROVAL JOB
    AUTO_APPROVAL_APPLICATION_PROCESSING_DELAY = int(
        os.getenv("AUTO_APPROVAL_APPLICATION_PROCESSING_DELAY") or "60"
    )

    # GEOCODER
    GEOCODER_SVC_URL = os.getenv("GEOCODER_API_URL", "")
    GEOCODER_SVC_AUTH_KEY = os.getenv("GEOCODER_API_AUTH_KEY", "")

    # DATA PORTAL API
    STR_DATA_API_CLIENT_ID = os.getenv("STR_DATA_API_CLIENT_ID", "")
    STR_DATA_API_CLIENT_SECRET = os.getenv("STR_DATA_API_CLIENT_SECRET", "")
    STR_DATA_API_TOKEN_URL = os.getenv("STR_DATA_API_TOKEN_URL", "")
    STR_DATA_API_URL = os.getenv("STR_DATA_API_URL", "")

    # STRR
    STRR_API_URL = os.getenv("STRR_API_URL")

    # JWT_OIDC Settings
    JWT_OIDC_WELL_KNOWN_CONFIG = os.getenv("JWT_OIDC_WELL_KNOWN_CONFIG")
    JWT_OIDC_ALGORITHMS = os.getenv("JWT_OIDC_ALGORITHMS")
    JWT_OIDC_JWKS_URI = os.getenv("JWT_OIDC_JWKS_URI")
    JWT_OIDC_ISSUER = os.getenv("JWT_OIDC_ISSUER")
    JWT_OIDC_AUDIENCE = os.getenv("JWT_OIDC_AUDIENCE")
    JWT_OIDC_CLIENT_SECRET = os.getenv("JWT_OIDC_CLIENT_SECRET")
    JWT_OIDC_CACHING_ENABLED = os.getenv("JWT_OIDC_CACHING_ENABLED")
    JWT_OIDC_TOKEN_URL = os.getenv("JWT_OIDC_TOKEN_URL")
    JWT_OIDC_JWKS_CACHE_TIMEOUT = int(os.getenv("JWT_OIDC_JWKS_CACHE_TIMEOUT"))
    JWT_OIDC_USERNAME = os.getenv("JWT_OIDC_USERNAME", "username")
    JWT_OIDC_FIRSTNAME = os.getenv("JWT_OIDC_FIRSTNAME", "firstname")
    JWT_OIDC_LASTNAME = os.getenv("JWT_OIDC_LASTNAME", "lastname")

    # LTSA
    LTSA_SVC_URL = os.getenv("LTSA_API_URL", "") + os.getenv("LTSA_API_VERSION", "")
    LTSA_SVC_AUTH_KEY = os.getenv("LTSA_API_KEY_STRR", "")

    # DATABASE
    DB_USER = os.getenv("DATABASE_USERNAME", "")
    DB_PASSWORD = os.getenv("DATABASE_PASSWORD", "")
    DB_NAME = os.getenv("DATABASE_NAME", "")
    DB_HOST = os.getenv("DATABASE_HOST", "")
    DB_PORT = int(os.getenv("DATABASE_PORT", "5432"))  # POSTGRESQL

    # POSTGRESQL
    if DB_UNIX_SOCKET := os.getenv("DATABASE_UNIX_SOCKET", None):
        SQLALCHEMY_DATABASE_URI = f"postgresql+pg8000://{DB_USER}:{DB_PASSWORD}@/{DB_NAME}?unix_sock={DB_UNIX_SOCKET}/.s.PGSQL.5432"
    else:
        SQLALCHEMY_DATABASE_URI = (
            f"postgresql+pg8000://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        )

    TESTING = False
    DEBUG = False


class DevConfig(_Config):  # pylint: disable=too-few-public-methods
    """Development environment configuration."""

    TESTING = False
    DEBUG = True

class UnitTestConfig(Config):  # pylint: disable=too-few-public-methods
    """In support of unit testing only.

    Used by the py.test suite
    """

    DEBUG = True
    TESTING = True

class TestConfig(Config):  # pylint: disable=too-few-public-methods
    """In support of testing only.

    Used by the py.test suite
    """

    DEBUG = True
    TESTING = False  # False for GCP test environments

    DATABASE_TEST_USERNAME = os.getenv("DATABASE_TEST_USERNAME", "")
    DATABASE_TEST_PASSWORD = os.getenv("DATABASE_TEST_PASSWORD", "")
    DATABASE_TEST_NAME = os.getenv("DATABASE_TEST_NAME", "")
    DATABASE_TEST_HOST = os.getenv("DATABASE_TEST_HOST", "")
    DATABASE_TEST_PORT = int(os.getenv("DATABASE_TEST_PORT", "5432"))  # POSTGRESQL

    SQLALCHEMY_DATABASE_URI = f"postgresql://{DATABASE_TEST_USERNAME}:{DATABASE_TEST_PASSWORD}@{DATABASE_TEST_HOST}:{DATABASE_TEST_PORT}/{DATABASE_TEST_NAME}"

    COLIN_URL = os.getenv("COLIN_URL_TEST", "")
    LEGAL_URL = os.getenv("LEGAL_URL_TEST", "")


class ProdConfig(_Config):  # pylint: disable=too-few-public-methods
    """Production environment configuration."""

    SECRET_KEY = os.getenv("SECRET_KEY", None)

    if not SECRET_KEY:
        SECRET_KEY = os.urandom(24)
        print("WARNING: SECRET_KEY being set as a one-shot", file=sys.stderr)

    TESTING = False
    DEBUG = False
