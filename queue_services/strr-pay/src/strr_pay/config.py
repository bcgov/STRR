# Copyright © 2024 Province of British Columbia
#
# Licensed under the BSD 3 Clause License, (the "License");
# you may not use this file except in compliance with the License.
# The template for the license can be found here
#    https://opensource.org/license/bsd-3-clause/
#
# Redistribution and use in source and binary forms,
# with or without modification, are permitted provided that the
# following conditions are met:
#
# 1. Redistributions of source code must retain the above copyright notice,
#    this list of conditions and the following disclaimer.
#
# 2. Redistributions in binary form must reproduce the above copyright notice,
#    this list of conditions and the following disclaimer in the documentation
#    and/or other materials provided with the distribution.
#
# 3. Neither the name of the copyright holder nor the names of its contributors
#    may be used to endorse or promote products derived from this software
#    without specific prior written permission.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS”
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
# THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
# ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
# LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
# CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
# SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
# INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
# CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
# ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
# POSSIBILITY OF SUCH DAMAGE.
"""All of the configuration for the service is captured here.

All items are loaded, or have Constants defined here that
are loaded into the Flask configuration.
All modules and lookups get their configuration from the
Flask config, rather than reading environment variables directly
or by accessing this configuration directly.
"""
import os

from dotenv import find_dotenv
from dotenv import load_dotenv

# this will load all the envars from a .env file located in the project root (api)
load_dotenv(find_dotenv())

CONFIGURATION = {
    "development": "strr_pay.config.DevConfig",
    "unittest": "strr_pay.config.UnitTestConfig",  # Renamed unit test config
    "test": "strr_pay.config.TestConfig",  # GCP test config
    "production": "strr_pay.config.ProdConfig",
    "default": "strr_pay.config.ProdConfig",
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
    db_port = os.getenv("DATABASE_PORT", "5432")

    if db_unix_socket := os.getenv("DATABASE_UNIX_SOCKET", None):
        return f"postgresql+pg8000://{db_user}:{db_password}@/{db_name}?unix_sock={db_unix_socket}/.s.PGSQL.5432"

    return f"postgresql+pg8000://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"


def _database_settings() -> tuple[str, dict]:
    if _use_cloudsql_iam():
        _require_cloudsql_env()
        return "postgresql+pg8000://", {"creator": _make_cloudsql_getconn()}

    return _local_database_uri(), {}


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


class Config:  # pylint: disable=too-few-public-methods
    """Base class configuration that should set reasonable defaults.

    Used as the base for all the other configurations.
    """

    PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))

    PAYMENT_SVC_URL = os.getenv("PAY_API_URL", "") + os.getenv("PAY_API_VERSION", "")

    SENTRY_DSN = os.getenv("SENTRY_DSN", None)

    ENVIRONMENT = os.getenv("ENVIRONMENT", "prod")

    AUDIENCE = os.getenv("AUDIENCE", "https://pubsub.googleapis.com/google.pubsub.v1.Subscriber")
    PUBLISHER_AUDIENCE = os.getenv(
        "PUBLISHER_AUDIENCE", "https://pubsub.googleapis.com/google.pubsub.v1.Publisher"
    )
    # SUB_AUDIENCE = os.getenv("SUB_AUDIENCE", "")
    # SUB_SERVICE_ACCOUNT = os.getenv("SUB_SERVICE_ACCOUNT", "")

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    SQLALCHEMY_DATABASE_URI, SQLALCHEMY_ENGINE_OPTIONS = _database_settings()


class DevConfig(Config):  # pylint: disable=too-few-public-methods
    """Creates the Development Config object."""

    TESTING = False
    DEBUG = True


class UnitTestConfig(Config):  # pylint: disable=too-few-public-methods
    """In support of unit testing only.

    Used by the py.test suite
    """

    DEBUG = True
    TESTING = True
    SQLALCHEMY_ENGINE_OPTIONS = {}


class TestConfig(Config):  # pylint: disable=too-few-public-methods
    """In support of testing only.

    Used by the py.test suite
    """

    DEBUG = True
    TESTING = False  # False for GCP test environments


class ProdConfig(Config):  # pylint: disable=too-few-public-methods
    """Production environment configuration."""

    TESTING = False
    DEBUG = False
