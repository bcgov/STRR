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

from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv())

CONFIGURATION = {
    "development": "auto_approval.config.DevConfig",
    "unittest": "strr_pay.config.UnitTestConfig",
    "test": "strr_pay.config.TestConfig",
    "production": "auto_approval.config.ProdConfig",
    "default": "auto_approval.config.ProdConfig",
}


def get_named_config(config_name: str = "production"):
    """Return the configuration object based on the name."""
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


class _Config:  # pylint: disable=too-few-public-methods
    """Base class configuration."""

    PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))
    SENTRY_DSN = os.getenv("SENTRY_DSN", "")

    # SVC
    KEYCLOAK_AUTH_TOKEN_URL = os.getenv("KEYCLOAK_AUTH_TOKEN_URL")
    STRR_SERVICE_ACCOUNT_CLIENT_ID = os.getenv("STRR_SERVICE_ACCOUNT_CLIENT_ID")
    STRR_SERVICE_ACCOUNT_SECRET = os.getenv("STRR_SERVICE_ACCOUNT_SECRET")

    # AUTH API
    AUTH_SVC_URL = os.getenv("AUTH_SVC_URL") or os.getenv(
        "AUTH_API_URL", ""
    ) + os.getenv("AUTH_API_VERSION", "")

    # AUTO APPROVAL JOB
    AUTO_APPROVAL_APPLICATION_PROCESSING_DELAY = int(
        os.getenv("AUTO_APPROVAL_APPLICATION_PROCESSING_DELAY") or "60"
    )

    # GEOCODER
    GEOCODER_SVC_URL = os.getenv("GEOCODER_API_URL", "")
    GEOCODER_SVC_AUTH_KEY = os.getenv("GEOCODER_API_AUTH_KEY", "")

    # DATABASE
    DB_USER = os.getenv("DATABASE_USERNAME", "")
    DB_PASSWORD = os.getenv("DATABASE_PASSWORD", "")
    DB_NAME = os.getenv("DATABASE_NAME", "")
    DB_HOST = os.getenv("DATABASE_HOST", "")
    DB_PORT = int(os.getenv("DATABASE_PORT", "5432"))  # POSTGRESQL

    SQLALCHEMY_DATABASE_URI = (
        f"postgresql+pg8000://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        if not os.getenv("DATABASE_UNIX_SOCKET")
        else f"postgresql+pg8000://{DB_USER}:{DB_PASSWORD}@/{
            DB_NAME}?unix_sock={os.getenv('DATABASE_UNIX_SOCKET')}/.s.PGSQL.5432"
    )

    TESTING = False
    DEBUG = False


class DevConfig(_Config):  # pylint: disable=too-few-public-methods
    """Development environment configuration."""

    TESTING = False
    DEBUG = True


class UnitTestConfig(_Config):  # pylint: disable=too-few-public-methods
    """Configuration for unit testing."""

    DEBUG = True
    TESTING = True


class TestConfig(_Config):  # pylint: disable=too-few-public-methods
    """Configuration for testing."""

    DEBUG = True
    TESTING = False

    DATABASE_TEST_USERNAME = os.getenv("DATABASE_TEST_USERNAME", "")
    DATABASE_TEST_PASSWORD = os.getenv("DATABASE_TEST_PASSWORD", "")
    DATABASE_TEST_NAME = os.getenv("DATABASE_TEST_NAME", "")
    DATABASE_TEST_HOST = os.getenv("DATABASE_TEST_HOST", "")
    DATABASE_TEST_PORT = int(os.getenv("DATABASE_TEST_PORT", "5432"))

    SQLALCHEMY_DATABASE_URI = f"postgresql://{DATABASE_TEST_USERNAME}:{DATABASE_TEST_PASSWORD}@{
            DATABASE_TEST_HOST}:{DATABASE_TEST_PORT}/{DATABASE_TEST_NAME}"


class ProdConfig(_Config):  # pylint: disable=too-few-public-methods
    """Production environment configuration."""

    SECRET_KEY = os.getenv("SECRET_KEY") or os.urandom(24)
    TESTING = False
    DEBUG = False
