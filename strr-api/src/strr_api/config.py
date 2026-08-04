# Copyright © 2023 Province of British Columbia
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
"""
This module is used for setting up various configurations for the application.
Each configuration inherits from the base configuration and can override the properties as needed.

The `Config` class contains the base configuration with common settings for all environments.

The `Production`, `Sandbox`, `Development`, and `Testing` classes set specific settings for each environment.

Environment variables are used to store the necessary values for each setting.
"""

import os

from dotenv import find_dotenv, load_dotenv
from sqlalchemy.engine import URL

basedir = os.path.abspath(os.path.dirname(__file__))

load_dotenv(find_dotenv())

GCP_DEPLOYMENT_ENVS = {"development", "test", "uat", "sandbox", "production", "migration"}
PROXY_REQUIRED_ENVS = ("DATABASE_NAME",)


def _deployment_env() -> str:
    return os.getenv("DEPLOYMENT_ENV", os.getenv("POD_NAMESPACE", "local"))


def _is_deployed_gcp() -> bool:
    return bool(os.getenv("K_SERVICE")) or _deployment_env() in GCP_DEPLOYMENT_ENVS


def _use_proxy_iam() -> bool:
    return _is_deployed_gcp()


def _cloudsql_user_env() -> str:
    return "DATABASE_MIGRATION_USERNAME" if _deployment_env() == "migration" else "DATABASE_USERNAME"


def _require_proxy_env(user_env: str):
    required = (*PROXY_REQUIRED_ENVS, user_env)
    missing = [env_name for env_name in required if not os.getenv(env_name)]
    if missing:
        raise RuntimeError(f"Missing Cloud SQL IAM proxy environment variables: {', '.join(missing)}")


def _proxy_database_uri(user_env: str) -> str:
    db_user = os.environ[user_env]
    db_name = os.environ["DATABASE_NAME"]
    db_host = os.getenv("DATABASE_HOST", "127.0.0.1")
    db_port = int(os.getenv("DATABASE_PORT", "5432"))

    if db_unix_socket := os.getenv("DATABASE_UNIX_SOCKET", None):
        return str(
            URL.create(
                "postgresql+psycopg2",
                username=db_user,
                database=db_name,
                query={"host": db_unix_socket},
            )
        )

    return str(URL.create("postgresql+psycopg2", username=db_user, host=db_host, port=db_port, database=db_name))


def _local_database_uri() -> str:
    db_user = os.getenv("DATABASE_USERNAME", "")
    db_password = os.getenv("DATABASE_PASSWORD", "")
    db_name = os.getenv("DATABASE_NAME", "")
    db_host = os.getenv("DATABASE_HOST", "")
    db_port = int(os.getenv("DATABASE_PORT", "5432"))

    if db_unix_socket := os.getenv("DATABASE_UNIX_SOCKET", None):
        return f"postgresql+psycopg2://{db_user}:{db_password}@/{db_name}?host={db_unix_socket}"

    return f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"


def _database_settings() -> tuple[str, dict]:
    if _use_proxy_iam():
        user_env = _cloudsql_user_env()
        _require_proxy_env(user_env)
        return _proxy_database_uri(user_env), {}

    return _local_database_uri(), {}


class Config:  # pylint: disable=too-few-public-methods
    """Base class configuration that should set reasonable defaults.

    Used as the base for all the other configurations.
    """

    DEBUG = False
    TESTING = False
    CSRF_ENABLED = True
    SECRET_KEY = "this-really-needs-to-be-changed"
    PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))
    POD_NAMESPACE = _deployment_env()

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_DATABASE_URI, SQLALCHEMY_ENGINE_OPTIONS = _database_settings()

    LD_SDK_KEY = os.getenv("LD_SDK_KEY", None)

    SENTRY_DSN = os.getenv("SENTRY_DSN", None)

    # JWT_OIDC Settings
    JWT_OIDC_WELL_KNOWN_CONFIG = os.getenv("JWT_OIDC_WELL_KNOWN_CONFIG")
    JWT_OIDC_ALGORITHMS = os.getenv("JWT_OIDC_ALGORITHMS")
    JWT_OIDC_JWKS_URI = os.getenv("JWT_OIDC_JWKS_URI")
    JWT_OIDC_ISSUER = os.getenv("JWT_OIDC_ISSUER")
    JWT_OIDC_AUDIENCE = os.getenv("JWT_OIDC_AUDIENCE")
    JWT_OIDC_CLIENT_SECRET = os.getenv("JWT_OIDC_CLIENT_SECRET")
    JWT_OIDC_CACHING_ENABLED = os.getenv("JWT_OIDC_CACHING_ENABLED")
    JWT_OIDC_TOKEN_URL = os.getenv("JWT_OIDC_TOKEN_URL")
    try:
        JWT_OIDC_JWKS_CACHE_TIMEOUT = int(os.getenv("JWT_OIDC_JWKS_CACHE_TIMEOUT"))
        if not JWT_OIDC_JWKS_CACHE_TIMEOUT:
            JWT_OIDC_JWKS_CACHE_TIMEOUT = 300
    except (TypeError, ValueError):
        JWT_OIDC_JWKS_CACHE_TIMEOUT = 300

    JWT_OIDC_USERNAME = os.getenv("JWT_OIDC_USERNAME", "username")
    JWT_OIDC_FIRSTNAME = os.getenv("JWT_OIDC_FIRSTNAME", "firstname")
    JWT_OIDC_LASTNAME = os.getenv("JWT_OIDC_LASTNAME", "lastname")

    AUTH_SVC_URL = os.getenv("AUTH_API_URL", "") + os.getenv("AUTH_API_VERSION", "")
    PAYMENT_SVC_URL = os.getenv("PAY_API_URL", "") + os.getenv("PAY_API_VERSION", "")
    LEGAL_SVC_URL = os.getenv("LEGAL_API_URL", "") + os.getenv("LEGAL_API_VERSION_2", "")
    BOR_SVC_URL = os.getenv("BOR_API_URL", "") + os.getenv("BOR_API_VERSION", "")
    LTSA_SVC_URL = os.getenv("LTSA_API_URL", "") + os.getenv("LTSA_API_VERSION", "")
    LTSA_SVC_AUTH_KEY = os.getenv("LTSA_API_KEY_STRR", "")

    GEOCODER_SVC_URL = os.getenv("GEOCODER_API_URL", "")
    GEOCODER_SVC_AUTH_KEY = os.getenv("GEOCODER_API_AUTH_KEY", "")

    KEYCLOAK_AUTH_TOKEN_URL = os.getenv("KEYCLOAK_AUTH_TOKEN_URL")
    STRR_SERVICE_ACCOUNT_CLIENT_ID = os.getenv("STRR_SERVICE_ACCOUNT_CLIENT_ID")
    STRR_SERVICE_ACCOUNT_SECRET = os.getenv("STRR_SERVICE_ACCOUNT_SECRET")

    GCP_CS_PROJECT_ID = os.getenv("GCP_CS_PROJECT_ID")
    GCP_CS_SA_SCOPE = os.getenv("GCP_CS_SA_SCOPE")
    GCP_CS_BUCKET_ID = os.getenv("GCP_CS_BUCKET_ID")
    GCP_AUTH_KEY = os.getenv("GCP_AUTH_KEY")
    # projects/<project_id-env>/topics/<topic_name>
    GCP_EMAIL_TOPIC = os.getenv("GCP_EMAIL_TOPIC")

    # DATA PORTAL API
    STR_DATA_API_CLIENT_ID = os.getenv("STR_DATA_API_CLIENT_ID", "")
    STR_DATA_API_CLIENT_SECRET = os.getenv("STR_DATA_API_CLIENT_SECRET", "")
    STR_DATA_API_TOKEN_URL = os.getenv("STR_DATA_API_TOKEN_URL", "")
    STR_DATA_API_URL = os.getenv("STR_DATA_API_URL", "")

    BULK_VALIDATION_REQUESTS_BUCKET = os.getenv("BULK_VALIDATION_REQUESTS_BUCKET")
    NOC_EXPIRY_DAYS = os.getenv("NOC_EXPIRY_DAYS", "8")


class Production(Config):  # pylint: disable=too-few-public-methods
    """Production class configuration that should override vars for production."""

    DEBUG = False
    TESTING = False


class Sandbox(Config):  # pylint: disable=too-few-public-methods
    """Sandbox class configuration that should override vars for Sandbox."""

    DEVELOPMENT = True
    DEBUG = True


class Development(Config):  # pylint: disable=too-few-public-methods
    """Development class configuration that should override vars for Development."""

    DEVELOPMENT = True
    DEBUG = True


class Migration(Config):  # pylint: disable=too-few-public-methods
    """Config for db migration."""

    TESTING = False
    DEBUG = True
    SQLALCHEMY_DATABASE_URI, SQLALCHEMY_ENGINE_OPTIONS = _database_settings()


class Testing(Config):  # pylint: disable=too-few-public-methods
    """Testing class configuration that should override vars for Testing."""

    TESTING = True

    DATABASE_TEST_USERNAME = os.getenv("DATABASE_TEST_USERNAME", "postgres")
    DATABASE_TEST_PASSWORD = os.getenv("DATABASE_TEST_PASSWORD", "postgres")
    DATABASE_TEST_NAME = os.getenv("DATABASE_TEST_NAME", "test")
    DATABASE_TEST_HOST = os.getenv("DATABASE_TEST_HOST", "localhost")
    DATABASE_TEST_PORT = int(os.getenv("DATABASE_TEST_PORT", "5432"))  # POSTGRESQL

    SQLALCHEMY_DATABASE_URI = (
        f"postgresql://{DATABASE_TEST_USERNAME}:{DATABASE_TEST_PASSWORD}@"
        f"{DATABASE_TEST_HOST}:{DATABASE_TEST_PORT}/{DATABASE_TEST_NAME}"
    )
    SQLALCHEMY_ENGINE_OPTIONS = {}

    AUTH_SVC_URL = "https://test-auth-svc-url"
    PAYMENT_SVC_URL = "https://test-pay-url"
    LEGAL_SVC_URL = "https://test-legal-url"
    BOR_SVC_URL = "https://test-bor-url"

    KEYCLOAK_AUTH_TOKEN_URL = "https://test-token-url"
    STRR_SERVICE_ACCOUNT_CLIENT_ID = "service-account"
    STRR_SERVICE_ACCOUNT_SECRET = "fake"

    GCP_EMAIL_TOPIC = os.getenv("GCP_EMAIL_TOPIC_TEST", None)

    # JWT OIDC settings
    # JWT_OIDC_TEST_MODE will set jwt_manager to use
    JWT_OIDC_TEST_MODE = True
    JWT_OIDC_TEST_AUDIENCE = "example"
    JWT_OIDC_TEST_ISSUER = "https://example.localdomain/auth/realms/example"
    JWT_OIDC_TEST_KEYS = {
        "keys": [
            {
                "kid": "flask-jwt-oidc-test-client",
                "kty": "RSA",
                "alg": "RS256",
                "use": "sig",
                "n": "AN-fWcpCyE5KPzHDjigLaSUVZI0uYrcGcc40InVtl-rQRDmAh-C2W8H4_Hxhr5VLc6crsJ2LiJTV_E72S03pzpOOaaYV6-TzAjCou2GYJIXev7f6Hh512PuG5wyxda_TlBSsI-gvphRTPsKCnPutrbiukCYrnPuWxX5_cES9eStR",  # noqa: E501
                "e": "AQAB",
            }
        ]
    }

    JWT_OIDC_TEST_PRIVATE_KEY_JWKS = {
        "keys": [
            {
                "kid": "flask-jwt-oidc-test-client",
                "kty": "RSA",
                "alg": "RS256",
                "use": "sig",
                "n": "AN-fWcpCyE5KPzHDjigLaSUVZI0uYrcGcc40InVtl-rQRDmAh-C2W8H4_Hxhr5VLc6crsJ2LiJTV_E72S03pzpOOaaYV6-TzAjCou2GYJIXev7f6Hh512PuG5wyxda_TlBSsI-gvphRTPsKCnPutrbiukCYrnPuWxX5_cES9eStR",  # noqa: E501
                "e": "AQAB",
                "d": "C0G3QGI6OQ6tvbCNYGCqq043YI_8MiBl7C5dqbGZmx1ewdJBhMNJPStuckhskURaDwk4-8VBW9SlvcfSJJrnZhgFMjOYSSsBtPGBIMIdM5eSKbenCCjO8Tg0BUh_xa3CHST1W4RQ5rFXadZ9AeNtaGcWj2acmXNO3DVETXAX3x0",  # noqa: E501
                "p": "APXcusFMQNHjh6KVD_hOUIw87lvK13WkDEeeuqAydai9Ig9JKEAAfV94W6Aftka7tGgE7ulg1vo3eJoLWJ1zvKM",
                "q": "AOjX3OnPJnk0ZFUQBwhduCweRi37I6DAdLTnhDvcPTrrNWuKPg9uGwHjzFCJgKd8KBaDQ0X1rZTZLTqi3peT43s",
                "dp": "AN9kBoA5o6_Rl9zeqdsIdWFmv4DB5lEqlEnC7HlAP-3oo3jWFO9KQqArQL1V8w2D4aCd0uJULiC9pCP7aTHvBhc",
                "dq": "ANtbSY6njfpPploQsF9sU26U0s7MsuLljM1E8uml8bVJE1mNsiu9MgpUvg39jEu9BtM2tDD7Y51AAIEmIQex1nM",
                "qi": "XLE5O360x-MhsdFXx8Vwz4304-MJg-oGSJXCK_ZWYOB_FGXFRTfebxCsSYi0YwJo-oNu96bvZCuMplzRI1liZw",
            }
        ]
    }

    JWT_OIDC_TEST_PRIVATE_KEY_PEM = """
-----BEGIN RSA PRIVATE KEY-----
MIICXQIBAAKBgQDfn1nKQshOSj8xw44oC2klFWSNLmK3BnHONCJ1bZfq0EQ5gIfg
tlvB+Px8Ya+VS3OnK7Cdi4iU1fxO9ktN6c6TjmmmFevk8wIwqLthmCSF3r+3+h4e
ddj7hucMsXWv05QUrCPoL6YUUz7Cgpz7ra24rpAmK5z7lsV+f3BEvXkrUQIDAQAB
AoGAC0G3QGI6OQ6tvbCNYGCqq043YI/8MiBl7C5dqbGZmx1ewdJBhMNJPStuckhs
kURaDwk4+8VBW9SlvcfSJJrnZhgFMjOYSSsBtPGBIMIdM5eSKbenCCjO8Tg0BUh/
xa3CHST1W4RQ5rFXadZ9AeNtaGcWj2acmXNO3DVETXAX3x0CQQD13LrBTEDR44ei
lQ/4TlCMPO5bytd1pAxHnrqgMnWovSIPSShAAH1feFugH7ZGu7RoBO7pYNb6N3ia
C1idc7yjAkEA6Nfc6c8meTRkVRAHCF24LB5GLfsjoMB0tOeEO9w9Ous1a4o+D24b
AePMUImAp3woFoNDRfWtlNktOqLel5PjewJBAN9kBoA5o6/Rl9zeqdsIdWFmv4DB
5lEqlEnC7HlAP+3oo3jWFO9KQqArQL1V8w2D4aCd0uJULiC9pCP7aTHvBhcCQQDb
W0mOp436T6ZaELBfbFNulNLOzLLi5YzNRPLppfG1SRNZjbIrvTIKVL4N/YxLvQbT
NrQw+2OdQACBJiEHsdZzAkBcsTk7frTH4yGx0VfHxXDPjfTj4wmD6gZIlcIr9lZg
4H8UZcVFN95vEKxJiLRjAmj6g273pu9kK4ymXNEjWWJn
-----END RSA PRIVATE KEY-----
"""
