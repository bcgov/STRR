# Copyright © 2025 Province of British Columbia
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

from cloud_sql_connector import database_uri_from_env
from cloud_sql_connector import sqlalchemy_settings_from_env
from dotenv import find_dotenv
from dotenv import load_dotenv

# this will load all the envars from a .env file located in the project root (api)
load_dotenv(find_dotenv())

CONFIGURATION = {
    "development": "strr_email.config.DevConfig",
    "unittest": "strr_email.config.UnitTestConfig",  # Renamed unit test config
    "test": "strr_email.config.TestConfig",  # GCP test config
    "production": "strr_email.config.ProdConfig",
    "default": "strr_email.config.ProdConfig",
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


class Config:  # pylint: disable=too-few-public-methods
    """Base class configuration that should set reasonable defaults.

    Used as the base for all the other configurations.
    """

    PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))

    NOTIFY_SVC_URL = (
        os.getenv("NOTIFY_API_URL", "") + os.getenv("NOTIFY_API_VERSION", "") + "/notify"
    )
    try:
        NOTIFY_API_TIMEOUT = int(os.getenv("NOTIFY_API_TIMEOUT", "20"))
    except (TypeError, ValueError):
        NOTIFY_API_TIMEOUT = 20

    EMAIL_TEMPLATE_PATH = os.getenv("EMAIL_TEMPLATE_PATH", "email-templates")
    EMAIL_HOUSING_OPS_EMAIL = os.getenv("EMAIL_HOUSING_OPS_EMAIL", "")
    EMAIL_HOUSING_RECIPIENT_EMAIL = os.getenv(
        "EMAIL_HOUSING_RECIPIENT_EMAIL", "registry.str@gov.bc.ca"
    )
    EMAIL_STRR_REQUEST_BY = os.getenv("EMAIL_STRR_REQUEST_BY", "STRR")
    EMAIL_SUBJECT_PREFIX = os.getenv("EMAIL_SUBJECT_PREFIX", "")

    KEYCLOAK_AUTH_TOKEN_URL = os.getenv("KEYCLOAK_AUTH_TOKEN_URL")
    STRR_SERVICE_ACCOUNT_CLIENT_ID = os.getenv("STRR_SERVICE_ACCOUNT_CLIENT_ID")
    STRR_SERVICE_ACCOUNT_SECRET = os.getenv("STRR_SERVICE_ACCOUNT_SECRET")

    SENTRY_DSN = os.getenv("SENTRY_DSN", None)

    ENVIRONMENT = os.getenv("ENVIRONMENT", "prod")

    AUDIENCE = os.getenv("AUDIENCE", "https://pubsub.googleapis.com/google.pubsub.v1.Subscriber")
    PUBLISHER_AUDIENCE = os.getenv(
        "PUBLISHER_AUDIENCE", "https://pubsub.googleapis.com/google.pubsub.v1.Publisher"
    )
    # SUB_AUDIENCE = os.getenv("SUB_AUDIENCE", "")
    # SUB_SERVICE_ACCOUNT = os.getenv("SUB_SERVICE_ACCOUNT", "")

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    SQLALCHEMY_DATABASE_URI, SQLALCHEMY_ENGINE_OPTIONS = sqlalchemy_settings_from_env()

    TAC_URL_HOST = os.getenv(
        "TAC_URL_HOST",
        "https://www2.gov.bc.ca/gov/content/housing-tenancy/short-term-rentals/registry/registry-toc-hosts",
    )
    TAC_URL_PLATFORM = os.getenv(
        "TAC_URL_PLATFORM",
        "https://www2.gov.bc.ca/gov/content/housing-tenancy/short-term-rentals/registry/registry-toc-platforms",
    )


class DevConfig(Config):  # pylint: disable=too-few-public-methods
    """Creates the Development Config object."""

    TESTING = False
    DEBUG = True


class UnitTestConfig(Config):  # pylint: disable=too-few-public-methods
    """In support of unit testing only.

    Used by the py.test suite
    """

    SQLALCHEMY_DATABASE_URI = database_uri_from_env(
        username_env="DATABASE_TEST_USERNAME",
        password_env="DATABASE_TEST_PASSWORD",
        name_env="DATABASE_TEST_NAME",
        host_env="DATABASE_TEST_HOST",
        port_env="DATABASE_TEST_PORT",
    )
    SQLALCHEMY_ENGINE_OPTIONS = {}

    DEBUG = True
    TESTING = True


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
