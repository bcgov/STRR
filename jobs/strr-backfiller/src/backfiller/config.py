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

from cloud_sql_connector import DBConfig, getconn
from dotenv import find_dotenv, load_dotenv

load_dotenv(find_dotenv())

CONFIGURATION = {
    "development": "backfiller.config.DevConfig",
    "unittest": "backfiller.config.UnitTestConfig",
    "test": "backfiller.config.TestConfig",
    "production": "backfiller.config.ProdConfig",
    "default": "backfiller.config.ProdConfig",
}


CLOUDSQL_REQUIRED_ENVS = (
    "CLOUDSQL_INSTANCE_CONNECTION_NAME",
    "DATABASE_NAME",
    "DATABASE_USERNAME",
)


def _is_deployed_gcp() -> bool:
    return bool(os.getenv("K_SERVICE") or os.getenv("CLOUD_RUN_JOB"))


def _use_cloudsql_iam() -> bool:
    return bool(os.getenv("CLOUDSQL_INSTANCE_CONNECTION_NAME")) or _is_deployed_gcp()


def _require_cloudsql_env():
    missing = [
        env_name for env_name in CLOUDSQL_REQUIRED_ENVS if not os.getenv(env_name)
    ]
    if missing:
        raise RuntimeError(
            f"Missing Cloud SQL IAM environment variables: {', '.join(missing)}"
        )


def _cloudsql_ip_type() -> str:
    ip_type_name = os.getenv("CLOUDSQL_IP_TYPE", "PUBLIC").upper()
    if ip_type_name not in ("PUBLIC", "PRIVATE"):
        raise RuntimeError("CLOUDSQL_IP_TYPE must be PUBLIC or PRIVATE")
    return ip_type_name


def _cloudsql_engine_options() -> dict:
    config = DBConfig(
        instance_name=os.environ["CLOUDSQL_INSTANCE_CONNECTION_NAME"],
        database=os.environ["DATABASE_NAME"],
        user=os.environ["DATABASE_USERNAME"],
        ip_type=_cloudsql_ip_type(),
        schema="",
    )
    return {"creator": lambda: getconn(config)}


def _local_database_uri() -> str:
    db_user = os.getenv("DATABASE_USERNAME", "")
    db_password = os.getenv("DATABASE_PASSWORD", "")
    db_name = os.getenv("DATABASE_NAME", "")
    db_host = os.getenv("DATABASE_HOST", "")
    db_port = int(os.getenv("DATABASE_PORT", "5432"))

    if db_unix_socket := os.getenv("DATABASE_UNIX_SOCKET", None):
        return f"postgresql+pg8000://{db_user}:{db_password}@/{db_name}?unix_sock={db_unix_socket}/.s.PGSQL.5432"

    return f"postgresql+pg8000://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"


def _database_settings() -> tuple[str, dict]:
    if _use_cloudsql_iam():
        _require_cloudsql_env()
        return "postgresql+pg8000://", _cloudsql_engine_options()

    return _local_database_uri(), {}


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
    JWT_OIDC_JWKS_CACHE_TIMEOUT = int(os.getenv("JWT_OIDC_JWKS_CACHE_TIMEOUT", "6000"))
    JWT_OIDC_USERNAME = os.getenv("JWT_OIDC_USERNAME", "username")
    JWT_OIDC_FIRSTNAME = os.getenv("JWT_OIDC_FIRSTNAME", "firstname")
    JWT_OIDC_LASTNAME = os.getenv("JWT_OIDC_LASTNAME", "lastname")

    # LTSA
    LTSA_SVC_URL = os.getenv("LTSA_API_URL", "") + os.getenv("LTSA_API_VERSION", "")
    LTSA_SVC_AUTH_KEY = os.getenv("LTSA_API_KEY_STRR", "")

    # AUTO APPROVAL JOB
    AUTO_APPROVAL_APPLICATION_PROCESSING_DELAY = int(
        os.getenv("AUTO_APPROVAL_APPLICATION_PROCESSING_DELAY") or "60"
    )

    # BACKFILLER
    BACKFILL_REGISTRATION_SEARCH = (
        os.getenv("BACKFILL_REGISTRATION_SEARCH", "False").lower() == "true"
    )
    BACKFILL_REGISTRATION_SEARCH_BATCH_SIZE = int(
        os.getenv("BACKFILL_REGISTRATION_SEARCH_BATCH_SIZE") or "100"
    )

    # GEOCODER
    GEOCODER_SVC_URL = os.getenv("GEOCODER_API_URL", "")
    GEOCODER_SVC_AUTH_KEY = os.getenv("GEOCODER_API_AUTH_KEY", "")

    SQLALCHEMY_DATABASE_URI, SQLALCHEMY_ENGINE_OPTIONS = _database_settings()

    # projects/<project_id-env>/topics/<topic_name>
    GCP_EMAIL_TOPIC = os.getenv("GCP_EMAIL_TOPIC")

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

    SQLALCHEMY_DATABASE_URI = (
        f"postgresql://{DATABASE_TEST_USERNAME}:{DATABASE_TEST_PASSWORD}"
        f"@{DATABASE_TEST_HOST}:{DATABASE_TEST_PORT}/{DATABASE_TEST_NAME}"
    )
    SQLALCHEMY_ENGINE_OPTIONS = {}

    COLIN_URL = os.getenv("COLIN_URL_TEST", "")
    LEGAL_URL = os.getenv("LEGAL_URL_TEST", "")
    GCP_EMAIL_TOPIC = os.getenv("GCP_EMAIL_TOPIC_TEST", None)


class ProdConfig(_Config):  # pylint: disable=too-few-public-methods
    """Production environment configuration."""

    SECRET_KEY = os.getenv("SECRET_KEY", None)

    if not SECRET_KEY:
        SECRET_KEY = os.urandom(24)
        print("WARNING: SECRET_KEY being set as a one-shot", file=sys.stderr)

    SECRET_KEY = os.getenv("SECRET_KEY") or os.urandom(24)
    TESTING = False
    DEBUG = False
