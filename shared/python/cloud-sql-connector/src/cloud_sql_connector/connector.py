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
"""Shared Cloud SQL connection utilities for STRR jobs and queue services."""

import os
import threading
import time
from dataclasses import dataclass
from typing import Mapping
from urllib.parse import quote

from google.cloud.sql.connector import Connector
from sqlalchemy import event

_connector = None
_lock = threading.Lock()
_CLOUDSQL_REQUIRED_ENV_VARS = (
    "CLOUDSQL_INSTANCE_CONNECTION_NAME",
    "DATABASE_NAME",
)


@dataclass
class DBConfig:
    """Database configuration settings."""

    instance_name: str
    database: str
    user: str
    ip_type: str
    schema: str
    enable_iam_auth: bool = True
    driver: str = "pg8000"

    # Connection pool parameters
    pool_size: int = 5
    max_overflow: int = 2
    pool_timeout: int = 10
    pool_recycle: int = 300
    pool_use_lifo: bool = True
    pool_pre_ping: bool = True
    connect_args: dict | None = None

    def __post_init__(self):
        """Initialize default connect_args if not provided."""
        if self.connect_args is None:
            self.connect_args = {}

    def get_engine_options(self) -> dict:
        """Get SQLAlchemy engine options for this configuration.

        Returns:
            dict: Dictionary of engine options suitable for SQLAlchemy create_engine()
        """
        return {
            "creator": lambda: getconn(self),
            "pool_size": self.pool_size,
            "max_overflow": self.max_overflow,
            "pool_timeout": self.pool_timeout,
            "pool_recycle": self.pool_recycle,
            "pool_pre_ping": self.pool_pre_ping,
            "pool_use_lifo": self.pool_use_lifo,
            "connect_args": self.connect_args,
        }


def database_uri_from_env(
    env: Mapping[str, str] | None = None,
    *,
    username_env: str = "DATABASE_USERNAME",
    password_env: str = "DATABASE_PASSWORD",
    name_env: str = "DATABASE_NAME",
    host_env: str = "DATABASE_HOST",
    port_env: str = "DATABASE_PORT",
) -> str:
    """Build a local pg8000 SQLAlchemy URI from environment variables."""
    values = env if env is not None else os.environ
    db_user = quote(values.get(username_env, ""), safe="")
    db_password = quote(values.get(password_env, ""), safe="")
    db_name = values.get(name_env, "")
    db_host = values.get(host_env, "")
    db_port = values.get(port_env, "5432")

    if db_unix_socket := values.get("DATABASE_UNIX_SOCKET"):
        return (
            f"postgresql+pg8000://{db_user}:{db_password}@/{db_name}"
            f"?unix_sock={db_unix_socket}/.s.PGSQL.5432"
        )

    return f"postgresql+pg8000://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"


def sqlalchemy_settings_from_env(
    env: Mapping[str, str] | None = None,
    *,
    schema: str = "",
    iam_username_env: str = "DATABASE_USERNAME",
) -> tuple[str, dict]:
    """Build SQLAlchemy URI and engine options for local or Cloud SQL IAM use."""
    values = env if env is not None else os.environ
    use_cloudsql_iam = bool(
        values.get("CLOUDSQL_INSTANCE_CONNECTION_NAME")
        or values.get("K_SERVICE")
        or values.get("CLOUD_RUN_JOB")
    )
    if not use_cloudsql_iam:
        return database_uri_from_env(values), {}

    required = (*_CLOUDSQL_REQUIRED_ENV_VARS, iam_username_env)
    missing = [name for name in required if not values.get(name)]
    if missing:
        raise RuntimeError(
            f"Missing Cloud SQL IAM environment variables: {', '.join(missing)}"
        )

    ip_type = values.get("CLOUDSQL_IP_TYPE", "PUBLIC").upper()
    if ip_type not in ("PUBLIC", "PRIVATE"):
        raise RuntimeError("CLOUDSQL_IP_TYPE must be PUBLIC or PRIVATE")

    config = DBConfig(
        instance_name=values["CLOUDSQL_INSTANCE_CONNECTION_NAME"],
        database=values["DATABASE_NAME"],
        user=values[iam_username_env],
        ip_type=ip_type,
        schema=schema,
    )
    return "postgresql+pg8000://", {"creator": lambda: getconn(config)}


def _get_connector() -> Connector:
    """Get the singleton connector instance with lazy initialization.

    Returns:
        Connector: The singleton connector instance
    """
    global _connector

    if _connector is None:
        with _lock:
            if _connector is None:
                _connector = Connector(refresh_strategy="lazy")

    return _connector


def close_connector() -> None:
    """Close and clear the singleton connector instance."""
    global _connector

    with _lock:
        if _connector is not None:
            _connector.close()
            _connector = None


def getconn(db_config: DBConfig) -> object:
    """Create a database connection.

    Args:
        db_config (DBConfig): The database configuration.

    Returns:
        object: A connection object to the database.
    """
    for attempt in range(3):
        try:
            connector = _get_connector()
            conn = connector.connect(
                instance_connection_string=db_config.instance_name,
                db=db_config.database,
                user=db_config.user,
                ip_type=db_config.ip_type,
                driver=db_config.driver,
                enable_iam_auth=db_config.enable_iam_auth,
            )

            if db_config.schema:
                cursor = conn.cursor()
                cursor.execute(f"SET search_path TO {db_config.schema},public")
                cursor.execute(f"SET LOCAL search_path TO {db_config.schema}, public;")
                cursor.close()

            return conn

        except PermissionError:
            if attempt < 2:
                time.sleep(1)
                continue
            raise


def setup_search_path_event_listener(engine, schema):
    """Set up an event listener to set the search path for a database connection.

    Args:
        engine: The SQLAlchemy engine object
        schema: The database schema name to use
    """

    @event.listens_for(engine, "checkout")
    def set_search_path_on_checkout(
        dbapi_connection, connection_record, connection_proxy
    ):
        cursor = dbapi_connection.cursor()
        cursor.execute(f"SET search_path TO {schema},public")
        cursor.close()


def setup_pg8000_close_event_listener(engine):
    """Set up an event listener to wrap dbapi connection close() to suppress pg8000 errors during Cloud Run scale-down.

    Closing a connection whose underlying socket is already dead (e.g. the Cloud SQL Auth
    Proxy sidecar was torn down first during Cloud Run scale-down, or the connection was
    otherwise dropped) can raise different exception types depending on exactly how and when
    the socket died - pg8000 has been observed to raise ``InterfaceError``, ``OSError``, and
    ``ValueError`` ("write to closed file") for what is functionally the same situation. Since
    the connection is being discarded either way, any exception raised while closing it is safe
    to log and swallow here.

    Args:
        engine: The SQLAlchemy engine object
    """
    if getattr(engine, "driver", None) != "pg8000":
        return

    import logging

    @event.listens_for(engine, "connect")
    def on_connect(dbapi_conn, _connection_record):
        original_close = dbapi_conn.close

        def safe_close():
            try:
                original_close()
            except Exception as e:
                logging.getLogger(__name__).debug(
                    "Suppressed %s while closing pg8000 connection during teardown: %s",
                    type(e).__name__,
                    e,
                )

        dbapi_conn.close = safe_close
