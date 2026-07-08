# Copyright © 2025 Province of British Columbia
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

from dotenv import find_dotenv
from dotenv import load_dotenv

load_dotenv(find_dotenv())

CONFIGURATION = {
    "development": "renewal_reminders.config.DevConfig",
    "unittest": "renewal_reminders.config.UnitTestConfig",
    "test": "renewal_reminders.config.TestConfig",
    "production": "renewal_reminders.config.ProdConfig",
    "default": "renewal_reminders.config.ProdConfig",
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
    missing = [env_name for env_name in CLOUDSQL_REQUIRED_ENVS if not os.getenv(env_name)]
    if missing:
        raise RuntimeError(f"Missing Cloud SQL IAM environment variables: {', '.join(missing)}")


def _cloudsql_ip_type():
    from google.cloud.sql.connector import IPTypes

    ip_type_name = os.getenv("CLOUDSQL_IP_TYPE", "PUBLIC").upper()
    try:
        return getattr(IPTypes, ip_type_name)
    except AttributeError as exc:
        raise RuntimeError("CLOUDSQL_IP_TYPE must be PUBLIC or PRIVATE") from exc


def _make_cloudsql_getconn():  # pragma: no cover - exercised through unit mocks
    from google.cloud.sql.connector import Connector

    connector = None

    def getconn():
        nonlocal connector

        if connector is None:
            connector = Connector()

        return connector.connect(
            os.environ["CLOUDSQL_INSTANCE_CONNECTION_NAME"],
            "pg8000",
            user=os.environ["DATABASE_USERNAME"],
            db=os.environ["DATABASE_NAME"],
            enable_iam_auth=True,
            ip_type=_cloudsql_ip_type(),
        )

    return getconn


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
        return "postgresql+pg8000://", {"creator": _make_cloudsql_getconn()}

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


class ProdConfig(_Config):  # pylint: disable=too-few-public-methods
    """Production environment configuration."""

    SECRET_KEY = os.getenv("SECRET_KEY", None)

    if not SECRET_KEY:
        SECRET_KEY = os.urandom(24)
        print("WARNING: SECRET_KEY being set as a one-shot", file=sys.stderr)

    SECRET_KEY = os.getenv("SECRET_KEY") or os.urandom(24)
    TESTING = False
    DEBUG = False
