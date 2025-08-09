# Copyright © 2024 Province of British Columbia
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
    "development": "strr_data_sync.config.DevConfig",
    "testing": "strr_data_sync.config.TestConfig",
    "production": "strr_data_sync.config.ProdConfig",
    "default": "strr_data_sync.config.ProdConfig",
}


def get_named_config(config_name: str = "production"):
    """Return the configuration object based on the name."""
    if config_name in ["production", "staging", "default"]:
        config = ProdConfig()
    elif config_name == "testing":
        config = TestConfig()
    elif config_name == "development":
        config = DevConfig()
    else:
        raise KeyError(f"Unknown configuration '{config_name}'")
    return config


class _Config:
    """Base class configuration."""
    PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))
    SENTRY_DSN = os.getenv("SENTRY_DSN", "")

    NOTIFY_API_URL = os.getenv("NOTIFY_API_URL", "") + os.getenv("NOTIFY_API_VERSION", "")
    NOTIFY_API_SVC_CLIENT_ID = os.getenv("NOTIFY_API_SVC_CLIENT_ID")
    NOTIFY_API_SVC_CLIENT_SECRET = os.getenv("NOTIFY_API_SVC_CLIENT_SECRET")
    EMAIL_TEMPLATE_PATH = os.getenv("EMAIL_TEMPLATE_PATH", "src/strr_data_sync/email_templates")

    # Data sync job settings
    BATCH_SIZE = int(os.getenv("BATCH_SIZE", "20000"))
    MAX_RESULTS = int(os.getenv("MAX_RESULTS", "60000"))
    CSV_OUTPUT_PATH = os.getenv("CSV_OUTPUT_PATH", "/tmp/strr_data_sync")
    
    # Username replacements for query results
    USERNAME_REPLACEMENTS = {
        "api-key-account-127082": "Airbnb Ireland UC",
        "api-key-account-103320": "WHISTLER.COM SYSTEMS INC.",
        "api-key-account-103121": "VACASA CANADA ULC",
        "api-key-account-91531": "1112940 B.C. LTD.",
        "api-key-account-62582": "Ministry of Housing",
        "api-key-account-111750": "Expedia",
        "api-key-account-121947": "Booking.com"
    }

    DB_USER = os.getenv("DATABASE_USERNAME", "")
    DB_PASSWORD = os.getenv("DATABASE_PASSWORD", "")
    DB_NAME = os.getenv("DATABASE_NAME", "")
    DB_HOST = os.getenv("DATABASE_HOST", "")
    DB_PORT = int(os.getenv("DATABASE_PORT", "5432"))

    if DB_UNIX_SOCKET := os.getenv("DATABASE_UNIX_SOCKET", None):
        SQLALCHEMY_DATABASE_URI = (
            f"postgresql+pg8000://{DB_USER}:{DB_PASSWORD}@/{DB_NAME}?unix_sock={DB_UNIX_SOCKET}/.s.PGSQL.5432"
        )
    else:
        SQLALCHEMY_DATABASE_URI = f"postgresql+pg8000://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

    TESTING = False
    DEBUG = False


class DevConfig(_Config):
    """Development environment configuration."""
    TESTING = False
    DEBUG = True


class TestConfig(_Config):
    """In support of testing only used by the py.test suite."""
    DEBUG = True
    TESTING = True

    DATABASE_TEST_USERNAME = os.getenv("DATABASE_TEST_USERNAME", "")
    DATABASE_TEST_PASSWORD = os.getenv("DATABASE_TEST_PASSWORD", "")
    DATABASE_TEST_NAME = os.getenv("DATABASE_TEST_NAME", "")
    DATABASE_TEST_HOST = os.getenv("DATABASE_TEST_HOST", "")
    DATABASE_TEST_PORT = int(os.getenv("DATABASE_TEST_PORT", "5432"))

    SQLALCHEMY_DATABASE_URI = (
        f"postgresql://{DATABASE_TEST_USERNAME}:{DATABASE_TEST_PASSWORD}@"
        f"{DATABASE_TEST_HOST}:{DATABASE_TEST_PORT}/{DATABASE_TEST_NAME}"
    )


class ProdConfig(_Config):
    """Production environment configuration."""
    TESTING = False
    DEBUG = False 